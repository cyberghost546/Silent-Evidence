/**
 * app/api/Slide/[id]/route.ts
 * ────────────────────────────
 * PURPOSE:
 *   REST API for a single homepage carousel slide, identified by its numeric ID.
 *   Supports three HTTP methods:
 *     GET    — public, returns the slide data (used to preview a specific slide)
 *     PUT    — admin only, updates any combination of the slide's fields
 *     DELETE — admin only, permanently removes the slide
 *
 * URL PATTERN:
 *   /api/Slide/[id]   e.g. /api/Slide/3
 *   The [id] segment is a dynamic route parameter — Next.js extracts it and
 *   passes it inside the `params` object.
 *
 * SECURITY:
 *   PUT and DELETE check `isAdmin()` before doing anything.
 *   `isAdmin()` reads the `userId` cookie, looks up the user in the DB, and
 *   confirms their role is 'ADMIN'.  If not, it returns 403 Forbidden.
 *
 * FIELD SANITISATION (PUT):
 *   We never pass `req.json()` directly to `prisma.update()`.  Instead we
 *   build a `data` object field-by-field, coercing types and clamping lengths.
 *   This prevents a user from injecting unexpected fields into the database.
 *
 * HOW TO REUSE IN ANOTHER PROJECT:
 *   - The `isAdmin()` helper + early-return 403 pattern is a clean, reusable
 *     guard for any admin-only API route.
 *   - The "build data object only for defined fields" pattern (the `if (x !== undefined)`
 *     checks) lets clients send partial updates — they only include the fields
 *     they want to change.  This is the PATCH/PUT partial-update convention.
 *   - Always sanitise and coerce user input before writing to the DB:
 *     `String().trim().slice(0, N)` limits text length; `Number()` coerces to
 *     a number; `Boolean()` coerces to true/false.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Params shape — Next.js 15 passes route params as a Promise
type Params = { params: Promise<{ id: string }> };

// ── Auth helper ───────────────────────────────────────────────────────────────

// Reads the userId cookie, then checks the database to confirm the user is an ADMIN.
// Returns true only if both conditions are met; false otherwise.
// This is called at the top of every write handler before touching the database.
async function isAdmin() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return false; // not logged in at all
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

// ── GET /api/Slide/[id] — public ─────────────────────────────────────────────

// Fetches a single slide by its numeric ID.
// Anyone can call this — no auth required.
// Returns 404 if the slide doesn't exist.
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const slide = await prisma.slide.findUnique({ where: { id: Number(id) } });
  if (!slide) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json(slide);
}

// ── PUT /api/Slide/[id] — admin only ─────────────────────────────────────────

// Updates any subset of a slide's fields.
// The client sends only the fields it wants to change; others are left as-is.
// All fields are sanitised before being written to the database.
export async function PUT(req: Request, { params }: Params) {
  // Reject non-admin requests immediately with 403 Forbidden
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  // Destructure only the fields we care about — ignores any extra keys the
  // client might have sent (defence against unexpected/malicious payloads)
  const { title, subtitle, image, linkUrl, order, active } = await req.json();

  // Build the update object — only include a field if the client actually sent it.
  // This allows partial updates: sending just { active: false } only changes
  // the active flag and leaves title, image, etc. unchanged.
  const data: Record<string, unknown> = {};
  if (title !== undefined)    data.title    = String(title).trim().slice(0, 200);   // max 200 chars
  if (subtitle !== undefined) data.subtitle = subtitle ? String(subtitle).trim().slice(0, 300) : null;
  if (image !== undefined)    data.image    = String(image).trim().slice(0, 500);   // URL max 500 chars
  if (linkUrl !== undefined)  data.linkUrl  = linkUrl ? String(linkUrl).trim().slice(0, 500) : null;
  if (order !== undefined)    data.order    = Number(order) || 0;  // coerce to number, default 0
  if (active !== undefined)   data.active   = Boolean(active);     // coerce to boolean

  const slide = await prisma.slide.update({ where: { id: Number(id) }, data });
  return NextResponse.json(slide);
}

// ── DELETE /api/Slide/[id] — admin only ──────────────────────────────────────

// Permanently deletes the slide from the database.
// The carousel will reorder automatically on the next page load.
export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  await prisma.slide.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
