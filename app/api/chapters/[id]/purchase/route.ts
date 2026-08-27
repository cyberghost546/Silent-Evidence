// app/api/chapters/[id]/purchase/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file handles two endpoints for purchasing a single premium chapter:
//
//   GET  /api/chapters/[id]/purchase — checks whether the logged-in user has
//                                       already purchased this chapter.
//                                       Returns { purchased: true | false }.
//                                       Guests also get { purchased: false }.
//
//   POST /api/chapters/[id]/purchase — creates a Stripe PaymentIntent for the
//                                       chapter's price and returns its clientSecret.
//                                       The frontend uses the clientSecret to render
//                                       Stripe's payment UI and process the card.
//
// After a successful payment, the frontend calls the /confirm endpoint (in the
// confirm/route.ts file) to create the purchase record in our database.
// ─────────────────────────────────────────────────────────────────────────────

// Import NextResponse to build JSON HTTP responses in Next.js API routes
import { NextResponse } from 'next/server';

// Import cookies() to read the session cookie and identify the logged-in user
import { cookies } from 'next/headers';

// Import the Prisma database client to check purchases and load chapter details
import { prisma } from '@/lib/prisma';

// Import the configured Stripe client to create PaymentIntents
import { stripe } from '@/lib/stripe';

// Import pre-built error response helpers for consistent HTTP error responses:
// unauthorized — 401 when the user is not logged in
// notFound     — 404 when the chapter doesn't exist
// badRequest   — 400 for invalid states (free chapter, already purchased, etc.)
// serverError  — 500 for unexpected failures
import { unauthorized, notFound, badRequest, serverError } from '@/lib/apiError';

// Next.js App Router passes dynamic route segments (e.g. [id]) through a params Promise.
// We declare the type so TypeScript knows what the resolved params object looks like.
type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/chapters/[id]/purchase ──────────────────────────────────────────
// Returns { purchased: boolean } indicating whether the current user has already
// purchased this chapter. Used by the reading page to decide whether to show
// the paywall or unlock the full chapter content.
// "_req" is unused — prefixed with _ to suppress TypeScript warnings.
export async function GET(_req: Request, { params }: Ctx) {
  // Await the params Promise to get the chapter ID string from the URL segment
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const chapterId = Number(id);

  // Read the session cookie to identify the logged-in user
  const c = await cookies();

  // Extract the userId from the 'userId' cookie; fall back to 0 if missing.
  // Number() converts the string value to an integer.
  // || null converts 0 (missing cookie) to null for a clean falsy check.
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // Guests (no userId) have not purchased anything — return false immediately
  // without hitting the database (no login = no purchase records to check)
  if (!userId) return NextResponse.json({ purchased: false });

  // Check if a purchase record exists for this specific user + chapter combination.
  // The composite unique constraint userId_chapterId ensures at most one record per pair.
  const purchase = await prisma.chapterPurchase.findUnique({
    where: {
      // userId_chapterId is the auto-generated constraint name from @@unique([userId, chapterId])
      userId_chapterId: { userId, chapterId },
    },
  });

  // Return true if a purchase record was found, false if not.
  // !! (double negation) converts null → false and an object → true
  return NextResponse.json({ purchased: !!purchase });
}

// ── POST /api/chapters/[id]/purchase ─────────────────────────────────────────
// Creates a Stripe PaymentIntent for the chapter's price.
// Returns { clientSecret } which the frontend passes to Stripe's JS SDK
// to render the payment form and process the card.
// "_req" is unused — prefixed with _ to suppress TypeScript warnings.
export async function POST(_req: Request, { params }: Ctx) {
  // Await the params Promise to get the chapter ID string from the URL segment
  const { id } = await params;

  // Convert the URL string to an integer for the database query
  const chapterId = Number(id);

  // ── Auth check ────────────────────────────────────────────────────────────
  // Only logged-in users can purchase — guests need to register first
  // Auth required — only logged-in users can purchase
  const c = await cookies();

  // Extract and convert the userId from the session cookie
  const userId = Number(c.get('userId')?.value ?? 0) || null;

  // If userId is null, the user is not logged in — reject with 401 Unauthorized
  if (!userId) return unauthorized();

  try {
    // ── Load the chapter ──────────────────────────────────────────────────────
    // Fetch the chapter to get its price and title for the Stripe PaymentIntent metadata.
    // We also include the parent story's title for the payment receipt email.
    // Load chapter to get its price
    const chapter = await prisma.storyChapter.findUnique({
      where: { id: chapterId },

      select: {
        id: true, // the chapter's primary key
        title: true, // the chapter's display title (for metadata)
        price: true, // the chapter's price in cents (e.g. 199 = $1.99)
        story: { select: { title: true } }, // the parent story's title (for receipt email)
      },
    });

    // If no chapter was found with this ID, return 404
    if (!chapter) return notFound('Chapter not found.');

    // If the chapter has no price or a price of 0, it's free — no payment needed
    if (!chapter.price || chapter.price <= 0) return badRequest('This chapter is free.');

    // ── Duplicate purchase check ──────────────────────────────────────────────
    // Prevent creating a second PaymentIntent if the user already purchased this chapter
    // Check if already purchased
    const existing = await prisma.chapterPurchase.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
    });

    // If a purchase record already exists, the user already paid — no need for another
    if (existing) return badRequest('You have already purchased this chapter.');

    // ── Fetch user email for receipt ──────────────────────────────────────────
    // Stripe can send a receipt email if we pass the customer's email address.
    // We fetch it from the database rather than trusting what the client sends.
    // Fetch user's email for Stripe receipt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }, // we only need the email field
    });

    // ── Create the Stripe PaymentIntent ───────────────────────────────────────
    // A PaymentIntent represents the intent to collect a specific amount from a customer.
    // The frontend will use the returned clientSecret to confirm the payment using
    // the customer's card details via Stripe's Payment Element.
    // Create a Stripe PaymentIntent — the frontend will confirm it with the card details
    const paymentIntent = await stripe.paymentIntents.create({
      amount: chapter.price, // Amount in cents — must match the chapter's price field
      currency: 'usd', // US dollars — change if you support other currencies

      // Send a receipt to the user's email after successful payment
      receipt_email: user?.email,

      // metadata is stored with the PaymentIntent in Stripe's dashboard and
      // used in the /confirm endpoint to verify the payment matches this chapter/user
      metadata: {
        type: 'chapter_purchase', // helps categorise payments in Stripe dashboard
        chapterId: String(chapterId), // store as string — Stripe metadata is strings only
        userId: String(userId), // the user who initiated the purchase
        chapterTitle: chapter.title, // human-readable label for Stripe dashboard
        storyTitle: chapter.story.title, // the parent story's title for context
      },

      // Let Stripe automatically show the best payment methods for the user's location
      automatic_payment_methods: { enabled: true },
    });

    // Return the clientSecret to the frontend.
    // The frontend passes this to stripe.confirmPayment() to collect card details and pay.
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    // Log the error server-side so we can investigate in the server logs
    console.error('[chapter-purchase]', err);

    // Return a generic 500 error — never expose Stripe internals to the client
    return serverError();
  }
}
