-- AlterTable
ALTER TABLE `calendarevent` MODIFY `icon` VARCHAR(191) NOT NULL DEFAULT '📅';

-- AlterTable
ALTER TABLE `readinghistory` ADD COLUMN `progress` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `ReadingHistory_storyId_progress_idx` ON `ReadingHistory`(`storyId`, `progress`);
