/*
  Warnings:

  - You are about to drop the column `newTabGuid` on the `ScheduledItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[approvedItemId,scheduledSurfaceGuid,scheduledDate]` on the table `ScheduledItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `scheduledSurfaceGuid` to the `ScheduledItem` table without a default value. This is not possible if the table is not empty.

*/

-- CUSTOM! we have to drop the foreign key first or mysql won't let us drop the index below
ALTER TABLE `ScheduledItem` DROP FOREIGN KEY `ScheduledItem_approvedItemId_fkey`;

-- DropIndex
DROP INDEX `ScheduledItem_approvedItemId_newTabGuid_scheduledDate_key` ON `ScheduledItem`;

-- AlterTable
ALTER TABLE `ScheduledItem` DROP COLUMN `newTabGuid`,
    ADD COLUMN `scheduledSurfaceGuid` VARCHAR(50) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ScheduledItem_approvedItemId_scheduledSurfaceGuid_scheduledD_key` ON `ScheduledItem`(`approvedItemId`, `scheduledSurfaceGuid`, `scheduledDate`);

-- CUSTOM! recreate the foreign key we had to drop above
ALTER TABLE `ScheduledItem` ADD CONSTRAINT `ScheduledItem_approvedItemId_fkey` FOREIGN KEY (`approvedItemId`) REFERENCES `ApprovedItem` (`id`) ON UPDATE CASCADE;
