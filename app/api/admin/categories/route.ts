// app/api/admin/categories/route.ts
// This file manages story categories (e.g. "Paranormal", "Urban Legends").
//
// GET  /api/admin/categories — admin only: returns all categories sorted by name.
// POST /api/admin/categories — admin only: creates a new category.
//
// Categories are the top-level taxonomy for stories on the site.
// Each story belongs to one category, which also appears in the site navigation.

// Import NextResponse for building JSON HTTP responses with optional status codes
import { NextResponse } from 'next/server';

// Import the cookies() helper to read the userId cookie server-side
import { cookies } from 'next/headers';

// Import the Prisma client to query and modify the database
import { prisma } from '@/lib/prisma';

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie and checks whether that user has the ADMIN role.
// Returns true if they do, false otherwise (including if not logged in at all).
// This function is used at the start of each handler to gate access.
async function isAdmin() {
  // Read all cookies from the incoming request
  const cookieStore = await cookies();

  // Get the userId cookie value; if the cookie doesn't exist, fall back to 0
  // Number() converts the string cookie value to a number
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // userId of 0 means no cookie — user is not logged in
  if (!userId) return false;

  // Query the database for this user's role; only fetch the role column (efficient)
  // findUnique returns null if no matching row — safe to use with optional chaining ?.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user exists and their role is exactly 'ADMIN'
  return user?.role === 'ADMIN';
}

// ── GET /api/admin/categories ─────────────────────────────────────────────────

// Returns all categories sorted alphabetically by name.
// Used by the admin panel to display and manage existing categories.
export async function GET() {
  // Block non-admins immediately — return 403 Forbidden
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Fetch all categories from the database
  // orderBy: { name: 'asc' } sorts A → Z
  // select: limits fields to id, name, and slug — enough for the admin list UI
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  // Return the array of categories as JSON (default status 200)
  return NextResponse.json(categories);
}

// ── POST /api/admin/categories ────────────────────────────────────────────────

// Creates a new category.  The request body should contain:
//   name        (required) — the human-readable category name, e.g. "Paranormal"
//   slug        (required) — the URL-safe identifier, e.g. "paranormal"
//   description (optional) — a short description shown on the category page
// "req: Request" is the incoming HTTP request containing the JSON body
export async function POST(req: Request) {
  // Block non-admins before doing anything else
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // Parse the JSON body to extract the three expected fields
  // If name or slug is missing, Prisma will throw a validation error (the schema marks them required)
  const { name, slug, description } = await req.json();

  // Create the new category row in the database
  // description || null converts an empty string to null (stored as NULL in the DB)
  const category = await prisma.category.create({
    data: { name, slug, description: description || null },
  });

  // Return the newly created category with status 201 Created
  return NextResponse.json(category, { status: 201 });
}
