/*
  Warnings:

  - You are about to drop the column `description` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the column `heroDescription` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the column `heroTitle` on the `Section` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Section` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Section` DROP COLUMN `description`,
    DROP COLUMN `endDate`,
    DROP COLUMN `heroDescription`,
    DROP COLUMN `heroTitle`,
    DROP COLUMN `startDate`;
