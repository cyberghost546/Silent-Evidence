-- CreateTable
CREATE TABLE `_storytags` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_StoryTags_AB_unique`(`A` ASC, `B` ASC),
    INDEX `_StoryTags_B_index`(`B` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `targetId` INTEGER NULL,
    `targetType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` INTEGER NOT NULL,

    INDEX `AuditLog_adminId_idx`(`adminId` ASC),
    INDEX `AuditLog_createdAt_idx`(`createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorqa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` TEXT NOT NULL,
    `answer` TEXT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `answeredAt` DATETIME(3) NULL,
    `authorId` INTEGER NOT NULL,
    `askerId` INTEGER NULL,

    INDEX `AuthorQA_askerId_fkey`(`askerId` ASC),
    INDEX `AuthorQA_authorId_createdAt_idx`(`authorId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bannedword` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BannedWord_word_idx`(`word` ASC),
    UNIQUE INDEX `BannedWord_word_key`(`word` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `battlevote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `votedFor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `battleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `BattleVote_battleId_userId_key`(`battleId` ASC, `userId` ASC),
    INDEX `BattleVote_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `betareaderinvite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `feedback` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `storyId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,

    INDEX `BetaReaderInvite_receiverId_fkey`(`receiverId` ASC),
    INDEX `BetaReaderInvite_senderId_fkey`(`senderId` ASC),
    UNIQUE INDEX `BetaReaderInvite_storyId_receiverId_key`(`storyId` ASC, `receiverId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bingocard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `templateId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `BingoCard_templateId_userId_key`(`templateId` ASC, `userId` ASC),
    INDEX `BingoCard_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bingocellcheck` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cellIndex` INTEGER NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cardId` INTEGER NOT NULL,

    UNIQUE INDEX `BingoCellCheck_cardId_cellIndex_key`(`cardId` ASC, `cellIndex` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bingotemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `cells` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blockeduser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `blockerId` INTEGER NOT NULL,
    `blockedId` INTEGER NOT NULL,

    INDEX `BlockedUser_blockedId_fkey`(`blockedId` ASC),
    UNIQUE INDEX `BlockedUser_blockerId_blockedId_key`(`blockerId` ASC, `blockedId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookclub` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPrivate` BOOLEAN NOT NULL DEFAULT true,
    `isPremium` BOOLEAN NOT NULL DEFAULT false,
    `inviteCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` INTEGER NULL,
    `ownerId` INTEGER NOT NULL,

    UNIQUE INDEX `BookClub_inviteCode_key`(`inviteCode` ASC),
    INDEX `BookClub_isPrivate_createdAt_idx`(`isPrivate` ASC, `createdAt` ASC),
    INDEX `BookClub_ownerId_idx`(`ownerId` ASC),
    INDEX `BookClub_storyId_fkey`(`storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookclubmember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clubId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `BookClubMember_clubId_idx`(`clubId` ASC),
    UNIQUE INDEX `BookClubMember_clubId_userId_key`(`clubId` ASC, `userId` ASC),
    INDEX `BookClubMember_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookmark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `Bookmark_storyId_idx`(`storyId` ASC),
    INDEX `Bookmark_userId_createdAt_idx`(`userId` ASC, `createdAt` ASC),
    UNIQUE INDEX `Bookmark_userId_storyId_key`(`userId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branchnode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` LONGTEXT NOT NULL,
    `choiceLabel` VARCHAR(191) NULL,
    `isEnding` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `storyId` INTEGER NOT NULL,
    `parentId` INTEGER NULL,

    INDEX `BranchNode_parentId_idx`(`parentId` ASC),
    INDEX `BranchNode_storyId_idx`(`storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bundlepurchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paidCents` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `bundleId` INTEGER NOT NULL,

    INDEX `BundlePurchase_bundleId_idx`(`bundleId` ASC),
    UNIQUE INDEX `BundlePurchase_userId_bundleId_key`(`userId` ASC, `bundleId` ASC),
    INDEX `BundlePurchase_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendarevent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT '?',
    `note` TEXT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CalendarEvent_date_idx`(`date` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_name_key`(`name` ASC),
    UNIQUE INDEX `Category_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chainstory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `maxSegments` INTEGER NOT NULL DEFAULT 20,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorId` INTEGER NOT NULL,

    INDEX `ChainStory_authorId_fkey`(`authorId` ASC),
    UNIQUE INDEX `ChainStory_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chainstorysegment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` LONGTEXT NOT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `votes` INTEGER NOT NULL DEFAULT 0,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `chainId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `ChainStorySegment_authorId_fkey`(`authorId` ASC),
    INDEX `ChainStorySegment_chainId_order_idx`(`chainId` ASC, `order` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `prompt` TEXT NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challengeentry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `votes` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `challengeId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ChallengeEntry_challengeId_userId_key`(`challengeId` ASC, `userId` ASC),
    INDEX `ChallengeEntry_storyId_fkey`(`storyId` ASC),
    INDEX `ChallengeEntry_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapterpurchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` INTEGER NOT NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `chapterId` INTEGER NOT NULL,

    INDEX `ChapterPurchase_chapterId_idx`(`chapterId` ASC),
    UNIQUE INDEX `ChapterPurchase_userId_chapterId_key`(`userId` ASC, `chapterId` ASC),
    INDEX `ChapterPurchase_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coauthorrequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `genres` VARCHAR(191) NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `CoauthorRequest_authorId_idx`(`authorId` ASC),
    INDEX `CoauthorRequest_isOpen_createdAt_idx`(`isOpen` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `flagged` BOOLEAN NOT NULL DEFAULT false,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,
    `parentId` INTEGER NULL,

    INDEX `Comment_parentId_idx`(`parentId` ASC),
    INDEX `Comment_storyId_createdAt_idx`(`storyId` ASC, `createdAt` ASC),
    INDEX `Comment_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commentreaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emoji` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `CommentReaction_commentId_idx`(`commentId` ASC),
    UNIQUE INDEX `CommentReaction_commentId_userId_emoji_key`(`commentId` ASC, `userId` ASC, `emoji` ASC),
    INDEX `CommentReaction_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `confession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NULL,

    INDEX `Confession_createdAt_idx`(`createdAt` ASC),
    INDEX `Confession_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `confessionreaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emoji` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confessionId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `ConfessionReaction_confessionId_idx`(`confessionId` ASC),
    UNIQUE INDEX `ConfessionReaction_confessionId_userId_emoji_key`(`confessionId` ASC, `userId` ASC, `emoji` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contactmessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cookieconsent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `choice` VARCHAR(191) NOT NULL,
    `analytics` BOOLEAN NOT NULL DEFAULT false,
    `marketing` BOOLEAN NOT NULL DEFAULT false,
    `ip` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CookieConsent_choice_idx`(`choice` ASC),
    INDEX `CookieConsent_createdAt_idx`(`createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `directmessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,

    INDEX `DirectMessage_receiverId_read_idx`(`receiverId` ASC, `read` ASC),
    INDEX `DirectMessage_senderId_receiverId_createdAt_idx`(`senderId` ASC, `receiverId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draftsharetoken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `DraftShareToken_token_key`(`token` ASC),
    INDEX `DraftShareToken_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaillog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `to` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailLog_createdAt_idx`(`createdAt` ASC),
    INDEX `EmailLog_type_idx`(`type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emailverificationtoken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailVerificationToken_token_key`(`token` ASC),
    INDEX `EmailVerificationToken_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fanart` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `imageUrl` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `FanArt_storyId_idx`(`storyId` ASC),
    INDEX `FanArt_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follow` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `followerId` INTEGER NOT NULL,
    `followingId` INTEGER NOT NULL,

    UNIQUE INDEX `Follow_followerId_followingId_key`(`followerId` ASC, `followingId` ASC),
    INDEX `Follow_followerId_idx`(`followerId` ASC),
    INDEX `Follow_followingId_idx`(`followingId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forum` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Forum_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forumpost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `forumId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `ForumPost_authorId_idx`(`authorId` ASC),
    INDEX `ForumPost_forumId_createdAt_idx`(`forumId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forumreply` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `postId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `ForumReply_authorId_fkey`(`authorId` ASC),
    INDEX `ForumReply_postId_createdAt_idx`(`postId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `coverImage` VARCHAR(191) NULL,
    `subgenre` VARCHAR(191) NULL,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ownerId` INTEGER NOT NULL,

    INDEX `Group_ownerId_fkey`(`ownerId` ASC),
    UNIQUE INDEX `Group_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groupmember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('MEMBER', 'MODERATOR', 'OWNER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `groupId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `GroupMember_groupId_userId_key`(`groupId` ASC, `userId` ASC),
    INDEX `GroupMember_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grouppost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `groupId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `GroupPost_authorId_fkey`(`authorId` ASC),
    INDEX `GroupPost_groupId_createdAt_idx`(`groupId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horrorrecipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `ingredients` TEXT NOT NULL,
    `steps` LONGTEXT NOT NULL,
    `image` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'food',
    `difficulty` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `prepMins` INTEGER NULL,
    `servings` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `HorrorRecipe_authorId_idx`(`authorId` ASC),
    INDEX `HorrorRecipe_createdAt_idx`(`createdAt` ASC),
    UNIQUE INDEX `HorrorRecipe_slug_key`(`slug` ASC),
    INDEX `HorrorRecipe_type_idx`(`type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lastword` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` VARCHAR(280) NOT NULL,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    INDEX `LastWord_createdAt_idx`(`createdAt` ASC),
    INDEX `LastWord_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lastwordlike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastWordId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `LastWordLike_lastWordId_userId_key`(`lastWordId` ASC, `userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `like` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `Like_storyId_idx`(`storyId` ASC),
    UNIQUE INDEX `Like_userId_storyId_key`(`userId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `liveqaquestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` TEXT NOT NULL,
    `answer` TEXT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    `upvotes` INTEGER NOT NULL DEFAULT 0,
    `answered` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sessionId` INTEGER NOT NULL,
    `askerId` INTEGER NULL,

    INDEX `LiveQAQuestion_sessionId_createdAt_idx`(`sessionId` ASC, `createdAt` ASC),
    INDEX `LiveQAQuestion_sessionId_upvotes_idx`(`sessionId` ASC, `upvotes` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `liveqasession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorId` INTEGER NOT NULL,

    INDEX `LiveQASession_authorId_idx`(`authorId` ASC),
    INDEX `LiveQASession_isActive_startsAt_idx`(`isActive` ASC, `startsAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loginlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `username` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `success` BOOLEAN NOT NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginLog_createdAt_idx`(`createdAt` ASC),
    INDEX `LoginLog_success_createdAt_idx`(`success` ASC, `createdAt` ASC),
    INDEX `LoginLog_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monster` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `origin` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `scareFactor` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Monster_name_key`(`name` ASC),
    INDEX `Monster_scareFactor_idx`(`scareFactor` ASC),
    UNIQUE INDEX `Monster_slug_key`(`slug` ASC),
    INDEX `Monster_type_idx`(`type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monsterstorylink` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `monsterId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `MonsterStoryLink_monsterId_idx`(`monsterId` ASC),
    UNIQUE INDEX `MonsterStoryLink_monsterId_storyId_key`(`monsterId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `moodofday` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mood` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `setAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `setById` INTEGER NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'MENTION', 'COLLABORATE', 'DIRECT_MESSAGE', 'GROUP_INVITE') NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NULL,

    INDEX `Notification_storyId_fkey`(`storyId` ASC),
    INDEX `Notification_userId_read_createdAt_idx`(`userId` ASC, `read` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offlinesave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `OfflineSave_storyId_fkey`(`storyId` ASC),
    UNIQUE INDEX `OfflineSave_userId_storyId_key`(`userId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passwordresettoken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `PasswordResetToken_token_key`(`token` ASC),
    INDEX `PasswordResetToken_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `poll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` VARCHAR(191) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorId` INTEGER NOT NULL,
    `groupId` INTEGER NULL,

    INDEX `Poll_authorId_idx`(`authorId` ASC),
    INDEX `Poll_createdAt_idx`(`createdAt` ASC),
    INDEX `Poll_groupId_createdAt_idx`(`groupId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `polloption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(191) NOT NULL,
    `pollId` INTEGER NOT NULL,

    INDEX `PollOption_pollId_idx`(`pollId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pollvote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pollId` INTEGER NOT NULL,
    `optionId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `PollVote_optionId_fkey`(`optionId` ASC),
    UNIQUE INDEX `PollVote_pollId_userId_key`(`pollId` ASC, `userId` ASC),
    INDEX `PollVote_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bio` TEXT NULL,
    `avatar` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `fearMoods` VARCHAR(191) NULL,
    `merchUrl` VARCHAR(191) NULL,
    `profileTheme` VARCHAR(191) NOT NULL DEFAULT 'default',
    `avatarBorder` VARCHAR(191) NOT NULL DEFAULT 'none',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Profile_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promptentry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `promptId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `PromptEntry_promptId_storyId_key`(`promptId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pushsubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `endpoint` VARCHAR(191) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `PushSubscription_endpoint_key`(`endpoint` ASC),
    INDEX `PushSubscription_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quizattempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `score` INTEGER NOT NULL,
    `total` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    INDEX `QuizAttempt_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('LOVE', 'SCARED', 'GHOST', 'FIRE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `Reaction_storyId_idx`(`storyId` ASC),
    UNIQUE INDEX `Reaction_userId_storyId_type_key`(`userId` ASC, `storyId` ASC, `type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `readinggoal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target` INTEGER NOT NULL,
    `period` VARCHAR(191) NOT NULL DEFAULT 'weekly',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ReadingGoal_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `readinghistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `ReadingHistory_storyId_idx`(`storyId` ASC),
    INDEX `ReadingHistory_userId_readAt_idx`(`userId` ASC, `readAt` ASC),
    UNIQUE INDEX `ReadingHistory_userId_storyId_key`(`userId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `readingroom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `storyId` INTEGER NOT NULL,
    `hostId` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReadingRoom_code_key`(`code` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `readingroommember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `lastSeen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReadingRoomMember_roomId_userId_key`(`roomId` ASC, `userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `readingstreak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `lastReadAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ReadingStreak_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipereaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emoji` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recipeId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `RecipeReaction_recipeId_idx`(`recipeId` ASC),
    UNIQUE INDEX `RecipeReaction_recipeId_userId_emoji_key`(`recipeId` ASC, `userId` ASC, `emoji` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('COMMENT', 'STORY', 'FORUM_POST', 'FORUM_REPLY') NOT NULL,
    `targetId` INTEGER NOT NULL,
    `reason` ENUM('HARASSMENT', 'HATE_SPEECH', 'SPAM', 'INAPPROPRIATE', 'THREATS', 'OTHER') NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('PENDING', 'REVIEWED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reporterId` INTEGER NOT NULL,

    INDEX `Report_reporterId_fkey`(`reporterId` ASC),
    INDEX `Report_status_createdAt_idx`(`status` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scarerating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rating` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `ScareRating_storyId_fkey`(`storyId` ASC),
    UNIQUE INDEX `ScareRating_userId_storyId_key`(`userId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `screamaward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT false,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ScreamAward_year_key`(`year` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `screamawardcategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `awardId` INTEGER NOT NULL,

    UNIQUE INDEX `ScreamAwardCategory_awardId_name_key`(`awardId` ASC, `name` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `screamnomination` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `storyId` INTEGER NULL,
    `authorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `categoryId` INTEGER NOT NULL,

    INDEX `ScreamNomination_categoryId_idx`(`categoryId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `screamvote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nominationId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `ScreamVote_nominationId_idx`(`nominationId` ASC),
    UNIQUE INDEX `ScreamVote_nominationId_userId_key`(`nominationId` ASC, `userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sequelrequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `SequelRequest_storyId_userId_key`(`storyId` ASC, `userId` ASC),
    INDEX `SequelRequest_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorId` INTEGER NOT NULL,

    INDEX `Series_authorId_idx`(`authorId` ASC),
    UNIQUE INDEX `Series_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sitesetting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `image` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sprintparticipant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wordCount` INTEGER NOT NULL DEFAULT 0,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sprintId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `SprintParticipant_sprintId_idx`(`sprintId` ASC),
    UNIQUE INDEX `SprintParticipant_sprintId_userId_key`(`sprintId` ASC, `userId` ASC),
    INDEX `SprintParticipant_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `squad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hostId` INTEGER NOT NULL,

    UNIQUE INDEX `Squad_code_key`(`code` ASC),
    INDEX `Squad_hostId_fkey`(`hostId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `squadmember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `squadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `SquadMember_squadId_userId_key`(`squadId` ASC, `userId` ASC),
    INDEX `SquadMember_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `squadpost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NULL,
    `storyUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `squadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `SquadPost_squadId_createdAt_idx`(`squadId` ASC, `createdAt` ASC),
    INDEX `SquadPost_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `excerpt` TEXT NULL,
    `coverImage` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED') NOT NULL DEFAULT 'DRAFT',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `views` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `authorId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `mood` ENUM('EPIC', 'HEARTWARMING', 'MYSTERIOUS', 'ACTION', 'ROMANTIC', 'COMEDIC', 'DRAMATIC', 'DARK') NULL,
    `warnings` TEXT NULL,
    `contentRating` ENUM('ALL', 'TEEN', 'MATURE') NOT NULL DEFAULT 'ALL',
    `scareScore` INTEGER NULL,
    `scareReason` TEXT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `audioUrl` VARCHAR(191) NULL,
    `videoUrl` VARCHAR(191) NULL,
    `spotifyPlaylistUrl` VARCHAR(191) NULL,
    `isChaptered` BOOLEAN NOT NULL DEFAULT false,
    `tipGoalAmount` INTEGER NULL,
    `tipGoalTitle` VARCHAR(191) NULL,
    `tipGoalDescription` TEXT NULL,
    `creepyOfMonth` BOOLEAN NOT NULL DEFAULT false,
    `deathCount` INTEGER NOT NULL DEFAULT 0,
    `price` INTEGER NULL,
    `isPremiumOnly` BOOLEAN NOT NULL DEFAULT false,
    `earlyAccessUntil` DATETIME(3) NULL,
    `seriesId` INTEGER NULL,
    `seriesOrder` INTEGER NULL,
    `locationName` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,

    INDEX `Story_authorId_idx`(`authorId` ASC),
    INDEX `Story_categoryId_idx`(`categoryId` ASC),
    INDEX `Story_contentRating_idx`(`contentRating` ASC),
    INDEX `Story_createdAt_idx`(`createdAt` ASC),
    INDEX `Story_creepyOfMonth_idx`(`creepyOfMonth` ASC),
    INDEX `Story_featured_createdAt_idx`(`featured` ASC, `createdAt` ASC),
    INDEX `Story_isPremiumOnly_idx`(`isPremiumOnly` ASC),
    INDEX `Story_mood_idx`(`mood` ASC),
    INDEX `Story_scheduledAt_idx`(`scheduledAt` ASC),
    INDEX `Story_seriesId_seriesOrder_idx`(`seriesId` ASC, `seriesOrder` ASC),
    UNIQUE INDEX `Story_slug_key`(`slug` ASC),
    INDEX `Story_status_createdAt_idx`(`status` ASC, `createdAt` ASC),
    INDEX `Story_views_idx`(`views` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storybattle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `endsAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyAId` INTEGER NOT NULL,
    `storyBId` INTEGER NOT NULL,

    INDEX `StoryBattle_storyAId_fkey`(`storyAId` ASC),
    INDEX `StoryBattle_storyBId_fkey`(`storyBId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storybundle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `coverImage` VARCHAR(191) NULL,
    `price` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoryBundle_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storybundleitem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bundleId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    UNIQUE INDEX `StoryBundleItem_bundleId_storyId_key`(`bundleId` ASC, `storyId` ASC),
    INDEX `StoryBundleItem_storyId_fkey`(`storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storychapter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `views` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `storyId` INTEGER NOT NULL,
    `price` INTEGER NULL,

    INDEX `StoryChapter_storyId_order_idx`(`storyId` ASC, `order` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storycollaborator` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accepted` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `StoryCollaborator_storyId_userId_key`(`storyId` ASC, `userId` ASC),
    INDEX `StoryCollaborator_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storydare` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NULL,
    `accepted` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `storyId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,

    INDEX `StoryDare_receiverId_idx`(`receiverId` ASC),
    INDEX `StoryDare_senderId_idx`(`senderId` ASC),
    INDEX `StoryDare_storyId_fkey`(`storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storylist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `StoryList_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storylistitem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order` INTEGER NOT NULL DEFAULT 0,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `listId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    UNIQUE INDEX `StoryListItem_listId_storyId_key`(`listId` ASC, `storyId` ASC),
    INDEX `StoryListItem_storyId_fkey`(`storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storyplanner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `storyId` INTEGER NOT NULL,

    UNIQUE INDEX `StoryPlanner_storyId_key`(`storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storypresence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storyId` INTEGER NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoryPresence_storyId_lastSeenAt_idx`(`storyId` ASC, `lastSeenAt` ASC),
    UNIQUE INDEX `StoryPresence_storyId_sessionId_key`(`storyId` ASC, `sessionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storypurchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` INTEGER NOT NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `storyId` INTEGER NOT NULL,

    INDEX `StoryPurchase_storyId_idx`(`storyId` ASC),
    INDEX `StoryPurchase_userId_idx`(`userId` ASC),
    UNIQUE INDEX `StoryPurchase_userId_storyId_key`(`userId` ASC, `storyId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stripeCustomerId` VARCHAR(191) NOT NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'inactive',
    `plan` VARCHAR(191) NOT NULL DEFAULT 'monthly',
    `currentPeriodEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `Subscription_stripeCustomerId_key`(`stripeCustomerId` ASC),
    UNIQUE INDEX `Subscription_stripeSubscriptionId_key`(`stripeSubscriptionId` ASC),
    UNIQUE INDEX `Subscription_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Tag_name_key`(`name` ASC),
    UNIQUE INDEX `Tag_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tagfollow` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `TagFollow_tagId_idx`(`tagId` ASC),
    INDEX `TagFollow_userId_idx`(`userId` ASC),
    UNIQUE INDEX `TagFollow_userId_tagId_key`(`userId` ASC, `tagId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tip` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` INTEGER NOT NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fromUserId` INTEGER NOT NULL,
    `toUserId` INTEGER NOT NULL,

    INDEX `Tip_fromUserId_idx`(`fromUserId` ASC),
    INDEX `Tip_toUserId_createdAt_idx`(`toUserId` ASC, `createdAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `twofactorcode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    INDEX `TwoFactorCode_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('GUEST', 'USER', 'AUTHOR', 'ADMIN') NOT NULL DEFAULT 'USER',
    `writerOfMonth` BOOLEAN NOT NULL DEFAULT false,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `pinnedStoryId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `ageGroup` ENUM('UNDER_13', 'TEEN', 'ADULT') NOT NULL DEFAULT 'ADULT',
    `readingSpeed` VARCHAR(191) NOT NULL DEFAULT 'average',
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `sessionVersion` INTEGER NOT NULL DEFAULT 0,
    `onboardingDone` BOOLEAN NOT NULL DEFAULT false,
    `newsletterSubscribed` BOOLEAN NOT NULL DEFAULT true,
    `digestFrequency` VARCHAR(191) NOT NULL DEFAULT 'WEEKLY',
    `lastCommentDigestAt` DATETIME(3) NULL,
    `discordId` VARCHAR(191) NULL,
    `discordUsername` VARCHAR(191) NULL,
    `discordAccessToken` TEXT NULL,
    `discordRefreshToken` TEXT NULL,
    `isBanned` BOOLEAN NOT NULL DEFAULT false,
    `suspendedUntil` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email` ASC),
    UNIQUE INDEX `User_username_key`(`username` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userbadge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `awardedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserBadge_userId_type_key`(`userId` ASC, `type` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userwarning` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reason` TEXT NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `adminId` INTEGER NOT NULL,

    INDEX `UserWarning_adminId_fkey`(`adminId` ASC),
    INDEX `UserWarning_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `villain` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `storyId` INTEGER NULL,
    `weekOf` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `villainvote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `villainId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `VillainVote_userId_fkey`(`userId` ASC),
    UNIQUE INDEX `VillainVote_villainId_userId_key`(`villainId` ASC, `userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `writingprompt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `writingsprint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `durationMins` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `writingstreak` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `lastPublishedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `WritingStreak_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_storytags` ADD CONSTRAINT `_StoryTags_A_fkey` FOREIGN KEY (`A`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_storytags` ADD CONSTRAINT `_StoryTags_B_fkey` FOREIGN KEY (`B`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `AuditLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorqa` ADD CONSTRAINT `AuthorQA_askerId_fkey` FOREIGN KEY (`askerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorqa` ADD CONSTRAINT `AuthorQA_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `battlevote` ADD CONSTRAINT `BattleVote_battleId_fkey` FOREIGN KEY (`battleId`) REFERENCES `storybattle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `battlevote` ADD CONSTRAINT `BattleVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `betareaderinvite` ADD CONSTRAINT `BetaReaderInvite_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `betareaderinvite` ADD CONSTRAINT `BetaReaderInvite_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bingocard` ADD CONSTRAINT `BingoCard_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `bingotemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bingocellcheck` ADD CONSTRAINT `BingoCellCheck_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `bingocard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blockeduser` ADD CONSTRAINT `BlockedUser_blockedId_fkey` FOREIGN KEY (`blockedId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blockeduser` ADD CONSTRAINT `BlockedUser_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookclub` ADD CONSTRAINT `BookClub_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookclub` ADD CONSTRAINT `BookClub_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookclubmember` ADD CONSTRAINT `BookClubMember_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `bookclub`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookclubmember` ADD CONSTRAINT `BookClubMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookmark` ADD CONSTRAINT `Bookmark_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookmark` ADD CONSTRAINT `Bookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branchnode` ADD CONSTRAINT `BranchNode_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `branchnode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bundlepurchase` ADD CONSTRAINT `BundlePurchase_bundleId_fkey` FOREIGN KEY (`bundleId`) REFERENCES `storybundle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bundlepurchase` ADD CONSTRAINT `BundlePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chainstory` ADD CONSTRAINT `ChainStory_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chainstorysegment` ADD CONSTRAINT `ChainStorySegment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chainstorysegment` ADD CONSTRAINT `ChainStorySegment_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `chainstory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challengeentry` ADD CONSTRAINT `ChallengeEntry_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `challenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challengeentry` ADD CONSTRAINT `ChallengeEntry_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challengeentry` ADD CONSTRAINT `ChallengeEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapterpurchase` ADD CONSTRAINT `ChapterPurchase_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `storychapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapterpurchase` ADD CONSTRAINT `ChapterPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coauthorrequest` ADD CONSTRAINT `CoauthorRequest_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `Comment_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `Comment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commentreaction` ADD CONSTRAINT `CommentReaction_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commentreaction` ADD CONSTRAINT `CommentReaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confession` ADD CONSTRAINT `Confession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `confessionreaction` ADD CONSTRAINT `ConfessionReaction_confessionId_fkey` FOREIGN KEY (`confessionId`) REFERENCES `confession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `directmessage` ADD CONSTRAINT `DirectMessage_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `directmessage` ADD CONSTRAINT `DirectMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draftsharetoken` ADD CONSTRAINT `DraftShareToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emailverificationtoken` ADD CONSTRAINT `EmailVerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fanart` ADD CONSTRAINT `FanArt_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fanart` ADD CONSTRAINT `FanArt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow` ADD CONSTRAINT `Follow_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow` ADD CONSTRAINT `Follow_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forumpost` ADD CONSTRAINT `ForumPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forumpost` ADD CONSTRAINT `ForumPost_forumId_fkey` FOREIGN KEY (`forumId`) REFERENCES `forum`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forumreply` ADD CONSTRAINT `ForumReply_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forumreply` ADD CONSTRAINT `ForumReply_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `forumpost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group` ADD CONSTRAINT `Group_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groupmember` ADD CONSTRAINT `GroupMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groupmember` ADD CONSTRAINT `GroupMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grouppost` ADD CONSTRAINT `GroupPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grouppost` ADD CONSTRAINT `GroupPost_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horrorrecipe` ADD CONSTRAINT `HorrorRecipe_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lastword` ADD CONSTRAINT `LastWord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lastwordlike` ADD CONSTRAINT `LastWordLike_lastWordId_fkey` FOREIGN KEY (`lastWordId`) REFERENCES `lastword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `like` ADD CONSTRAINT `Like_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `like` ADD CONSTRAINT `Like_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `liveqaquestion` ADD CONSTRAINT `LiveQAQuestion_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `liveqasession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `liveqasession` ADD CONSTRAINT `LiveQASession_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monsterstorylink` ADD CONSTRAINT `MonsterStoryLink_monsterId_fkey` FOREIGN KEY (`monsterId`) REFERENCES `monster`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offlinesave` ADD CONSTRAINT `OfflineSave_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passwordresettoken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poll` ADD CONSTRAINT `Poll_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poll` ADD CONSTRAINT `Poll_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `polloption` ADD CONSTRAINT `PollOption_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `poll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pollvote` ADD CONSTRAINT `PollVote_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `polloption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pollvote` ADD CONSTRAINT `PollVote_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `poll`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pollvote` ADD CONSTRAINT `PollVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile` ADD CONSTRAINT `Profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promptentry` ADD CONSTRAINT `PromptEntry_promptId_fkey` FOREIGN KEY (`promptId`) REFERENCES `writingprompt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pushsubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quizattempt` ADD CONSTRAINT `QuizAttempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `Reaction_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reaction` ADD CONSTRAINT `Reaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `readinggoal` ADD CONSTRAINT `ReadingGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `readinghistory` ADD CONSTRAINT `ReadingHistory_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `readinghistory` ADD CONSTRAINT `ReadingHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `readingroommember` ADD CONSTRAINT `ReadingRoomMember_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `readingroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `readingstreak` ADD CONSTRAINT `ReadingStreak_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipereaction` ADD CONSTRAINT `RecipeReaction_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `horrorrecipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scarerating` ADD CONSTRAINT `ScareRating_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scarerating` ADD CONSTRAINT `ScareRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `screamawardcategory` ADD CONSTRAINT `ScreamAwardCategory_awardId_fkey` FOREIGN KEY (`awardId`) REFERENCES `screamaward`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `screamnomination` ADD CONSTRAINT `ScreamNomination_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `screamawardcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `screamvote` ADD CONSTRAINT `ScreamVote_nominationId_fkey` FOREIGN KEY (`nominationId`) REFERENCES `screamnomination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sequelrequest` ADD CONSTRAINT `SequelRequest_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sequelrequest` ADD CONSTRAINT `SequelRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `series` ADD CONSTRAINT `Series_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sprintparticipant` ADD CONSTRAINT `SprintParticipant_sprintId_fkey` FOREIGN KEY (`sprintId`) REFERENCES `writingsprint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sprintparticipant` ADD CONSTRAINT `SprintParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squad` ADD CONSTRAINT `Squad_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squadmember` ADD CONSTRAINT `SquadMember_squadId_fkey` FOREIGN KEY (`squadId`) REFERENCES `squad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squadmember` ADD CONSTRAINT `SquadMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squadpost` ADD CONSTRAINT `SquadPost_squadId_fkey` FOREIGN KEY (`squadId`) REFERENCES `squad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `squadpost` ADD CONSTRAINT `SquadPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story` ADD CONSTRAINT `Story_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story` ADD CONSTRAINT `Story_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story` ADD CONSTRAINT `Story_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storybattle` ADD CONSTRAINT `StoryBattle_storyAId_fkey` FOREIGN KEY (`storyAId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storybattle` ADD CONSTRAINT `StoryBattle_storyBId_fkey` FOREIGN KEY (`storyBId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storybundleitem` ADD CONSTRAINT `StoryBundleItem_bundleId_fkey` FOREIGN KEY (`bundleId`) REFERENCES `storybundle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storybundleitem` ADD CONSTRAINT `StoryBundleItem_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storychapter` ADD CONSTRAINT `StoryChapter_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storycollaborator` ADD CONSTRAINT `StoryCollaborator_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storycollaborator` ADD CONSTRAINT `StoryCollaborator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storydare` ADD CONSTRAINT `StoryDare_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storydare` ADD CONSTRAINT `StoryDare_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storydare` ADD CONSTRAINT `StoryDare_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storylist` ADD CONSTRAINT `StoryList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storylistitem` ADD CONSTRAINT `StoryListItem_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `storylist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storylistitem` ADD CONSTRAINT `StoryListItem_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storypurchase` ADD CONSTRAINT `StoryPurchase_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storypurchase` ADD CONSTRAINT `StoryPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tagfollow` ADD CONSTRAINT `TagFollow_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tagfollow` ADD CONSTRAINT `TagFollow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tip` ADD CONSTRAINT `Tip_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tip` ADD CONSTRAINT `Tip_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `twofactorcode` ADD CONSTRAINT `TwoFactorCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userbadge` ADD CONSTRAINT `UserBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userwarning` ADD CONSTRAINT `UserWarning_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userwarning` ADD CONSTRAINT `UserWarning_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `villainvote` ADD CONSTRAINT `VillainVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `villainvote` ADD CONSTRAINT `VillainVote_villainId_fkey` FOREIGN KEY (`villainId`) REFERENCES `villain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `writingstreak` ADD CONSTRAINT `WritingStreak_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
