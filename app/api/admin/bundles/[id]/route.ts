// app/api/admin/bundles/[id]/route.ts
// This file handles operations on a SINGLE existing bundle, identified by its numeric ID
// in the URL path (e.g. /api/admin/bundles/42).
//
// PATCH  /api/admin/bundles/[id] — admin only: update any combination of a bundle's fields.
//                                  If storyIds is provided, the entire story list is replaced.
// DELETE /api/admin/bundles/[id] — admin only: permanently remove the bundle.
//
// The [id] in the folder name is a Next.js dynamic route segment — the actual number
// arrives as params.id (a string that we convert to a number with Number()).

// Import NextResponse for building JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and confirms the user has the ADMIN role in the database.
// Returning a boolean (true/false) keeps the call sites clean:
//   if (!(await isAdmin())) return 403;
// "Promise<boolean>" means the function is async and eventually resolves to true or false.
async function isAdmin(): Promise<boolean> {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value; default to 0 if the cookie doesn't exist
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // 0 means no cookie — user is not logged in
  if (!userId) return false;

  // Look up the user in the database; only select the role to avoid fetching unnecessary data
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user exists and has the ADMIN role
  return user?.role === 'ADMIN';
}

// ── PATCH /api/admin/bundles/[id] ────────────────────────────────────────────

// Partially updates an existing bundle.
// Only the fields present in the request body are changed — omitted fields keep their values.
// If storyIds is included, the entire story list is replaced (delete all, then re-insert).
//
// "req: Request" — the incoming HTTP request with the JSON body
// "{ params }: { params: Promise<{ id: string }> }" — Next.js passes dynamic URL segments
//   via params; id is always a string in the URL even though our DB uses integers
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Block non-admins before doing anything else
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Await the params object to get the id string from the URL segment
  const { id } = await params;

  // Convert the id string to a number for use in Prisma queries
  const bundleId = Number(id);

  // Parse the JSON request body into a plain object
  const body = await req.json();

  // Build the Prisma update payload — only include fields that were actually sent.
  // Record<string, unknown> means "an object with string keys and values of any type".
  // We start with an empty object and conditionally add each field below.
  const data: Record<string, unknown> = {};

  // Only update title if the client sent a non-undefined string
  // .trim() removes surrounding whitespace before saving
  if (typeof body.title === 'string') data.title = body.title.trim();

  // Only update description if sent; trim() then || null converts empty string to null
  if (typeof body.description === 'string') data.description = body.description.trim() || null;

  // Only update coverImage if sent; || null converts empty string to null (removes image)
  if (typeof body.coverImage === 'string') data.coverImage = body.coverImage.trim() || null;

  // Only update price if sent as a number (type check prevents strings sneaking in)
  if (typeof body.price === 'number') data.price = body.price;

  // Only update active if sent as a boolean (true/false toggle)
  if (typeof body.active === 'boolean') data.active = body.active;

  // ── Replace story list if storyIds was provided ───────────────────────────

  // If the client sent a new array of story IDs, we replace the entire list.
  // This is simpler than diffing old/new lists: delete all, then re-insert.
  if (Array.isArray(body.storyIds)) {
    // Convert each element to a number; filter(Boolean) removes any 0/NaN results
    const storyIds: number[] = body.storyIds.map(Number).filter(Boolean);

    // Step 1: delete all existing StoryBundleItem rows for this bundle
    // deleteMany is safe even if there are no existing rows
    await prisma.storyBundleItem.deleteMany({ where: { bundleId } });

    // Step 2: insert new StoryBundleItem rows — one per story ID in the new list
    // createMany inserts multiple rows in a single SQL statement (efficient)
    // skipDuplicates: true prevents errors if the same storyId appears twice in the array
    await prisma.storyBundleItem.createMany({
      data: storyIds.map((storyId) => ({ bundleId, storyId })),
      skipDuplicates: true,
    });
  }

  // ── Update the bundle's own fields ───────────────────────────────────────

  // update() writes only the fields in `data` — any omitted columns are untouched
  // where: { id: bundleId } targets the specific bundle row
  // include: returns the full bundle with story details so the UI can update in place
  const updated = await prisma.storyBundle.update({
    where: { id: bundleId },
    data,
    include: { items: { include: { story: { select: { id: true, title: true, slug: true } } } } },
  });

  // Return the updated bundle as JSON
  return NextResponse.json(updated);
}

// ── DELETE /api/admin/bundles/[id] ───────────────────────────────────────────

// Permanently removes the bundle and its associated StoryBundleItem rows.
// "_req" is prefixed with underscore to signal that we intentionally ignore the request body.
// "{ params }: { params: Promise<{ id: string }> }" — same dynamic params pattern as PATCH above
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Block non-admins before doing anything else
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Await the params object to get the id string from the URL, then convert to a number
  const { id } = await params;

  // Delete the bundle row — Prisma cascades the delete to StoryBundleItem rows automatically
  // (configured via referentialActions in the Prisma schema)
  await prisma.storyBundle.delete({ where: { id: Number(id) } });

  // Return a simple success acknowledgement
  return NextResponse.json({ ok: true });
}
