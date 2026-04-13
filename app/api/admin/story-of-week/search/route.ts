// app/api/admin/story-of-week/search/route.ts
// Admin-only endpoint that searches for published stories by title.
//
// GET /api/admin/story-of-week/search?q=<query>
//
// PURPOSE:
//   When an admin wants to set a Story of the Week, they need a way to search
//   for the right story by typing part of its title.  This endpoint returns
//   up to 10 matching published stories so the admin UI can display them
//   as autocomplete suggestions.
//
// QUERY PARAMETER:
//   q — the search string (e.g. "haunted" or "disappear").
//   If q is empty or missing, an empty array is returned immediately.
//
// AUTH:
//   Only admins can search — the handler checks the userId cookie and database role.
//   Non-admins receive 403 Forbidden.

// Import NextRequest (request type with typed URL helpers) and NextResponse for responses
import { NextRequest, NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to query the database
import { prisma } from '@/lib/prisma';

// ── GET /api/admin/story-of-week/search ──────────────────────────────────────

// Returns up to 10 published stories whose titles contain the search query.
// Results are sorted by newest first.
//
// "req: NextRequest" — the incoming request object; we read the "q" query parameter from its URL.
export async function GET(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────────

  // Read all cookies from the incoming request
  const c = await cookies();

  // Get the userId cookie value and convert it to a number; default to 0 if absent.
  // ?.value uses optional chaining: returns undefined if the cookie doesn't exist.
  // ?? 0 replaces undefined/null with 0 — our "no user" sentinel value.
  const userId = Number(c.get('userId')?.value ?? 0);

  // If userId is 0, no cookie was present — the user is not logged in.
  // Return 403 Forbidden (we use 403 here rather than 401 to keep the auth response consistent).
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Look up the user in the database to verify their role.
  // select: { role: true } fetches only the role column — no unnecessary data loaded.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // If the user doesn't exist or isn't an ADMIN, return 403 Forbidden.
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Read and validate the search query ────────────────────────────────────────

  // req.nextUrl.searchParams is the parsed URLSearchParams object for this request's URL.
  // .get('q') reads the value of the "q" query parameter (e.g. ?q=haunted → "haunted").
  // ?.trim() removes surrounding whitespace from the value.
  // ?? '' falls back to an empty string if "q" wasn't provided or was null.
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  // If the query is empty, return an empty array immediately — no point searching for nothing.
  // This also avoids a potentially expensive "contains: ''" query that could return all stories.
  if (!q) return NextResponse.json([]);

  // ── Search the database ───────────────────────────────────────────────────────

  // prisma.story.findMany() fetches all stories matching the filter conditions.
  // where: combines two conditions (both must be true):
  //   status: 'PUBLISHED' — only show stories that are live on the site
  //   title: { contains: q } — the title must contain the search string (case-insensitive on most DBs)
  // select: limits the returned fields to only what the admin UI needs:
  //   id         — needed to identify the story when pinning it
  //   title      — displayed in the autocomplete dropdown
  //   slug       — used to build a preview link
  //   coverImage — shown as a thumbnail in the dropdown
  //   author.username — shown so the admin can distinguish stories by the same title
  // orderBy: { createdAt: 'desc' } — newest stories first (most recent content is usually what's wanted)
  // take: 10 — return at most 10 results so the dropdown stays manageable
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED', title: { contains: q } },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      author: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Return the array of matching stories as JSON (default status 200 OK).
  // Each element has: id, title, slug, coverImage, author: { username }
  return NextResponse.json(stories);
}
