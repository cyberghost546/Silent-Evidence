// ============================================================
//  app/api/dares/route.ts
//
//  Handles the "Story Dare" feature where one user challenges
//  another user to read a specific horror story.
//
//  GET  /api/dares?receiverId=X
//    → Returns every dare that was sent TO user X, newest first.
//      Each dare includes the linked story's title/slug so the
//      receiver can click straight through to the story, and the
//      sender's username so the receiver knows who dared them.
//
//  POST /api/dares
//    → Creates a new dare. The sender provides the target user's
//      username (rather than their numeric ID, which the sender
//      wouldn't know). The server resolves it to an ID internally.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the shared Prisma database client
import { prisma } from '@/lib/prisma';

// ── GET /api/dares?receiverId=X ───────────────────────────────────────────────
// Returns all dares received by a specific user.
// The receiverId is passed as a URL query parameter, e.g. ?receiverId=42
export async function GET(req: Request) {
  // Parse the URL so we can read the query string
  const { searchParams } = new URL(req.url);

  // Read the receiverId query parameter and convert it from string to number.
  // If the param is missing, Number(null) returns 0, which is falsy — caught below.
  const receiverId = Number(searchParams.get('receiverId'));

  // Validate: a receiverId of 0 means it was missing or not a valid number
  if (!receiverId) {
    // Return 400 Bad Request if the required parameter wasn't provided
    return NextResponse.json({ error: 'receiverId query param is required.' }, { status: 400 });
  }

  // Fetch every dare from the database where the receiver matches the given ID.
  // findMany returns an array of matching rows.
  const dares = await prisma.storyDare.findMany({
    where: {
      // Only dares addressed to this specific user
      receiverId,
    },
    // Sort so the most recently created dares appear at the top of the list
    orderBy: { createdAt: 'desc' },
    // Include the related story and sender so the UI can display them without
    // making separate API calls for each dare
    include: {
      // Pull just the fields we need from the related story row
      story: { select: { id: true, title: true, slug: true } },
      // Pull the sender's username so we can show "Dared by: username"
      sender: { select: { id: true, username: true } },
    },
  });

  // Return the array of dare objects as JSON
  return NextResponse.json(dares);
}

// ── POST /api/dares ───────────────────────────────────────────────────────────
// Creates a new dare record.
// Expected JSON body:
//   {
//     storyId: number,           — the story being dared
//     senderId: number,          — the user sending the dare
//     receiverUsername: string,  — the target user's username (not their ID)
//     message?: string           — optional personal message to attach
//   }
export async function POST(req: Request) {
  // Read and parse the JSON body of the request
  const body = await req.json();

  // Destructure the fields we need from the parsed body
  const { storyId, senderId, receiverUsername, message } = body;

  // Validate required fields:
  // - storyId must be truthy (non-zero number)
  // - senderId must be truthy (non-zero number)
  // - receiverUsername must be a non-empty string after trimming whitespace
  if (!storyId || !senderId || !receiverUsername?.trim()) {
    // Return 400 if any required field is missing
    return NextResponse.json(
      { error: 'storyId, senderId, and receiverUsername are required.' },
      { status: 400 }
    );
  }

  // Look up the receiver in the database by their username.
  // We use findUnique because usernames are unique in the schema.
  const receiver = await prisma.user.findUnique({
    where: {
      // Match by the trimmed username the sender typed into the UI
      username: receiverUsername.trim(),
    },
    // We only need id and username — avoids fetching sensitive fields like password
    select: { id: true, username: true },
  });

  // If no user was found with that username, tell the sender clearly
  if (!receiver) {
    // Return 404 Not Found with a message that names the missing username
    return NextResponse.json(
      { error: `No user found with username "${receiverUsername.trim()}".` },
      { status: 404 }
    );
  }

  // Prevent a user from daring themselves — that would create a nonsensical record
  // and clutters the dare inbox with self-sent items
  if (receiver.id === senderId) {
    // Return 400 Bad Request for the self-dare case
    return NextResponse.json({ error: 'You cannot dare yourself.' }, { status: 400 });
  }

  // All validation passed — create the dare record in the database.
  // The `accepted` field defaults to null (meaning "pending — not yet decided").
  const dare = await prisma.storyDare.create({
    data: {
      // Ensure storyId is stored as a number (body values can arrive as strings)
      storyId: Number(storyId),
      // Ensure senderId is stored as a number
      senderId: Number(senderId),
      // Use the numeric ID we resolved above — not the username string
      receiverId: receiver.id,
      // Store the message if one was provided, otherwise save null
      message: message?.trim() || null,
    },
    // Return the related records so the UI can immediately display the new dare
    include: {
      // Story details so the dare card can show the story title and link
      story: { select: { id: true, title: true, slug: true } },
      // Sender username for the "sent by" label
      sender: { select: { id: true, username: true } },
      // Receiver username so the sender's UI can confirm who was dared
      receiver: { select: { id: true, username: true } },
    },
  });

  // Return 201 Created with the full dare object including the related data
  return NextResponse.json(dare, { status: 201 });
}
