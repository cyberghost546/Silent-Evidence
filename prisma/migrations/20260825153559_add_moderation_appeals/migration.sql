-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'MENTION', 'COLLABORATE', 'DIRECT_MESSAGE', 'GROUP_INVITE', 'MILESTONE', 'MODERATION') NOT NULL;

-- CreateTable
CREATE TABLE `ModerationAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('CONTENT_REMOVED', 'CONTENT_HIDDEN', 'CONTENT_REJECTED', 'WARNING', 'ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED') NOT NULL,
    `targetType` ENUM('STORY', 'COMMENT', 'FORUM_POST', 'FORUM_REPLY', 'ACCOUNT') NOT NULL,
    `targetId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'REVERSED') NOT NULL DEFAULT 'ACTIVE',
    `reason` ENUM('HARASSMENT', 'HATE_SPEECH', 'SPAM', 'INAPPROPRIATE', 'THREATS', 'COPYRIGHT', 'ILLEGAL_CONTENT', 'OTHER') NOT NULL,
    `explanation` TEXT NOT NULL,
    `legalGround` VARCHAR(191) NULL,
    `automated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `affectedUserId` INTEGER NOT NULL,
    `moderatorId` INTEGER NULL,
    `reportId` INTEGER NULL,

    INDEX `ModerationAction_affectedUserId_createdAt_idx`(`affectedUserId`, `createdAt`),
    INDEX `ModerationAction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModerationAppeal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('OPEN', 'UPHELD', 'OVERTURNED') NOT NULL DEFAULT 'OPEN',
    `message` TEXT NOT NULL,
    `decisionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,
    `actionId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `reviewerId` INTEGER NULL,

    INDEX `ModerationAppeal_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `ModerationAppeal_actionId_userId_key`(`actionId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ModerationAction` ADD CONSTRAINT `ModerationAction_affectedUserId_fkey` FOREIGN KEY (`affectedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModerationAction` ADD CONSTRAINT `ModerationAction_moderatorId_fkey` FOREIGN KEY (`moderatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModerationAppeal` ADD CONSTRAINT `ModerationAppeal_actionId_fkey` FOREIGN KEY (`actionId`) REFERENCES `ModerationAction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModerationAppeal` ADD CONSTRAINT `ModerationAppeal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModerationAppeal` ADD CONSTRAINT `ModerationAppeal_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
