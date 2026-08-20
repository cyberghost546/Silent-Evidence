// tests/stripe-webhook.test.ts
// Tests for POST /api/stripe/webhook — the Stripe payment event handler.
// Stripe SDK and Prisma are mocked; we construct fake Stripe events to verify
// each payment path writes the correct DB records.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tip: { create: vi.fn() },
    storyPurchase: { upsert: vi.fn() },
    bundlePurchase: { upsert: vi.fn() },
    chapterPurchase: { upsert: vi.fn() },
    subscription: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(() =>
        Promise.resolve({ id: 'sub_123', current_period_end: 9999999999, items: { data: [] } })
      ),
    },
  },
}));

import { POST as webhookPost } from '@/app/api/stripe/webhook/route';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// The route is typed to take a NextRequest but only uses .text() and .headers,
// both of which a plain Request provides. Build a real NextRequest so the call
// type-checks without weakening the route's signature.
function makeWebhookRequest(body = '{}', signature = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body,
  });
}

function mockEvent(type: string, data: object) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
    type,
    data: { object: data },
  } as any);
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.mocked(prisma.tip.create).mockResolvedValue({} as any);
    vi.mocked(prisma.storyPurchase.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.bundlePurchase.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });
    const res = await webhookPost(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementationOnce(() => {
      throw new Error('Signature mismatch');
    });
    const res = await webhookPost(makeWebhookRequest());
    expect(res.status).toBe(400);
  });

  it('records a tip on checkout.session.completed with type=tip', async () => {
    mockEvent('checkout.session.completed', {
      metadata: { type: 'tip', fromUserId: '2', toUserId: '3', amount: '500' },
      payment_intent: 'pi_abc',
    });
    const res = await webhookPost(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(prisma.tip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromUserId: 2, toUserId: 3, amount: 500 }),
      })
    );
  });

  it('records a story purchase on checkout.session.completed with type=story_purchase', async () => {
    mockEvent('checkout.session.completed', {
      metadata: { type: 'story_purchase', userId: '1', storyId: '7', amount: '299' },
      payment_intent: 'pi_xyz',
    });
    const res = await webhookPost(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(prisma.storyPurchase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_storyId: { userId: 1, storyId: 7 } },
        create: expect.objectContaining({ userId: 1, storyId: 7, amount: 299 }),
      })
    );
  });

  it('records a bundle purchase on checkout.session.completed with bundleId metadata', async () => {
    mockEvent('checkout.session.completed', {
      metadata: { userId: '1', bundleId: '4' },
      amount_total: 999,
    });
    const res = await webhookPost(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(prisma.bundlePurchase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_bundleId: { userId: 1, bundleId: 4 } },
      })
    );
  });

  it('activates subscription on checkout.session.completed without type', async () => {
    mockEvent('checkout.session.completed', {
      metadata: { userId: '1', plan: 'monthly' },
      customer: 'cus_123',
      subscription: 'sub_123',
    });
    const res = await webhookPost(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1 },
        create: expect.objectContaining({ status: 'active', plan: 'monthly' }),
      })
    );
  });

  it('returns 200 for unhandled event types (graceful no-op)', async () => {
    mockEvent('payment_intent.created', {});
    const res = await webhookPost(makeWebhookRequest());
    expect(res.status).toBe(200);
  });
});
