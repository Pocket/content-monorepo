-- DropForeignKey
ALTER TABLE `ScheduledItem` DROP FOREIGN KEY `ScheduledItem_approvedItemId_fkey`;

-- AlterTable
ALTER TABLE `ApprovedItem` ADD COLUMN `datePublished` DATETIME NULL;

-- AddForeignKey
ALTER TABLE `ScheduledItem` ADD CONSTRAINT `ScheduledItem_approvedItemId_fkey` FOREIGN KEY (`approvedItemId`) REFERENCES `ApprovedItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
