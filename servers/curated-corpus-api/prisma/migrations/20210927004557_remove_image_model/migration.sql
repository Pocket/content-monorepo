/*
  Warnings:

  - You are about to drop the column `curatedImageId` on the `CuratedItem` table. All the data in the column will be lost.
  - You are about to alter the column `language` on the `CuratedItem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(2)`.
  - You are about to drop the `CuratedItemImage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `imageUrl` to the `CuratedItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `CuratedItem` DROP FOREIGN KEY `CuratedItem_curatedImageId_fkey`;

-- AlterTable
ALTER TABLE `CuratedItem` DROP COLUMN `curatedImageId`,
    ADD COLUMN `imageUrl` VARCHAR(500) NOT NULL,
    MODIFY `language` VARCHAR(2) NOT NULL,
    MODIFY `createdBy` VARCHAR(255) NOT NULL,
    MODIFY `updatedBy` VARCHAR(255);

-- AlterTable
ALTER TABLE `NewTabFeed` MODIFY `name` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `NewTabFeedSchedule` MODIFY `createdBy` VARCHAR(255) NOT NULL,
    MODIFY `updatedBy` VARCHAR(255),
    MODIFY `approvedBy` VARCHAR(255);

-- DropTable
DROP TABLE `CuratedItemImage`;
