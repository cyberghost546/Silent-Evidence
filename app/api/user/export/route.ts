// app/api/user/export/route.ts
//
// GET — returns everything we hold about the signed-in user as a JSON download.
//
// WHY THIS EXISTS
// ---------------
// GDPR Art. 15 gives a person the right to a copy of their personal data, and
// Art. 20 the right to receive it "in a structured, commonly used and
// machine-readable format". The privacy policy already promised readers they
// could "access the personal data we hold about you", but nothing implemented
// it — the only self-service control was Delete Account, which is the opposite
// right. CCPA/CPRA §1798.100 and the UK GDPR carry an equivalent obligation.
//
// SCOPE
// -----
// This returns the requester's own data only, keyed off their session. It is
// deliberately not an admin tool for exporting somebody else's account.
//
// WHAT IS EXCLUDED, AND WHY
//   - password: a bcrypt hash is our credential material, not user-facing data,
//     and echoing it back weakens the account for no benefit to the reader.
//   - Two-factor codes, password-reset and email-verification tokens: live
//     security credentials. Handing them out through an export would turn a
//     stolen session into full account takeover.
//   - Other people's personal data: a direct message has two parties, so
//     messages are reduced to the counterparty's username and the content the
//     user themselves can already see in the UI. Art. 15(4) is explicit that the
//     right of access must not adversely affect the rights of others.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { unauthorized, serverError } from '@/lib/apiError';

export async function GET() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;
  if (!userId) return unauthorized();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        // ── Account ───────────────────────────────────────────────────────────
        id: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        isVerified: true,
        isPrivate: true,
        createdAt: true,
        updatedAt: true,
        dateOfBirth: true,
        ageGroup: true,

        // ── Profile ───────────────────────────────────────────────────────────
        profile: true,

        // ── Content the user created ──────────────────────────────────────────
        stories: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            excerpt: true,
            status: true,
            language: true,
            mood: true,
            warnings: true,
            contentRating: true,
            views: true,
            price: true,
            createdAt: true,
            updatedAt: true,
            category: { select: { name: true } },
            tags: { select: { name: true } },
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            story: { select: { title: true, slug: true } },
          },
        },

        // ── Interactions ──────────────────────────────────────────────────────
        likes: { select: { createdAt: true, story: { select: { title: true, slug: true } } } },
        bookmarks: { select: { createdAt: true, story: { select: { title: true, slug: true } } } },
        reactions: {
          select: { type: true, createdAt: true, story: { select: { title: true, slug: true } } },
        },
        scareRatings: { select: { rating: true, story: { select: { title: true, slug: true } } } },

        // ── Reading behaviour ─────────────────────────────────────────────────
        // Included because it is behavioural data about the person, which is
        // exactly what Art. 15 is aimed at — not just the content they typed.
        readingHistory: {
          select: { readAt: true, progress: true, story: { select: { title: true, slug: true } } },
        },
        readingStreak: true,
        writingStreak: true,
        readingGoal: true,

        // ── Social graph ──────────────────────────────────────────────────────
        following: { select: { createdAt: true, following: { select: { username: true } } } },
        followers: { select: { createdAt: true, follower: { select: { username: true } } } },

        // ── Recognition ───────────────────────────────────────────────────────
        badges: { select: { type: true, awardedAt: true } },

        // ── Commerce ──────────────────────────────────────────────────────────
        // Amounts and dates only. Card details never touch this database —
        // Stripe holds them — so there is nothing further to export here.
        storyPurchases: {
          select: { amount: true, createdAt: true, story: { select: { title: true } } },
        },
        tipsSent: { select: { amount: true, createdAt: true } },
        tipsReceived: { select: { amount: true, createdAt: true } },
        subscription: { select: { status: true, currentPeriodEnd: true, createdAt: true } },
        authorSubscription: { select: { status: true, currentPeriodEnd: true, createdAt: true } },
      },
    });

    if (!user) return unauthorized();

    // Messages are fetched separately so each side can be reduced to the
    // counterparty's username — see the note on Art. 15(4) above.
    const [sent, received] = await Promise.all([
      prisma.directMessage.findMany({
        where: { senderId: userId },
        select: { content: true, createdAt: true, receiver: { select: { username: true } } },
      }),
      prisma.directMessage.findMany({
        where: { receiverId: userId },
        select: { content: true, createdAt: true, sender: { select: { username: true } } },
      }),
    ]);

    const payload = {
      export: {
        generatedAt: new Date().toISOString(),
        service: 'Silent Evidence',
        subject: user.username,
        // Named so the reader knows what they are looking at if they open the
        // file months later, and so a receiving service can identify the format.
        format: 'silent-evidence-account-export-v1',
        notes:
          'Contains the personal data held for this account. Password hashes, ' +
          'two-factor secrets and reset tokens are deliberately excluded as ' +
          'security credentials. Payment card details are held by Stripe and ' +
          'never stored here.',
      },
      account: user,
      directMessages: { sent, received },
    };

    const filename = `silent-evidence-export-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // This is personal data: never let a shared cache hold a copy.
        'Cache-Control': 'no-store, private',
      },
    });
  } catch (err) {
    console.error('[GET /api/user/export]', err);
    return serverError();
  }
}
