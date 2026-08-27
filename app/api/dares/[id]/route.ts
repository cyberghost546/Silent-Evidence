// ============================================================
//  app/api/dares/[id]/route.ts
//
//  Handles updating a single dare by its numeric ID.
//
//  PATCH /api/dares/[id]
//    → Sets the dare's `accepted` field to true or false.
//      true  = the receiver accepted the challenge
//      false = the receiver declined the challenge
//
//  The [id] segment in the folder name is a dynamic route parameter —
//  Next.js captures whatever number is in the URL and passes it
//  through the `params` object.
// ============================================================

// Import NextResponse so we can send JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the Prisma client for database access
import { prisma } from '@/lib/prisma';

// In Next.js App Router, dynamic route params are delivered as a Promise.
// We define this type so TypeScript knows params will contain an "id" string.
type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/dares/[id] ──────────────────────────────────────────────────────
// Updates the dare's accepted/declined status.
// req   — the incoming HTTP request (we'll read the JSON body from it)
// params — the dynamic URL segments, here just { id: string }
export async function PATCH(req: Request, { params }: Params) {
  // We must await params before we can read any segment from it.
  // This is required in Next.js 14+ because params is now a Promise.
  const { id } = await params;

  // Convert the id string from the URL into a JavaScript number for Prisma
  const dareId = Number(id);

  // Read and parse the JSON body to get the accept/decline decision
  const body = await req.json();

  // Destructure the `accepted` field from the request body
  const { accepted } = body;

  // Validate: `accepted` must be explicitly true or false (a boolean).
  // undefined, null, or a string like "true" are all invalid here —
  // we use typeof to make sure it's the boolean primitive type.
  if (typeof accepted !== 'boolean') {
    // Return 400 Bad Request if the value isn't a real boolean
    return NextResponse.json(
      { error: 'Body must include `accepted` as a boolean (true or false).' },
      { status: 400 }
    );
  }

  // Look up the dare before attempting to update it.
  // findUnique returns null if no dare exists with this ID, which lets us
  // return a clear 404 instead of a cryptic Prisma "record not found" error.
  const existing = await prisma.storyDare.findUnique({ where: { id: dareId } });

  // If no dare was found with this ID, return a 404 error
  if (!existing) {
    return NextResponse.json({ error: 'Dare not found.' }, { status: 404 });
  }

  // Update the dare record — set accepted to the value the receiver chose
  const updated = await prisma.storyDare.update({
    where: {
      // Target this specific dare by its primary key
      id: dareId,
    },
    data: {
      // Write the boolean (true = accepted, false = declined) into the DB
      accepted,
    },
    include: {
      // Return story details so the UI can redirect to the story on accept
      story: { select: { id: true, title: true, slug: true } },
      // Return sender username so the receiver's UI can show who sent the dare
      sender: { select: { id: true, username: true } },
    },
  });

  // Return the updated dare object so the client can reflect the change immediately
  return NextResponse.json(updated);
}
