-- DropForeignKey
ALTER TABLE `ScheduledItem` DROP FOREIGN KEY `ScheduledItem_approvedItemId_fkey`;

-- AlterTable
ALTER TABLE `ApprovedItem` MODIFY `source` ENUM('PROSPECT', 'MANUAL', 'BACKFILL', 'ML') NULL;

-- AlterTable
ALTER TABLE `ScheduledItem` ADD COLUMN `source` ENUM('MANUAL', 'ML') NULL;

-- AddForeignKey
ALTER TABLE `ScheduledItem` ADD CONSTRAINT `ScheduledItem_approvedItemId_fkey` FOREIGN KEY (`approvedItemId`) REFERENCES `ApprovedItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill all the ScheduledItem table's 'source' column with "MANUAL"
UPDATE ScheduledItem SET source = 'MANUAL';