/*
  Warnings:

  - You are about to drop the `guestread` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `guestread` DROP FOREIGN KEY `GuestRead_storyId_fkey`;

-- DropTable
DROP TABLE `guestread`;
