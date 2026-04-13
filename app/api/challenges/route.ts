// app/api/challenges/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles two endpoints for writing challenges:
//
//   GET  /api/challenges — returns all challenges with entry counts (public, no auth)
//   POST /api/challenges — creates a new challenge (admin only)
//
// Writing challenges are community contests where users submit stories based on
// a given prompt. Each challenge has a title, a writing prompt, a date range,
// and an active/inactive flag.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextRequest (typed request) and NextResponse (JSON builder)
import { NextRequest, NextResponse } from 'next/server';

// Import cookies() to read the session cookie for admin authentication
import { cookies } from 'next/headers';

// Import the Prisma database client to query and create challenge records
import { prisma } from '@/lib/prisma';

// ── Helper: check if the current request is from an admin user ────────────────
// This is a separate function because both GET and POST may need it.
// We look up the user's role in the DB rather than trusting the cookie value directly,
// because cookies can be tampered with — the DB record is the source of truth.
async function isAdmin() {
  // Read the cookie store for this request
  const c = await cookies();

  // Get the userId from the session cookie, defaulting to null if not logged in.
  // Number() converts the string to an integer.
  // || null converts 0 (no cookie) to null for a clean falsy check.
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // Not logged in at all — definitely not an admin
  if (!userId) return false;

  // Look up the user in the database and retrieve only their role field
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  // Return true only if the user's role is exactly 'ADMIN'
  return user?.role === 'ADMIN';
}

// ── GET /api/challenges ───────────────────────────────────────────────────────
// Returns all challenges ordered newest-first with a count of how many entries each has.
// This endpoint is public — no login required, so the challenges page works for guests.
export async function GET() {
  // Fetch all challenge records from the database.
  // orderBy createdAt desc — newest challenge appears first in the list.
  // include _count.entries — attaches a number showing how many entries each challenge has,
  // without fetching all the actual entry records (more efficient).
  const challenges = await prisma.challenge.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  });

  // Return the full list as a JSON array
  return NextResponse.json(challenges);
}

// ── POST /api/challenges ──────────────────────────────────────────────────────
// Creates a new writing challenge. Only admins can create challenges.
// Expected body: { title, description?, prompt, startDate, endDate, active? }
export async function POST(req: NextRequest) {
  // Guard: reject non-admins with a 403 Forbidden response
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Parse the JSON body from the request
  const { title, description, prompt, startDate, endDate, active } = await req.json();

  // Validate required fields — title, prompt, startDate, and endDate must all be present.
  // .trim() removes leading/trailing whitespace before the truthiness check,
  // so a value of "   " (only spaces) is treated as empty.
  if (!title?.trim() || !prompt?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create the challenge record in the database with the validated data
  const challenge = await prisma.challenge.create({
    data: {
      title: title.trim(),                 // strip whitespace from title
      description: description?.trim() || '', // description is optional; default to empty string
      prompt: prompt.trim(),              // strip whitespace from the writing prompt
      startDate: new Date(startDate),     // convert the ISO date string to a Date object
      endDate: new Date(endDate),         // convert the ISO date string to a Date object
      // Default active to true unless the caller explicitly passes false.
      // active !== false means: if active is undefined or true, it becomes true.
      active: active !== false,
    },
  });

  // Return 201 Created with the new challenge record as JSON
  return NextResponse.json(challenge, { status: 201 });
}
