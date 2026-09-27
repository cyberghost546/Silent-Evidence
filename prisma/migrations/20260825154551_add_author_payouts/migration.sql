-- AlterTable
ALTER TABLE `user` ADD COLUMN `stripeConnectId` VARCHAR(191) NULL,
    ADD COLUMN `stripeConnectOnboarded` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Payout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amountCents` INTEGER NOT NULL,
    `stripeTransferId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `coveredThrough` DATETIME(3) NOT NULL,
    `authorId` INTEGER NOT NULL,

    INDEX `Payout_authorId_createdAt_idx`(`authorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
