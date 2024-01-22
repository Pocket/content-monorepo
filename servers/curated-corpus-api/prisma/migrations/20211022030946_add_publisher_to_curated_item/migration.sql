/*
  Warnings:

  - Added the required column `publisher` to the `CuratedItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CuratedItem` ADD COLUMN `publisher` VARCHAR(255) NOT NULL;
