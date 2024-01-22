/*
  Warnings:

  - Added the required column `prospectId` to the `ApprovedItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prospectId` to the `RejectedCuratedCorpusItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ApprovedItem` ADD COLUMN `prospectId` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `RejectedCuratedCorpusItem` ADD COLUMN `prospectId` VARCHAR(255) NOT NULL;
