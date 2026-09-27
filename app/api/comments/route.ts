// POST /api/comments — add a comment or reply
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { checkAndAwardBadges } from '@/lib/badges';
import { notifyNewComment, notifyCommentReply } from '@/lib/notifyEmail';
import { checkToxicity } from '@/lib/toxicityCheck';
import { sendPushToUser } from '@/lib/webpush';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyCsrfToken } from '@/lib/csrf';
import { z } from 'zod';

const CreateCommentSchema = z.object({
  storyId: z.number().int().positive('A valid story ID is required.'),
  content: z
    .string()
    .min(1, 'Comment cannot be empty.')
    .max(2000, 'Comment is too long (max 2000 characters).'),
  parentId: z.number().int().positive().nullable().optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(ip, 'comments', { limit: 10, windowMs: 60 * 1000 });
  if (rl.blocked)
    return NextResponse.json({ error: 'Too many comments — slow down.' }, { status: 429 });

  if (!(await verifyCsrfToken(req))) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const rawBody = await req.json();
  const parsed = CreateCommentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { storyId, content: rawContent, parentId } = parsed.data;
  const content = rawContent.trim();

  // AI toxicity check — reject hate speech and harassment before saving
  const toxicity = await checkToxicity(content);
  if (toxicity.flagged) {
    return NextResponse.json(
      {
        error: 'Your comment was flagged for potentially harmful content and could not be posted.',
      },
      { status: 422 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      storyId,
      userId,
      content: content,
      parentId: parentId ?? null,
    },
    include: {
      user: { select: { username: true, profile: { select: { avatar: true } } } },
      replies: {
        include: { user: { select: { username: true, profile: { select: { avatar: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const commenter = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (parentId) {
    // Reply — notify the parent comment's author (in-app + email)
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { userId: true, story: { select: { title: true, slug: true } } },
    });
    if (parent && parent.userId !== userId) {
      prisma.notification
        .create({
          data: {
            userId: parent.userId,
            type: 'REPLY',
            message: `${commenter?.username ?? 'Someone'} replied to your comment.`,
            storyId,
          },
        })
        .catch(() => {});

      // Email the parent comment author
      prisma.user
        .findUnique({ where: { id: parent.userId }, select: { email: true, username: true } })
        .then((parentUser) => {
          if (parentUser && commenter && parent.story) {
            notifyCommentReply({
              toEmail: parentUser.email,
              toUsername: parentUser.username,
              replierUsername: commenter.username,
              storyTitle: parent.story.title,
              storySlug: parent.story.slug,
              replyExcerpt: content,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  } else {
    // Top-level comment — notify story author (in-app + email)
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true, title: true, slug: true },
    });
    if (story && story.authorId !== userId) {
      prisma.notification
        .create({
          data: {
            userId: story.authorId,
            type: 'COMMENT',
            message: `${commenter?.username ?? 'Someone'} commented on your story.`,
            storyId,
          },
        })
        .catch(() => {});

      // Email + push the story author
      prisma.user
        .findUnique({ where: { id: story.authorId }, select: { email: true, username: true } })
        .then((storyAuthor) => {
          if (storyAuthor && commenter) {
            notifyNewComment({
              toEmail: storyAuthor.email,
              toUsername: storyAuthor.username,
              commenterUsername: commenter.username,
              storyTitle: story.title,
              storySlug: story.slug,
              commentExcerpt: content,
            }).catch(() => {});

            sendPushToUser(story.authorId, {
              title: `New comment on "${story.title}"`,
              body: `${commenter.username}: ${content.slice(0, 80)}`,
              url: `/story/${story.slug}#comments`,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }

  // Detect @mentions in the comment text and notify each mentioned user.
  // A mention is any @word that matches an existing username.
  const mentionHandles = [
    ...new Set((content.match(/@(\w+)/g) ?? []).map((m: string) => m.slice(1).toLowerCase())),
  ] as string[];
  if (mentionHandles.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: mentionHandles } },
      select: { id: true },
    });
    for (const mu of mentionedUsers) {
      // Don't notify yourself, and don't double-notify story author/parent author
      if (mu.id === userId) continue;
      prisma.notification
        .create({
          data: {
            userId: mu.id,
            type: 'MENTION',
            message: `${commenter?.username ?? 'Someone'} mentioned you in a comment.`,
            storyId,
          },
        })
        .catch(() => {});
    }
  }

  // Award badges to the commenter (FIRST_COMMENT)
  checkAndAwardBadges(userId).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
}
