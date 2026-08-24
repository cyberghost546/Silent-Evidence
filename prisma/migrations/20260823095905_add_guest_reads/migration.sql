-- CreateTable
CREATE TABLE `GuestRead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guestId` VARCHAR(191) NOT NULL,
    `storyId` INTEGER NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GuestRead_guestId_month_idx`(`guestId`, `month`),
    INDEX `GuestRead_readAt_idx`(`readAt`),
    UNIQUE INDEX `GuestRead_guestId_storyId_month_key`(`guestId`, `storyId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GuestRead` ADD CONSTRAINT `GuestRead_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
