// ============================================================
//  app/api/polls/route.ts
//
//  Community and group polls — users can create questions with
//  multiple choice options and others vote on them.
//
//  GET  /api/polls               — list community-wide open polls
//  GET  /api/polls?groupId=X     — list open polls for a specific group
//  POST /api/polls               — create a new poll (logged-in users only)
//
//  "Open" means the poll either has no end date, or the end date
//  is still in the future.  Closed polls are excluded automatically.
//
//  Each poll in the response includes:
//    - question, endsAt, author info
//    - options with vote counts
//    - whether the logged-in user voted on each option (for highlighting)
//    - total vote count for the whole poll
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client for all DB queries
import { prisma } from '@/lib/prisma';

// ── Helper: builds the Prisma select object for poll queries ─────────────────
// This helper is used in both GET and POST responses so we define it once here
// to keep the two handlers in sync — they return the exact same shape.
//
// userId — the logged-in user's ID, or null for guests.
//           When provided, each option includes a `votes` sub-array showing
//           whether THIS user voted for it — used to highlight their pick.
function pollSelect(userId: number | null) {
  return {
    // Poll's unique ID
    id: true,
    // The question text shown at the top of the poll card
    question: true,
    // When the poll closes (null = never closes automatically)
    endsAt: true,
    // When the poll was created
    createdAt: true,
    // The author's username and avatar for the "posted by" line
    author: { select: { username: true, profile: { select: { avatar: true } } } },
    // Which group this poll belongs to (null = community-wide)
    groupId: true,
    // Each answer option with its vote count and optionally the caller's vote
    options: {
      select: {
        // Option's unique ID — sent back to the vote endpoint
        id: true,
        // The answer text
        text: true,
        // How many total votes this option has received
        _count: { select: { votes: true } },
        // If a userId is provided, include whether THIS user voted for this option.
        // This is a conditional: if userId is falsy (guest), `false` tells Prisma to skip.
        // If truthy, it filters the votes sub-relation to just this user's vote.
        votes: userId ? { where: { userId }, select: { id: true } } : false,
      },
    },
    // Total votes cast across all options for this poll
    _count: { select: { votes: true } },
  } as const;
  // "as const" tells TypeScript to treat this as a literal type, which Prisma needs
  // to correctly infer the return type of findMany/create.
}

// ── GET /api/polls ─────────────────────────────────────────────────────────────
// Returns a list of open polls, optionally filtered to a specific group.
export async function GET(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the logged-in user's ID.
  // If there's no cookie (guest visitor), userId is null — that's fine,
  // guests can still see polls, they just won't have any "voted" flags.
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Parse the URL to read optional query parameters
  const { searchParams } = new URL(req.url);

  // Optional filter: if ?groupId=X is present, only return polls for that group.
  // If absent, null tells Prisma to return community-wide polls (those with no groupId).
  const groupId = searchParams.get('groupId') ? Number(searchParams.get('groupId')) : null;

  // Fetch up to 20 open polls from the database
  const polls = await prisma.poll.findMany({
    where: {
      // Community polls have groupId = null; group polls are filtered by the given groupId.
      // groupId ?? null means: use the provided groupId value, or null if none was given.
      groupId: groupId ?? null,
      // Only show open polls:
      // OR means return polls where EITHER condition is true:
      //   a) endsAt is null (poll never closes), OR
      //   b) endsAt is still in the future (poll hasn't closed yet)
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    // Newest polls first so the most recent appear at the top of the page
    orderBy: { createdAt: 'desc' },
    // Cap the list at 20 to avoid very large responses
    take: 20,
    // Use the shared select helper, passing the userId so votes are highlighted
    select: pollSelect(userId),
  });

  // Return the array of polls as JSON
  return NextResponse.json(polls);
}

// ── POST /api/polls ────────────────────────────────────────────────────────────
// Creates a new poll with its answer options.
// Expected JSON body:
//   {
//     question:  string,            — the poll question (required)
//     options:   string[],          — 2 to 10 answer options (required)
//     endsAt?:   ISO string | null, — optional close date
//     groupId?:  number | null      — group to scope the poll to (null = community-wide)
//   }
export async function POST(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Get the logged-in user's ID — only logged-in users may create polls
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Guests cannot create polls
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON request body
  const body = await req.json();

  // Destructure the expected fields from the body
  const { question, options, endsAt, groupId } = body;

  // The question is required and must not be blank
  if (!question?.trim()) return NextResponse.json({ error: 'Question is required.' }, { status: 400 });

  // options must be an array of 2–10 items before cleaning.
  // We check the raw array first to give a clear error about the count.
  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    return NextResponse.json({ error: 'Provide between 2 and 10 options.' }, { status: 400 });
  }

  // Strip leading/trailing whitespace from each option and remove any empty strings.
  // .filter(Boolean) removes empty strings left after trimming (e.g. "  " → "" → removed).
  const cleanOptions: string[] = options.map((o: string) => o.trim()).filter(Boolean);

  // Re-check the count after cleaning in case empty strings reduced the valid count below 2
  if (cleanOptions.length < 2) return NextResponse.json({ error: 'At least 2 non-empty options required.' }, { status: 400 });

  // Create the poll AND all its options in a single database operation.
  // Prisma's nested `create` inside `options: { create: [...] }` handles this
  // transactionally — either everything succeeds or nothing is saved.
  const poll = await prisma.poll.create({
    data: {
      // The trimmed poll question
      question: question.trim(),
      // Convert the ISO date string to a JS Date object, or null if no end date was given.
      // null means the poll stays open indefinitely until manually closed.
      endsAt: endsAt ? new Date(endsAt) : null,
      // Record who created this poll
      authorId: userId,
      // null = community-wide poll; a number = scoped to that group
      groupId: groupId ?? null,
      // Create all answer options in the same DB write.
      // cleanOptions.map(text => ({ text })) builds an array of { text: "..." } objects.
      options: { create: cleanOptions.map(text => ({ text })) },
    },
    // Use the shared select helper so the response matches the GET format exactly
    select: pollSelect(userId),
  });

  // Return 201 Created with the full poll object (same shape as the GET list)
  return NextResponse.json(poll, { status: 201 });
}
