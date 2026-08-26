// ============================================================
//  app/api/last-words/route.ts
//
//  "Last Words" is a micro-post feature — like Twitter for horror fans.
//  Users can post short statements (≤ 280 characters) that appear in a
//  real-time feed on the site.
//
//  GET  /api/last-words  — returns the 50 most recent last words
//  POST /api/last-words  — creates a new last word
//
//  Each returned entry includes:
//    - id, content, createdAt
//    - likes (count of users who liked it)
//    - user.username and user.avatar (for the post card header)
//
//  Avatars fall back to ui-avatars.com letter-avatars when the user
//  has not uploaded a profile photo.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── Helper: build an avatar URL for a user ────────────────────────────────
// If the user has uploaded a profile avatar, return that URL directly.
// Otherwise generate a letter-avatar on the fly from ui-avatars.com,
// using a green background to match the site theme.
//
// username      — the user's display name (used for the letter initials)
// profileAvatar — the stored avatar URL, or null/undefined if none
function avatarUrl(username: string, profileAvatar?: string | null): string {
  // If a real avatar URL exists, use it
  if (profileAvatar) return profileAvatar;
  // Otherwise build a ui-avatars URL with the username initials
  // encodeURIComponent makes the username URL-safe (handles spaces, special chars)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=22c55e&color=fff&size=64`;
}

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns the 50 most recent last words.
// Public endpoint — no login required to read the feed.
export async function GET() {
  try {
    // Fetch the 50 most recent entries from the database
    const words = await prisma.lastWord.findMany({
      // Limit to 50 rows — enough for a full feed without loading too much data
      take: 50,
      // Newest posts first (standard social feed order)
      orderBy: { createdAt: 'desc' },
      include: {
        // Join the user row to get their username and profile avatar
        user: {
          select: {
            username: true,
            // The avatar is on the related Profile row, not directly on User
            profile: { select: { avatar: true } },
          },
        },
        // Count how many users have liked each last word.
        // likedBy is the relation name for LastWordLike in the schema.
        _count: { select: { likedBy: true } },
      },
    });

    // Reshape each raw Prisma object into a clean, flat structure for the client.
    // This hides Prisma's nested _count and relation syntax from the frontend.
    const shaped = words.map((w) => ({
      // The unique database ID
      id: w.id,
      // The text content of the last word
      content: w.content,
      // Convert the Date object to an ISO 8601 string for JSON serialisation
      createdAt: w.createdAt.toISOString(),
      // Pull the like count out of Prisma's _count object
      likes: w._count.likedBy,
      // Nest the user info under a clean `user` key
      user: {
        username: w.user.username,
        // Use the helper to get a real or generated avatar URL
        avatar: avatarUrl(w.user.username, w.user.profile?.avatar),
      },
    }));

    // Return the shaped array as JSON
    return NextResponse.json(shaped);
  } catch (err) {
    // Log the full error server-side for debugging
    console.error('[GET /api/last-words]', err);
    // Return a generic 500 error — don't leak internal details to the client
    return NextResponse.json({ error: 'Failed to fetch last words.' }, { status: 500 });
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
// Creates a new last word for a user.
// Expected JSON body: { content: string, userId: number }
export async function POST(req: Request) {
  try {
    // Parse the JSON body
    const body = await req.json();

    // Destructure and type the fields we expect
    const { content, userId } = body as { content?: string; userId?: number };

    // Both content and userId are required — reject if either is missing
    if (!content || !userId) {
      return NextResponse.json({ error: 'content and userId are required.' }, { status: 400 });
    }

    // Reject empty content (all whitespace counts as empty)
    if (content.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty.' }, { status: 400 });
    }

    // Enforce the 280-character limit (like a tweet)
    if (content.length > 280) {
      return NextResponse.json(
        { error: 'Last words must be 280 characters or fewer.' },
        { status: 400 }
      );
    }

    // Insert the new last word into the database
    const word = await prisma.lastWord.create({
      data: {
        // Trim whitespace before saving
        content: content.trim(),
        // Number() ensures the userId is stored as an integer, not a string
        userId: Number(userId),
      },
      // Include the author so we can return the shaped response without a second query
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    });

    // Return the newly created post in the same flat shape as the GET list
    return NextResponse.json({
      id: word.id,
      content: word.content,
      // Convert the creation timestamp to an ISO string
      createdAt: word.createdAt.toISOString(),
      // A brand new post has 0 likes — no need to query the count
      likes: 0,
      user: {
        username: word.user.username,
        avatar: avatarUrl(word.user.username, word.user.profile?.avatar),
      },
    });
  } catch (err) {
    // Log the error server-side
    console.error('[POST /api/last-words]', err);
    // Return a generic 500 — don't expose internal stack traces
    return NextResponse.json({ error: 'Failed to save last word.' }, { status: 500 });
  }
}
