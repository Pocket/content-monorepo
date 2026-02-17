-- AlterTable
ALTER TABLE `Section` ADD COLUMN `allowAds` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `followable` BOOLEAN NOT NULL DEFAULT true;
