/*
  Warnings:

  - Added the required column `topic` to the `CuratedItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CuratedItem` ADD COLUMN `isCollection` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isShortLived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isSyndicated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `topic` VARCHAR(255) NOT NULL;
