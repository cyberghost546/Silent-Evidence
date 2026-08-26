// ============================================================
//  app/api/groups/[slug]/join/route.ts
//
//  POST   /api/groups/:slug/join  — join the group
//  DELETE /api/groups/:slug/join  — leave the group
//
//  Joining uses an "upsert" so calling POST multiple times is safe
//  (idempotent) — you can't accidentally create duplicate memberships.
//
//  The group owner cannot leave via this endpoint — they must delete
//  the group instead (handled in the [slug]/route.ts DELETE handler).
//
//  When someone new joins, the group owner receives an in-app
//  notification (fire-and-forget).
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type for the dynamic route params — slug is the group's URL identifier
type Params = { params: Promise<{ slug: string }> };

// ── POST handler: Join the group ──────────────────────────────────────────────
export async function POST(req: Request, { params }: Params) {
  // Read the slug from the URL
  const { slug } = await params;

  // Read the session cookie to identify who is joining
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to join a group
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Look up the group by slug — we need its id and ownerId
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, name: true },
  });

  // Return 404 if no group with this slug exists
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Upsert the GroupMember row.
  // "upsert" = UPDATE if the row already exists, CREATE if it doesn't.
  // This is safe to call multiple times — hitting "Join" twice won't create
  // duplicate membership rows or throw an error.
  await prisma.groupMember.upsert({
    where: {
      // The composite unique key — combination of group and user
      groupId_userId: { groupId: group.id, userId },
    },
    // If the row already exists, do nothing (empty update object)
    update: {},
    // If the row doesn't exist, create it with the MEMBER role
    create: { groupId: group.id, userId, role: 'MEMBER' },
  });

  // Notify the group owner that someone joined — but only if the joiner is NOT the owner.
  // (The owner joining their own group shouldn't trigger a self-notification.)
  if (group.ownerId !== userId) {
    // Fetch the joiner's username to personalise the notification message
    const joiner = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Create the in-app notification — fire and forget (.catch avoids unhandled rejections)
    prisma.notification
      .create({
        data: {
          // Send to the group owner
          userId: group.ownerId,
          // Use the GROUP_INVITE type so the UI can render a relevant icon
          type: 'GROUP_INVITE',
          // Human-readable message including the group name
          message: `${joiner?.username ?? 'Someone'} joined your group "${group.name}".`,
        },
      })
      .catch(() => {});
  }

  // Return success
  return NextResponse.json({ ok: true });
}

// ── DELETE handler: Leave the group ──────────────────────────────────────────
export async function DELETE(req: Request, { params }: Params) {
  // Read the slug from the URL
  const { slug } = await params;

  // Read the session cookie to identify who is leaving
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to leave
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Look up the group — we need ownerId to block the owner from leaving
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });

  // Return 404 if the group doesn't exist
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // The owner cannot leave their own group — they would need to delete it instead.
  // This prevents the group from existing without an owner.
  if (group.ownerId === userId) {
    return NextResponse.json(
      { error: 'Owner cannot leave — delete the group instead.' },
      { status: 400 }
    );
  }

  // Delete the membership row(s) for this user in this group.
  // deleteMany is used instead of delete because there's no single unique key
  // being targeted — we're matching on (groupId, userId).
  await prisma.groupMember.deleteMany({
    where: { groupId: group.id, userId },
  });

  // Return success
  return NextResponse.json({ ok: true });
}
