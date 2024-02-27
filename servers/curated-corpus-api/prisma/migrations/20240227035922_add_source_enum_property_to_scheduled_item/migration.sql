/*
  Warnings:

  - Made the column `source` on table `ScheduledItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ScheduledItem` MODIFY `source` ENUM('MANUAL', 'ML') NOT NULL;
