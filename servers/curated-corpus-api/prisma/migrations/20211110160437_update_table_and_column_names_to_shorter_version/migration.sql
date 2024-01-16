/*
  Warnings:

  - You are about to drop the `CuratedItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewTabFeedSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `NewTabFeedSchedule` DROP FOREIGN KEY `NewTabFeedSchedule_curatedItemId_fkey`;

-- DropTable
DROP TABLE `CuratedItem`;

-- DropTable
DROP TABLE `NewTabFeedSchedule`;

-- CreateTable
CREATE TABLE `ApprovedItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `status` ENUM('RECOMMENDATION', 'CORPUS') NOT NULL DEFAULT 'CORPUS',
    `language` VARCHAR(2) NOT NULL,
    `publisher` VARCHAR(255) NOT NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `topic` VARCHAR(255) NOT NULL,
    `isCollection` BOOLEAN NOT NULL DEFAULT false,
    `isShortLived` BOOLEAN NOT NULL DEFAULT false,
    `isSyndicated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(255) NULL,

    UNIQUE INDEX `ApprovedItem_externalId_key`(`externalId`),
    UNIQUE INDEX `ApprovedItem_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduledItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `approvedItemId` INTEGER NOT NULL,
    `newTabGuid` VARCHAR(10) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(255) NULL,
    `scheduledDate` DATE NOT NULL,

    UNIQUE INDEX `ScheduledItem_externalId_key`(`externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ScheduledItem` ADD CONSTRAINT `ScheduledItem_approvedItemId_fkey` FOREIGN KEY (`approvedItemId`) REFERENCES `ApprovedItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
