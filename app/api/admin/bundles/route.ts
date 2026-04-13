// app/api/admin/bundles/route.ts
// This file manages story bundles — curated collections of stories sold or displayed together.
//
// GET  /api/admin/bundles — admin only: returns all bundles with their story lists.
// POST /api/admin/bundles — admin only: creates a new bundle with the given stories.
//
// A "bundle" groups multiple published stories under one title, description, and cover image.
// Bundles can have a price (stored in cents) and an active/inactive toggle.
// The relationship is managed through the StoryBundleItem join table.

// Import NextResponse for building JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie from the incoming request
import { cookies } from 'next/headers';

// Import the Prisma client to read and write to the database
import { prisma } from '@/lib/prisma';

// ── Helper: generate a URL-safe slug from a title ────────────────────────────

// Takes a human-readable title like "Dark Forest Nights" and converts it to
// a URL-safe slug like "dark-forest-nights-x7f2".
// A short random suffix (4 characters from a base-36 number) is appended to
// prevent collisions if two bundles share the same title.
// "title: string" declares the parameter type — must be a string
function slugify(title: string) {
  return title.toLowerCase().trim()              // 1. lowercase and strip surrounding whitespace
    .replace(/[^a-z0-9\s-]/g, '')               // 2. remove any character that isn't a letter, number, space, or hyphen
    .replace(/\s+/g, '-')                        // 3. replace one or more spaces with a single hyphen
    .replace(/-+/g, '-')                         // 4. collapse multiple consecutive hyphens into one
    + '-' + Math.random().toString(36).slice(2, 6); // 5. append 4 random base-36 characters for uniqueness
}

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and checks whether that user has the ADMIN role.
// Returns true if they do, false if they don't or aren't logged in.
// "Promise<boolean>" means this async function eventually resolves to true or false.
async function isAdmin(): Promise<boolean> {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie; if missing, default to 0 (no user)
  // Number() converts the string cookie value to a number
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // A userId of 0 means no cookie — not logged in
  if (!userId) return false;

  // Look up the user in the database — only fetch the role field (efficient)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user exists and their role is exactly 'ADMIN'
  return user?.role === 'ADMIN';
}

// ── GET /api/admin/bundles ────────────────────────────────────────────────────

// Returns every bundle in the database, newest first, including the full story list.
// The nested "include" traverses the join table (StoryBundleItem) to attach story details.
export async function GET() {
  // Block non-admins with a 403 Forbidden response
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all bundles from the database
  // orderBy: { createdAt: 'desc' } puts the newest bundle first
  // include: { items: ... } traverses the StoryBundleItem join table to attach each bundle's stories
  //   items.story selects only id, title, and slug — enough for the admin list UI
  const bundles = await prisma.storyBundle.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { story: { select: { id: true, title: true, slug: true } } } } },
  });

  // Return the array of bundles as JSON
  return NextResponse.json(bundles);
}

// ── POST /api/admin/bundles ───────────────────────────────────────────────────

// Creates a new bundle.  The request body should contain:
//   title       (required) — bundle name
//   description (optional) — summary text
//   coverImage  (optional) — URL string
//   price       (optional) — price in cents (default 0)
//   storyIds    (optional) — array of story ID numbers to include
// "req: Request" is the incoming HTTP request containing the JSON body
export async function POST(req: Request) {
  // Block non-admins before doing anything expensive
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Parse the incoming JSON body into a plain object
  const body = await req.json();

  // Extract and sanitize each expected field from the body
  // typeof check + .trim() prevents saving raw untrimmed strings or wrong types

  // title — required; trim whitespace; default to empty string if not a string
  const title       = typeof body.title       === 'string' ? body.title.trim()       : '';

  // description — optional; trim whitespace; use null if not provided (null is stored as NULL in DB)
  const description = typeof body.description === 'string' ? body.description.trim() : null;

  // coverImage — optional; trim whitespace; use null if not provided
  const coverImage  = typeof body.coverImage  === 'string' ? body.coverImage.trim()  : null;

  // price — optional; Number() converts it from any type; || 0 means "default to 0 if NaN or falsy"
  // Stored in cents (e.g. 999 = $9.99)
  const price       = Number(body.price) || 0;

  // storyIds — optional array of story IDs to include in the bundle
  // Array.isArray() guards against non-array values
  // .map(Number) converts each element to a number
  // .filter(Boolean) removes any 0 or NaN values that resulted from bad input
  const storyIds    = Array.isArray(body.storyIds) ? body.storyIds.map(Number).filter(Boolean) : [];

  // Title is required — reject blank submissions
  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  // Create the bundle and its story associations in a single database operation.
  // The nested "items.create" inserts one StoryBundleItem row per storyId.
  // include: { items: ... } returns the full bundle (with story data) in the response.
  const bundle = await prisma.storyBundle.create({
    data: {
      title,
      slug: slugify(title),           // generate a URL-safe slug from the title
      description: description || null, // store null if description was empty string
      coverImage: coverImage || null,   // store null if coverImage was empty string
      price,
      items: {
        // create multiple StoryBundleItem rows — one per story ID in the list
        // .map() transforms each storyId number into the shape Prisma expects
        create: storyIds.map((storyId: number) => ({ storyId })),
      },
    },
    // Return the newly created bundle including its items and story details
    include: { items: { include: { story: { select: { id: true, title: true, slug: true } } } } },
  });

  // Return the created bundle with status 201 Created (not the default 200)
  return NextResponse.json(bundle, { status: 201 });
}
