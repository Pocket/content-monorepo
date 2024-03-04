/*
  Warnings:

  - Made the column `source` on table `ScheduledItem` required. This step will fail if there are existing NULL values in that column.

*/

-- Manually added - Backfill all the ScheduledItem table's 'source' column with "MANUAL"
-- Do this before making the column NOT NULL to ensure there are no empty values
UPDATE `ScheduledItem` SET `source` = 'MANUAL';

-- AlterTable
ALTER TABLE `ScheduledItem` MODIFY `source` ENUM('MANUAL', 'ML') NOT NULL;
