/*
  Warnings:

  - The values [PROSPECT,BACKFILL] on the enum `ScheduledItem_source` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `ScheduledItem` MODIFY `source` ENUM('MANUAL', 'ML') NULL;
