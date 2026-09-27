// ============================================================
//  app/api/groups/route.ts
//
//  GET  /api/groups          — list groups (public or user's own)
//  POST /api/groups          — create a new group
//
//  Groups are community spaces where readers and writers gather
//  around a shared interest (e.g. "Paranormal Fans", "Gore Writers").
//
//  GET query parameters:
//    ?subgenre=paranormal     — filter groups by subgenre tag
//    ?mine=true               — return only groups the caller belongs to
//                               (requires being logged in)
//
//  POST body:
//    {
//      name: string,          — required, the group's display name
//      description?: string,  — optional blurb
//      subgenre?: string,     — optional genre tag
//      isPrivate?: boolean,   — whether the group is invite-only
//      coverImage?: string    — optional URL for the group's cover photo
//    }
//
//  The creator of a group is automatically added as its OWNER member.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// ── Helper: convert a group name into a URL-safe slug ─────────────────────
// Examples:
//   "Paranormal Fans"  → "paranormal-fans"
//   "Gore & Guts!!!"   → "gore-guts"
// Steps:
//   1. toLowerCase()          — "Paranormal Fans" → "paranormal fans"
//   2. replace non-alphanumeric with "-"  → "paranormal-fans"
//   3. replace leading/trailing hyphens  → removes edge dashes
function slugify(name: string) {
  return (
    name
      .toLowerCase()
      // Replace any sequence of non-letter/non-digit characters with a single hyphen
      .replace(/[^a-z0-9]+/g, '-')
      // Remove any hyphen at the very start or very end of the string
      .replace(/^-|-$/g, '')
  );
}

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns a list of groups, with optional filtering by subgenre or membership.
export async function GET(req: Request) {
  // Read cookies to find out if there's a logged-in user
  const cookieStore = await cookies();

  // Get the userId from the cookie; null means the visitor is a guest
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Parse the URL to read optional query parameters
  const { searchParams } = new URL(req.url);

  // Optional: filter groups by subgenre tag (e.g. ?subgenre=paranormal)
  const subgenre = searchParams.get('subgenre');

  // Optional: ?mine=true returns only groups the logged-in user belongs to
  const mine = searchParams.get('mine') === 'true';

  // Fetch up to 40 groups from the database
  const groups = await prisma.group.findMany({
    where: {
      // If ?mine=true and the user is logged in, only show groups they're a member of.
      // Otherwise show only public groups (isPrivate: false).
      // The spread (...) merges this condition into the where object.
      ...(mine && userId ? { members: { some: { userId } } } : { isPrivate: false }),

      // If a subgenre filter was provided, add it to the WHERE clause.
      // If no filter, this spreads an empty object (no effect on the query).
      ...(subgenre ? { subgenre } : {}),
    },
    // Newest groups first
    orderBy: { createdAt: 'desc' },
    // Cap the list to avoid very large responses
    take: 40,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverImage: true,
      subgenre: true,
      isPrivate: true,
      createdAt: true,
      // Count members and posts for display on the group card without fetching all rows
      _count: { select: { members: true, posts: true } },
      // If the user is logged in, include their own membership row (if any).
      // This lets the UI know whether to show a "Join" or "Leave" button.
      // If the user is a guest (userId is null), Prisma ignores the false value.
      members: userId ? { where: { userId }, select: { id: true, role: true } } : false,
    },
  });

  // Return the array of groups as JSON
  return NextResponse.json(groups);
}

// ── POST handler ──────────────────────────────────────────────────────────────
// Creates a new group and automatically adds the creator as an OWNER member.
export async function POST(req: Request) {
  // Only logged-in users can create groups
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the JSON body for the group fields
  const { name, description, subgenre, isPrivate, coverImage } = await req.json();

  // Name is the only required field
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  // Generate a base slug from the group name
  let slug = slugify(name.trim());

  // Check whether this slug is already in use by another group
  const existing = await prisma.group.findUnique({ where: { slug } });

  // If the slug is taken, append a timestamp to make it unique.
  // e.g. "paranormal-fans" → "paranormal-fans-1711234567890"
  if (existing) slug = `${slug}-${Date.now()}`;

  // Create the group in the database
  const group = await prisma.group.create({
    data: {
      // Trimmed, human-readable name
      name: name.trim(),
      // URL-safe slug for routing (/groups/paranormal-fans)
      slug,
      // Optional description — null if not provided
      description: description?.trim() || null,
      // Optional subgenre tag — null if not provided
      subgenre: subgenre || null,
      // !!isPrivate converts undefined/null/false to false and true to true
      isPrivate: !!isPrivate,
      // Optional cover photo URL — null if not provided
      coverImage: coverImage?.trim() || null,
      // The creator owns this group
      ownerId: userId,
      // Automatically add the creator as an OWNER member.
      // Prisma handles this nested create in the same DB transaction.
      members: { create: { userId, role: 'OWNER' } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverImage: true,
      subgenre: true,
      isPrivate: true,
      createdAt: true,
      // Return member/post counts for immediate display
      _count: { select: { members: true, posts: true } },
      // Return the creator's own membership so the UI knows they're OWNER
      members: { where: { userId }, select: { id: true, role: true } },
    },
  });

  // Return 201 Created with the new group object
  return NextResponse.json(group, { status: 201 });
}
