export type BadgeType =
  | 'FIRST_STORY'
  | 'TEN_LIKES'
  | 'FIFTY_LIKES'
  | 'HUNDRED_LIKES'
  | 'HUNDRED_VIEWS'
  | 'THOUSAND_VIEWS'
  | 'TEN_STORIES'
  | 'FIRST_COMMENT'
  | 'CHALLENGE_ENTERED'
  | 'BINGO_COMPLETE';

export const BADGE_META: Record<BadgeType, { label: string; emoji: string; description: string }> = {
  FIRST_STORY:      { emoji: '✍️',  label: 'First Story',       description: 'Published your first story' },
  TEN_LIKES:        { emoji: '❤️',  label: '10 Likes',          description: 'Received 10 total likes' },
  FIFTY_LIKES:      { emoji: '🔥',  label: '50 Likes',          description: 'Received 50 total likes' },
  HUNDRED_LIKES:    { emoji: '💯',  label: '100 Likes',         description: 'Received 100 total likes' },
  HUNDRED_VIEWS:    { emoji: '👁',  label: '100 Views',         description: 'Reached 100 total views' },
  THOUSAND_VIEWS:   { emoji: '🌟',  label: '1K Views',          description: 'Reached 1,000 total views' },
  TEN_STORIES:      { emoji: '📚',  label: '10 Stories',        description: 'Published 10 stories' },
  FIRST_COMMENT:    { emoji: '💬',  label: 'Conversationalist', description: 'Left your first comment' },
  CHALLENGE_ENTERED:{ emoji: '⚔️',  label: 'Challenger',        description: 'Entered your first writing challenge' },
  BINGO_COMPLETE:   { emoji: '🎯',  label: 'Bingo!',            description: 'Completed a bingo line on a horror bingo card' },
};

import { prisma } from './prisma';

// Silently upsert a single badge — safe to call even if it already exists.
export async function awardBadge(userId: number, type: BadgeType): Promise<void> {
  await prisma.userBadge.upsert({
    where: { userId_type: { userId, type } },
    update: {},
    create: { userId, type },
  }).catch(() => {});
}

export async function checkAndAwardBadges(userId: number) {
  const [stories, likes, comments, challengeEntries] = await Promise.all([
    prisma.story.findMany({ where: { authorId: userId, status: 'PUBLISHED' }, select: { views: true, _count: { select: { likes: true } } } }),
    prisma.like.count({ where: { story: { authorId: userId } } }),
    prisma.comment.count({ where: { userId } }),
    prisma.challengeEntry.count({ where: { userId } }),
  ]);

  const totalViews = stories.reduce((s, st) => s + st.views, 0);
  const storyCount = stories.length;

  const toAward: BadgeType[] = [];

  if (storyCount >= 1)       toAward.push('FIRST_STORY');
  if (storyCount >= 10)      toAward.push('TEN_STORIES');
  if (likes >= 10)           toAward.push('TEN_LIKES');
  if (likes >= 50)           toAward.push('FIFTY_LIKES');
  if (likes >= 100)          toAward.push('HUNDRED_LIKES');
  if (totalViews >= 100)     toAward.push('HUNDRED_VIEWS');
  if (totalViews >= 1000)    toAward.push('THOUSAND_VIEWS');
  if (comments >= 1)         toAward.push('FIRST_COMMENT');
  if (challengeEntries >= 1) toAward.push('CHALLENGE_ENTERED');

  for (const type of toAward) {
    await awardBadge(userId, type);
  }
}

// BINGO_COMPLETE lines — the 12 winning lines for a 5×5 grid
// (5 rows + 5 columns + 2 diagonals)
const BINGO_LINES: number[][] = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // rows
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // cols
  [0,6,12,18,24],[4,8,12,16,20],                                                // diagonals
];

// Check whether the given set of checked cell indexes contains any winning line.
export function hasBingoLine(checkedIndexes: number[]): boolean {
  const set = new Set(checkedIndexes);
  return BINGO_LINES.some((line) => line.every((i) => set.has(i)));
}
