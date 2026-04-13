// ============================================================
//  app/api/groups/[slug]/route.ts
//
//  GET    /api/groups/:slug  — full group detail page data
//  PATCH  /api/groups/:slug  — update group metadata (OWNER/MOD only)
//  DELETE /api/groups/:slug  — permanently delete the group (OWNER only)
//
//  The [slug] segment is the group's URL-safe identifier,
//  e.g. /api/groups/paranormal-fans.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type for the dynamic route params — slug is the group's URL slug
type Params = { params: Promise<{ slug: string }> };

// ── Helper function: fetch group with all related data + caller's role ─────
// This is used by all three handlers (GET, PATCH, DELETE) so it lives here
// as a shared helper to avoid repeating the same large Prisma query.
//
// slug   — the URL slug of the group
// userId — the currently logged-in user's ID (0 if not logged in)
//
// Returns null if the group doesn't exist.
// Returns { group, role } where role is the caller's membership role or null.
async function getGroupAndRole(slug: string, userId: number) {

  // Fetch the full group with members, recent posts, open polls, and counts
  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      // All members with their user profile (for the members list sidebar)
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              // Avatar lives in the related Profile row
              profile: { select: { avatar: true } },
            },
          },
        },
      },

      // Most recent 20 posts in this group (for the group feed)
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          author: {
            select: {
              username: true,
              profile: { select: { avatar: true } },
            },
          },
        },
      },

      // Open polls (those where endsAt is null or still in the future)
      polls: {
        where: {
          // OR means: include polls with no end date, OR polls that haven't closed yet
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        // Newest polls first
        orderBy: { createdAt: 'desc' },
        // Cap at 10 polls per group page
        take: 10,
        include: {
          // Who created the poll
          author: { select: { username: true } },
          // Total vote count for this poll
          _count: { select: { votes: true } },
          // Each option with its vote count and whether THIS user voted for it
          options: {
            select: {
              id: true,
              text: true,
              // Count votes for this option
              _count: { select: { votes: true } },
              // Include whether the calling user voted for this specific option.
              // If userId is falsy (0 / not logged in), false tells Prisma to skip it.
              votes: userId ? { where: { userId }, select: { id: true } } : false,
            },
          },
        },
      },

      // Aggregate counts for the group header stats (e.g. "128 members, 304 posts")
      _count: { select: { members: true, posts: true } },
    },
  });

  // Return null if the group doesn't exist — callers check this and return 404
  if (!group) return null;

  // Find the calling user's membership row (if they're a member)
  const membership = group.members.find(m => m.userId === userId);

  // Return both the group data and the caller's role.
  // role is null when the user is not a member or not logged in.
  return { group, role: membership?.role ?? null };
}

// ── GET handler ───────────────────────────────────────────────────────────────
// Returns the full group object plus the caller's role.
export async function GET(req: Request, { params }: Params) {

  // Read the slug from the URL params
  const { slug } = await params;

  // Read the session cookie (0 if not logged in — that's fine, GET is semi-public)
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || 0;

  // Fetch the group and the caller's role using our helper
  const result = await getGroupAndRole(slug, userId);

  // Return 404 if the group doesn't exist
  if (!result) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Merge the group data and userRole into one flat object for the client
  return NextResponse.json({ ...result.group, userRole: result.role });
}

// ── PATCH handler ─────────────────────────────────────────────────────────────
// Updates group name, description, or cover image.
// Only OWNER and MODERATOR members can make changes.
export async function PATCH(req: Request, { params }: Params) {

  // Read the slug from URL params
  const { slug } = await params;

  // Must be logged in to edit
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Fetch the group so we can check the caller's role
  const result = await getGroupAndRole(slug, userId);
  if (!result) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Only OWNER or MODERATOR may edit the group — regular members and guests cannot
  if (!['OWNER', 'MODERATOR'].includes(result.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // Parse the JSON body for the fields to update
  const { name, description, coverImage } = await req.json();

  // Build the update object dynamically — only include fields that were sent.
  // Spreading empty objects has no effect, so omitted fields are left unchanged.
  const updated = await prisma.group.update({
    where: { slug },
    data: {
      // If name was provided, trim it; otherwise don't touch it
      ...(name ? { name: name.trim() } : {}),
      // description can be explicitly set to null (to clear it) — hence !== undefined check
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      // Same pattern for coverImage — can be cleared by passing an empty string
      ...(coverImage !== undefined ? { coverImage: coverImage?.trim() || null } : {}),
    },
    // Return just the updated fields so the client can refresh the header
    select: { id: true, name: true, slug: true, description: true, coverImage: true },
  });

  // Return the updated group data
  return NextResponse.json(updated);
}

// ── DELETE handler ────────────────────────────────────────────────────────────
// Permanently deletes the group and all its data.
// Only the OWNER may delete — moderators cannot.
export async function DELETE(req: Request, { params }: Params) {

  // Read the slug from URL params
  const { slug } = await params;

  // Must be logged in to delete
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Fetch the group and the caller's role
  const result = await getGroupAndRole(slug, userId);
  if (!result) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Only the OWNER can delete a group — moderators only help manage it
  if (result.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only the owner can delete a group.' }, { status: 403 });
  }

  // Delete the group — Prisma cascades deletes to members, posts, polls, etc.
  // based on the onDelete: Cascade rules in the Prisma schema.
  await prisma.group.delete({ where: { slug } });

  // Return a simple { ok: true } to confirm the deletion
  return NextResponse.json({ ok: true });
}
