// ============================================================
//  app/api/groups/[slug]/posts/[postId]/route.ts
//
//  DELETE /api/groups/:slug/posts/:postId
//
//  Deletes a single post from a group.
//
//  Who can delete a post?
//    - The post's own author (they can always remove their own post)
//    - A group OWNER or MODERATOR (they moderate the group content)
//
//  Regular members who didn't write the post cannot delete it.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import the Prisma database client
import { prisma } from '@/lib/prisma';

// Type for the dynamic route params.
// slug  = the group's URL slug (e.g. "paranormal-fans")
// postId = the numeric ID of the post to delete
type Params = { params: Promise<{ slug: string; postId: string }> };

// ── DELETE handler ────────────────────────────────────────────────────────────
// Deletes the specified group post if the caller has permission.
export async function DELETE(req: Request, { params }: Params) {

  // Await the params Promise and read both dynamic segments from the URL
  const { slug, postId } = await params;

  // Read the session cookie to identify who is making the request
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Must be logged in to delete a post
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Look up the group — we need its id to check the caller's membership role
  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  // Return 404 if the group doesn't exist
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });

  // Look up the post — we need the authorId to check if the caller wrote it
  const post = await prisma.groupPost.findUnique({
    where: { id: Number(postId) },
    select: { authorId: true },
  });

  // Return 404 if the post doesn't exist
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

  // Check the caller's membership role in this group.
  // We need to know if they are an OWNER or MODERATOR who can delete anyone's posts.
  const membership = await prisma.groupMember.findUnique({
    where: {
      // Composite unique key — look up this specific user's membership in this group
      groupId_userId: { groupId: group.id, userId },
    },
    select: { role: true },
  });

  // Determine whether the caller is allowed to delete this post.
  // They can delete it if:
  //   a) They are the post's author, OR
  //   b) They are an OWNER or MODERATOR of this group
  const canDelete =
    post.authorId === userId ||
    ['OWNER', 'MODERATOR'].includes(membership?.role ?? '');

  // If neither condition is true, reject with 403 Forbidden
  if (!canDelete) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Delete the group post from the database
  await prisma.groupPost.delete({
    where: {
      // Convert the string postId from the URL to a number for Prisma
      id: Number(postId),
    },
  });

  // Return a simple success response
  return NextResponse.json({ ok: true });
}
