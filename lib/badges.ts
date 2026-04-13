export type BadgeType =
  | 'FIRST_STORY'
  | 'TEN_LIKES'
  | 'FIFTY_LIKES'
  | 'HUNDRED_LIKES'
  | 'HUNDRED_VIEWS'
  | 'THOUSAND_VIEWS'
  | 'TEN_STORIES'
  | 'FIRST_COMMENT';

export const BADGE_META: Record<BadgeType, { label: string; emoji: string; description: string }> = {
  FIRST_STORY:     { emoji: '✍️',  label: 'First Story',      description: 'Published your first story' },
  TEN_LIKES:       { emoji: '❤️',  label: '10 Likes',         description: 'Received 10 total likes' },
  FIFTY_LIKES:     { emoji: '🔥',  label: '50 Likes',         description: 'Received 50 total likes' },
  HUNDRED_LIKES:   { emoji: '💯',  label: '100 Likes',        description: 'Received 100 total likes' },
  HUNDRED_VIEWS:   { emoji: '👁',  label: '100 Views',        description: 'Reached 100 total views' },
  THOUSAND_VIEWS:  { emoji: '🌟',  label: '1K Views',         description: 'Reached 1,000 total views' },
  TEN_STORIES:     { emoji: '📚',  label: '10 Stories',       description: 'Published 10 stories' },
  FIRST_COMMENT:   { emoji: '💬',  label: 'Conversationalist', description: 'Left your first comment' },
};

import { prisma } from './prisma';

export async function checkAndAwardBadges(userId: number) {
  const [stories, likes, comments] = await Promise.all([
    prisma.story.findMany({ where: { authorId: userId, status: 'PUBLISHED' }, select: { views: true, _count: { select: { likes: true } } } }),
    prisma.like.count({ where: { story: { authorId: userId } } }),
    prisma.comment.count({ where: { userId } }),
  ]);

  const totalViews = stories.reduce((s, st) => s + st.views, 0);
  const storyCount = stories.length;

  const toAward: BadgeType[] = [];

  if (storyCount >= 1)   toAward.push('FIRST_STORY');
  if (storyCount >= 10)  toAward.push('TEN_STORIES');
  if (likes >= 10)       toAward.push('TEN_LIKES');
  if (likes >= 50)       toAward.push('FIFTY_LIKES');
  if (likes >= 100)      toAward.push('HUNDRED_LIKES');
  if (totalViews >= 100) toAward.push('HUNDRED_VIEWS');
  if (totalViews >= 1000) toAward.push('THOUSAND_VIEWS');
  if (comments >= 1)     toAward.push('FIRST_COMMENT');

  for (const type of toAward) {
    await prisma.userBadge.upsert({
      where: { userId_type: { userId, type } },
      update: {},
      create: { userId, type },
    }).catch(() => {});
  }
}
