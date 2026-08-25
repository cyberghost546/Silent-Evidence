-- CreateTable
CREATE TABLE `SecurityAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `detail` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `acknowledged` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `windowKey` VARCHAR(191) NOT NULL,

    INDEX `SecurityAlert_acknowledged_createdAt_idx`(`acknowledged`, `createdAt`),
    INDEX `SecurityAlert_severity_createdAt_idx`(`severity`, `createdAt`),
    UNIQUE INDEX `SecurityAlert_kind_ip_windowKey_key`(`kind`, `ip`, `windowKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
