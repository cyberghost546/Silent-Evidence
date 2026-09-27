// app/api/stripe/webhook/route.ts
// This is the most critical Stripe route — Stripe calls it asynchronously whenever
// a payment event occurs (checkout completed, subscription updated, payment failed, etc.).
// It is the ONLY place where we write payment-related records to the database,
// because we only trust Stripe's confirmation — not the client redirect — as proof
// that money changed hands.
//
// IMPORTANT: Stripe signs every webhook request with STRIPE_WEBHOOK_SECRET so we can
// verify the payload hasn't been tampered with.  We MUST read the raw body bytes
// (not parsed JSON) for the signature verification to work.  In Next.js App Router,
// we achieve this by calling `request.text()` before passing the body to
// `stripe.webhooks.constructEvent()`.
//
// Next.js App Router does NOT use the Pages Router `export const config` pattern,
// so there is no `bodyParser: false` needed here — the App Router never auto-parses
// the body unless you call request.json() yourself.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { recordFunnelEvent } from '@/lib/funnel';
import Stripe from 'stripe';

// ── Subscription table routing ───────────────────────────────────────────────
// There are two independent subscription products, stored in two tables:
//   Subscription       — the reader membership
//   AuthorSubscription — Author Pro, the writer plan
//
// Stripe's lifecycle events (updated / deleted / payment_failed) identify a
// subscription only by its Stripe ID and say nothing about which product it is,
// so every one of those handlers has to look in both tables. Before Author Pro
// existed these handlers checked Subscription alone; leaving them that way would
// mean a cancelled or unpaid Author Pro plan silently stayed "active" in our DB
// forever, because the lookup would miss and the handler would skip.
type SubKind = 'reader' | 'author';

// Stripe moved `current_period_end` from the subscription object down onto the
// individual subscription items in a recent API version. Both shapes still
// appear in the wild depending on the account's pinned version, so read
// whichever is present. Typed as a narrow structural shape rather than `any` so
// a typo in a field name is still a compile error.
type PeriodEndShape = {
  current_period_end?: number;
  items?: { data?: { current_period_end?: number }[] };
};

function readPeriodEnd(subscription: Stripe.Subscription): Date {
  const s = subscription as Stripe.Subscription & PeriodEndShape;
  const seconds = s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? 0;
  return new Date(seconds * 1000);
}

async function findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubKind | null> {
  const reader = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { id: true },
  });
  if (reader) return 'reader';

  const author = await prisma.authorSubscription.findUnique({
    where: { stripeSubscriptionId },
    select: { id: true },
  });
  if (author) return 'author';

  return null;
}

/** Applies the same update to whichever of the two tables owns this subscription. */
async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  kind: SubKind,
  data: { status?: string; currentPeriodEnd?: Date }
) {
  if (kind === 'reader') {
    await prisma.subscription.update({ where: { stripeSubscriptionId }, data });
  } else {
    await prisma.authorSubscription.update({ where: { stripeSubscriptionId }, data });
  }
}

export async function POST(request: NextRequest) {
  // Read the raw request body as a string — required for Stripe signature verification.
  // If we parsed it as JSON first, the byte layout would change and the HMAC check
  // would fail with a "No signatures found matching the expected signature" error.
  const rawBody = await request.text();

  // The `stripe-signature` header is added by Stripe on every webhook request.
  // It contains a timestamp and HMAC signatures we use to verify authenticity.
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    // No signature header means this request didn't come from Stripe
    console.error('[webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // constructEvent verifies the HMAC signature using our webhook secret.
    // It throws if the signature is invalid, the timestamp is too old (replay attack),
    // or the body has been modified in transit.
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    // Log the error but don't expose details to the caller — just return 400
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Route each event type to its handler.
  // We use a try/catch inside each case so a failure in one handler doesn't
  // prevent us from returning 200 — Stripe will retry any non-200 response,
  // which could cause duplicate records if not handled carefully.
  try {
    switch (event.type) {
      // ---------------------------------------------------------------
      // checkout.session.completed
      // Fires when a user successfully completes the Stripe checkout flow.
      // This is where we create Tip records, StoryPurchase records, or
      // activate a new subscription depending on the session's metadata.type.
      // ---------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};

        if (meta.type === 'tip') {
          // ---- TIP PAYMENT ----
          // A reader sent a tip to an author.  Create the Tip record now that
          // Stripe has confirmed the payment went through.
          const fromUserId = parseInt(meta.fromUserId, 10);
          const toUserId = parseInt(meta.toUserId, 10);
          const amount = parseInt(meta.amount, 10);

          await prisma.tip.create({
            data: {
              fromUserId,
              toUserId,
              amount,
              message: meta.message || null,
              // payment_intent is set on one-time payments; link it for audit trails
              stripePaymentIntentId: (session.payment_intent as string) ?? null,
            },
          });

          console.log(
            `[webhook] Tip recorded: $${amount / 100} from user ${fromUserId} to user ${toUserId}`
          );
        } else if (meta.bundleId) {
          // ---- BUNDLE PURCHASE ----
          const userId = parseInt(meta.userId, 10);
          const bundleId = parseInt(meta.bundleId, 10);
          const paidCents = session.amount_total ?? 0;

          await prisma.bundlePurchase.upsert({
            where: { userId_bundleId: { userId, bundleId } },
            create: { userId, bundleId, paidCents },
            update: {},
          });

          console.log(
            `[webhook] Bundle purchase recorded: user ${userId} bought bundle ${bundleId}`
          );
        } else if (meta.type === 'story_purchase') {
          // ---- STORY PURCHASE ----
          // A reader bought access to a paid story.  Create the StoryPurchase row
          // so the story page can check it and unlock the full content.
          // The unique constraint on (userId, storyId) prevents double-recording
          // if Stripe delivers the event more than once (idempotency).
          const userId = parseInt(meta.userId, 10);
          const storyId = parseInt(meta.storyId, 10);
          const amount = parseInt(meta.amount, 10);

          // upsert instead of create so duplicate webhook deliveries don't throw
          await prisma.storyPurchase.upsert({
            where: { userId_storyId: { userId, storyId } },
            create: {
              userId,
              storyId,
              amount,
              stripePaymentIntentId: (session.payment_intent as string) ?? null,
            },
            // If the row already exists (duplicate webhook), just leave it alone
            update: {},
          });

          console.log(`[webhook] Story purchase recorded: user ${userId} bought story ${storyId}`);
        } else if (meta.type === 'chapter_purchase') {
          // ---- CHAPTER PURCHASE ----
          // A reader bought access to a paid chapter within a chaptered story.
          // Creates a ChapterPurchase record so the chapter page can unlock content.
          const userId = parseInt(meta.userId, 10);
          const chapterId = parseInt(meta.chapterId, 10);
          const amount = parseInt(meta.amount, 10);

          await prisma.chapterPurchase.upsert({
            where: { userId_chapterId: { userId, chapterId } },
            create: {
              userId,
              chapterId,
              amount,
              stripePaymentIntentId: (session.payment_intent as string) ?? null,
            },
            update: {},
          });

          console.log(
            `[webhook] Chapter purchase recorded: user ${userId} bought chapter ${chapterId}`
          );
        } else if (meta.type === 'author_subscription') {
          // ---- AUTHOR PRO SUBSCRIPTION ----
          // A writer bought the Author Pro plan. This writes AuthorSubscription,
          // NOT Subscription — they are separate products and a user may hold
          // both. This branch must stay ABOVE the catch-all `else` below, which
          // assumes any unlabelled subscription session is a reader membership.
          const userId = parseInt(meta.userId, 10);
          const plan = meta.plan ?? 'monthly';
          const stripeCustomerId = session.customer as string;
          const stripeSubscriptionId = session.subscription as string;

          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const authorPeriodEnd = readPeriodEnd(stripeSubscription);

          await prisma.authorSubscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId,
              stripeSubscriptionId,
              status: 'active',
              plan,
              currentPeriodEnd: authorPeriodEnd,
            },
            update: {
              stripeCustomerId,
              stripeSubscriptionId,
              status: 'active',
              plan,
              currentPeriodEnd: authorPeriodEnd,
            },
          });

          console.log(`[webhook] Author Pro activated for user ${userId}, plan: ${plan}`);
        } else {
          // ---- SUBSCRIPTION CHECKOUT ----
          // No metadata.type means this was a subscription checkout (premium membership).
          // We need to link the Stripe customer/subscription IDs to the user's
          // Subscription row in our DB and mark it active.
          const userId = parseInt(meta.userId, 10);
          const plan = meta.plan ?? 'monthly';
          const stripeCustomerId = session.customer as string;

          // The subscription object isn't embedded in the session — we retrieve
          // it from Stripe using the subscription ID on the session.
          const stripeSubscriptionId = session.subscription as string;

          // Fetch the full subscription from Stripe so we can store the billing period end
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

          // upsert: create a new Subscription row if none exists, or update the
          // existing one (e.g. the user is re-subscribing after canceling)
          // Cast to any because current_period_end moved in newer Stripe SDK versions
          const subAny = stripeSubscription as any;
          const periodEnd = new Date(
            (subAny.current_period_end ?? subAny.items?.data?.[0]?.current_period_end ?? 0) * 1000
          );

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId,
              stripeSubscriptionId,
              status: 'active',
              plan,
              currentPeriodEnd: periodEnd,
            },
            update: {
              stripeCustomerId,
              stripeSubscriptionId,
              status: 'active',
              plan,
              currentPeriodEnd: periodEnd,
            },
          });

          // Funnel stage 4 — the only place a subscription is genuinely
          // confirmed. Recorded here rather than on the success page because
          // the redirect proves nothing about whether money moved.
          recordFunnelEvent('subscribed', userId, plan).catch(() => {});

          console.log(`[webhook] Subscription activated for user ${userId}, plan: ${plan}`);
        }
        break;
      }

      // ---------------------------------------------------------------
      // customer.subscription.updated
      // Fires when a subscription changes — plan upgrade, renewal, status
      // flip (e.g. past_due → active after a retry succeeds), etc.
      // We sync the status and new period-end date to keep our DB in step
      // with Stripe's source of truth.
      // ---------------------------------------------------------------
      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription;

        // Find our DB row by the Stripe subscription ID — in either table
        const kind = await findSubscriptionByStripeId(stripeSubscription.id);

        if (!kind) {
          // This can happen if the subscription was created outside our app
          // (e.g. manually in the Stripe dashboard). Log and skip gracefully.
          console.warn(`[webhook] subscription.updated — no DB row for ${stripeSubscription.id}`);
          break;
        }

        // Map Stripe's subscription status directly to our DB status field.
        // Stripe statuses: active, past_due, canceled, unpaid, trialing, paused, incomplete
        // Cast to any for current_period_end — moved in newer Stripe SDK versions
        const subAny2 = stripeSubscription as any;
        const periodEnd2 = new Date(
          (subAny2.current_period_end ?? subAny2.items?.data?.[0]?.current_period_end ?? 0) * 1000
        );

        await updateSubscriptionByStripeId(stripeSubscription.id, kind, {
          status: stripeSubscription.status,
          currentPeriodEnd: periodEnd2,
        });

        console.log(
          `[webhook] ${kind} subscription updated: ${stripeSubscription.id} → ${stripeSubscription.status}`
        );
        break;
      }

      // ---------------------------------------------------------------
      // customer.subscription.deleted
      // Fires when a subscription is fully canceled and ended on Stripe.
      // This includes both immediate cancellations and end-of-period ones.
      // ---------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;

        // Find and update the matching DB row by Stripe subscription ID
        const kind = await findSubscriptionByStripeId(stripeSubscription.id);

        if (!kind) {
          console.warn(`[webhook] subscription.deleted — no DB row for ${stripeSubscription.id}`);
          break;
        }

        await updateSubscriptionByStripeId(stripeSubscription.id, kind, {
          status: 'canceled',
        });

        console.log(`[webhook] ${kind} subscription canceled: ${stripeSubscription.id}`);
        break;
      }

      // ---------------------------------------------------------------
      // invoice.payment_failed
      // Fires when Stripe tries to charge the customer for a renewal and
      // the payment fails (expired card, insufficient funds, etc.).
      // We mark the subscription past_due so the UI can prompt the user
      // to update their payment method.
      // ---------------------------------------------------------------
      case 'invoice.payment_failed': {
        // Cast to any because the Stripe SDK type for Invoice changed in newer
        // versions (subscription moved to parent), but the field still exists at runtime.
        const invoice = event.data.object as any;

        // An invoice is linked to a subscription via its subscription field.
        // Skip if this is a one-off invoice (no subscription attached).
        if (!invoice.subscription) {
          console.log('[webhook] invoice.payment_failed — not a subscription invoice, skipping');
          break;
        }

        const stripeSubscriptionId = invoice.subscription as string;

        // Find the matching subscription row in our DB — in either table
        const kind = await findSubscriptionByStripeId(stripeSubscriptionId);

        if (!kind) {
          console.warn(
            `[webhook] invoice.payment_failed — no DB row for subscription ${stripeSubscriptionId}`
          );
          break;
        }

        // Mark the subscription as past_due — the frontend can use this to
        // show a "please update your payment method" banner. For Author Pro this
        // also revokes the toolset, since past_due is not a live status.
        await updateSubscriptionByStripeId(stripeSubscriptionId, kind, {
          status: 'past_due',
        });

        console.log(`[webhook] ${kind} subscription marked past_due: ${stripeSubscriptionId}`);
        break;
      }

      // ---------------------------------------------------------------
      // All other event types
      // Stripe sends many other events (e.g. charge.succeeded, invoice.paid).
      // We don't need to handle them but we acknowledge receipt so Stripe
      // doesn't mark the delivery as failed and retry endlessly.
      // ---------------------------------------------------------------
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (handlerError) {
    // Log the error but still return 200 to prevent Stripe from retrying.
    // If we return non-200, Stripe will retry the event repeatedly, which
    // could cause duplicate DB writes once the error is fixed.
    console.error(`[webhook] Handler error for event ${event.type}:`, handlerError);
  }

  // Always return 200 so Stripe knows we received the event successfully.
  // Stripe considers any 2xx response as a successful delivery.
  return NextResponse.json({ received: true }, { status: 200 });
}
