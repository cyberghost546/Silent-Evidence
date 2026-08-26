// app/api/chapters/[id]/purchase/confirm/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles POST /api/chapters/[id]/purchase/confirm — the final step
// of the chapter purchase flow.
//
// How the full purchase flow works:
//   1. Frontend calls POST /api/chapters/[id]/purchase → gets a Stripe clientSecret
//   2. Frontend shows Stripe's payment UI to collect card details
//   3. Frontend calls stripe.confirmPayment() — Stripe charges the card
//   4. On success, the frontend calls THIS endpoint with the paymentIntentId
//   5. This endpoint verifies the payment with Stripe (server-to-server) and
//      creates the ChapterPurchase record in our database
//
// We NEVER trust the client to tell us a payment succeeded — we always verify
// directly with Stripe's API before unlocking access to the chapter.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to create the chapter purchase record
import { prisma } from '@/lib/prisma';

// Import the configured Stripe client to retrieve and verify the PaymentIntent
import { stripe } from '@/lib/stripe';

// Import pre-built error response helpers for consistent HTTP error responses:
// unauthorized — 401 when the user is not logged in
// badRequest   — 400 for invalid payment states or mismatched metadata
// serverError  — 500 for unexpected failures (e.g. Stripe API errors)
import { unauthorized, badRequest, serverError } from '@/lib/apiError';

// Next.js App Router passes dynamic route segments (e.g. [id]) through a params Promise.
// We declare the type so TypeScript knows the shape of the resolved params object.
type Ctx = { params: Promise<{ id: string }> };

// ── POST handler ──────────────────────────────────────────────────────────────
// This function runs whenever a POST request is made to /api/chapters/[id]/purchase/confirm.
// "req"    — the incoming request; the JSON body contains { paymentIntentId: string }
// "params" — contains the chapter ID from the URL segment [id]
export async function POST(req: Request, { params }: Ctx) {
  // Await the params Promise to get the chapter ID string from the URL segment
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const chapterId = Number(id);

  // ── Auth check ────────────────────────────────────────────────────────────
  // Only logged-in users can confirm a purchase — guests can't buy chapters
  const c = await cookies();

  // Extract and convert the userId from the session cookie.
  // Number() converts the string to an integer.
  // || null converts 0 (missing cookie) to null for a clean falsy check.
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // If userId is null, the user is not logged in — reject with 401 Unauthorized
  if (!userId) return unauthorized();

  try {
    // ── Parse the request body ────────────────────────────────────────────────
    // Read the JSON body from the request — expects { paymentIntentId: string }
    const { paymentIntentId } = await req.json();

    // The paymentIntentId is required — we can't verify payment without it
    if (!paymentIntentId) return badRequest('paymentIntentId is required.');

    // ── Verify the PaymentIntent with Stripe ──────────────────────────────────
    // We retrieve the PaymentIntent directly from Stripe's API using their SDK.
    // This is the security-critical step — we NEVER trust the client to report
    // payment status. The only source of truth is Stripe's own servers.
    // Verify the PaymentIntent with Stripe — never trust client-only data
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check that Stripe confirms the payment actually completed successfully.
    // 'succeeded' is the only status that means money was collected.
    // Other statuses like 'processing', 'requires_action', or 'canceled' mean
    // the payment is not yet complete and we should not grant access.
    if (intent.status !== 'succeeded') {
      return badRequest('Payment has not been completed.');
    }

    // ── Validate the metadata to prevent spoofing ─────────────────────────────
    // When the PaymentIntent was created, we stored the chapterId and userId in
    // its metadata. We verify those match the current request to prevent a user
    // from using someone else's PaymentIntent (e.g. copying a paymentIntentId
    // from another user's network request and submitting it here).
    // Verify the intent metadata matches this chapter and user (prevents spoofing)
    if (
      // Check that the chapter recorded in the PaymentIntent matches the URL
      intent.metadata.chapterId !== String(chapterId) ||
      // Check that the user recorded in the PaymentIntent matches the logged-in user
      intent.metadata.userId !== String(userId)
    ) {
      return badRequest('Payment intent does not match this chapter.');
    }

    // ── Create the purchase record ────────────────────────────────────────────
    // Use upsert instead of create so this endpoint is safe to call twice
    // (e.g. if the user's browser crashes after payment and they retry the page).
    // If the record already exists, the update block (which is empty) is run —
    // meaning nothing changes, but no error is thrown either.
    // Create purchase record (upsert — safe to call twice if user retries)
    await prisma.chapterPurchase.upsert({
      where: {
        // userId_chapterId is the composite unique constraint name from the schema
        userId_chapterId: { userId, chapterId },
      },

      // Fields for a brand-new purchase record
      create: {
        userId, // the user who paid
        chapterId, // which chapter they purchased
        amount: intent.amount, // the amount charged (in cents) from Stripe
        stripePaymentIntentId: intent.id, // store the Stripe intent ID for audit/refund purposes
      },

      // If the record already exists (duplicate call), don't change anything
      update: {}, // Already purchased — no update needed
    });

    // Return 200 OK — the purchase was confirmed and access is now granted
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log the error server-side so we can investigate (may be a Stripe API error)
    console.error('[chapter-purchase-confirm]', err);

    // Return a generic 500 — never expose Stripe error details to the client
    return serverError();
  }
}
