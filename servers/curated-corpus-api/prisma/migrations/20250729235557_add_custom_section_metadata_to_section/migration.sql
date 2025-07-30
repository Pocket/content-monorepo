-- AlterTable
ALTER TABLE `Section` ADD COLUMN `description` VARCHAR(255) NULL,
    ADD COLUMN `endDate` DATE NULL,
    ADD COLUMN `heroDescription` VARCHAR(255) NULL,
    ADD COLUMN `heroTitle` VARCHAR(255) NULL,
    ADD COLUMN `startDate` DATE NULL;
