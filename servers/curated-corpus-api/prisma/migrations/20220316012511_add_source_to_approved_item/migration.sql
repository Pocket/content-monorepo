-- AlterTable
ALTER TABLE `ApprovedItem` ADD COLUMN `source` ENUM('PROSPECT', 'MANUAL', 'BACKFILL') NULL;
