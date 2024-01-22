/*
  Warnings:

  - The values [DECLINE] on the enum `CuratedItem_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `CuratedItem` MODIFY `status` ENUM('RECOMMENDATION', 'CORPUS') NOT NULL DEFAULT 'CORPUS';

-- CreateTable
CREATE TABLE `RejectedCuratedCorpusItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `topic` VARCHAR(255) NOT NULL,
    `language` VARCHAR(2) NOT NULL,
    `publisher` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdBy` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `RejectedCuratedCorpusItem_externalId_key`(`externalId`),
    UNIQUE INDEX `RejectedCuratedCorpusItem_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
