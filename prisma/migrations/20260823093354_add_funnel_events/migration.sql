-- CreateTable
CREATE TABLE `FunnelEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event` VARCHAR(191) NOT NULL,
    `bucket` VARCHAR(191) NOT NULL,
    `meta` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NULL,

    INDEX `FunnelEvent_event_createdAt_idx`(`event`, `createdAt`),
    INDEX `FunnelEvent_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `FunnelEvent_event_userId_bucket_key`(`event`, `userId`, `bucket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FunnelEvent` ADD CONSTRAINT `FunnelEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
