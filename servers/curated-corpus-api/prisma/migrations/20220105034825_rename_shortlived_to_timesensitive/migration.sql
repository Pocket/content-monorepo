/*
  Warnings:

  - You are about to drop the column `isShortLived` on the `ApprovedItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ApprovedItem` DROP COLUMN `isShortLived`,
    ADD COLUMN `isTimeSensitive` BOOLEAN NOT NULL DEFAULT false;
