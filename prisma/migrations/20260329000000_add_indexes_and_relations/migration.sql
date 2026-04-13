-- Add named indexes to replace Prisma's auto-generated foreign key indexes
-- Comment_parentId_idx and Comment_userId_idx already applied from prior partial run

-- Follow: replace followingId_fkey with named index
CREATE INDEX `Follow_followingId_idx` ON `Follow`(`followingId`);
DROP INDEX `Follow_followingId_fkey` ON `follow`;

-- ForumPost: replace authorId_fkey with named index
CREATE INDEX `ForumPost_authorId_idx` ON `ForumPost`(`authorId`);
DROP INDEX `ForumPost_authorId_fkey` ON `forumpost`;

-- LastWord: replace userId_fkey with named index
CREATE INDEX `LastWord_userId_idx` ON `LastWord`(`userId`);
DROP INDEX `LastWord_userId_fkey` ON `lastword`;

-- Like: replace storyId_fkey with named index
CREATE INDEX `Like_storyId_idx` ON `Like`(`storyId`);
DROP INDEX `Like_storyId_fkey` ON `like`;

-- PushSubscription: replace userId_fkey with named index
CREATE INDEX `PushSubscription_userId_idx` ON `PushSubscription`(`userId`);
DROP INDEX `PushSubscription_userId_fkey` ON `pushsubscription`;

-- Reaction: replace storyId_fkey with named index
CREATE INDEX `Reaction_storyId_idx` ON `Reaction`(`storyId`);
DROP INDEX `Reaction_storyId_fkey` ON `reaction`;

-- ReadingHistory: replace storyId_fkey with named index
CREATE INDEX `ReadingHistory_storyId_idx` ON `ReadingHistory`(`storyId`);
DROP INDEX `ReadingHistory_storyId_fkey` ON `readinghistory`;

-- Series: replace authorId_fkey with named index
CREATE INDEX `Series_authorId_idx` ON `Series`(`authorId`);
DROP INDEX `Series_authorId_fkey` ON `series`;

-- Story: replace authorId_fkey and categoryId_fkey with named indexes
CREATE INDEX `Story_authorId_idx` ON `Story`(`authorId`);
DROP INDEX `Story_authorId_fkey` ON `story`;
CREATE INDEX `Story_categoryId_idx` ON `Story`(`categoryId`);
DROP INDEX `Story_categoryId_fkey` ON `story`;

-- StoryDare: replace receiverId_fkey and senderId_fkey with named indexes
CREATE INDEX `StoryDare_receiverId_idx` ON `StoryDare`(`receiverId`);
DROP INDEX `StoryDare_receiverId_fkey` ON `storydare`;
CREATE INDEX `StoryDare_senderId_idx` ON `StoryDare`(`senderId`);
DROP INDEX `StoryDare_senderId_fkey` ON `storydare`;

-- Tip: replace fromUserId_fkey with named index
CREATE INDEX `Tip_fromUserId_idx` ON `Tip`(`fromUserId`);
DROP INDEX `Tip_fromUserId_fkey` ON `tip`;
