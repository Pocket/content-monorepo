/*
  Warnings:

  - A unique constraint covering the columns `[approvedItemId,newTabGuid,scheduledDate]` on the table `ScheduledItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `ScheduledItem_approvedItemId_newTabGuid_scheduledDate_key` ON `ScheduledItem`(`approvedItemId`, `newTabGuid`, `scheduledDate`);
