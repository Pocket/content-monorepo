/*
  Warnings:

  - You are about to drop the column `newTabFeedId` on the `NewTabFeedSchedule` table. All the data in the column will be lost.
  - You are about to drop the `NewTabFeed` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `newTabGuid` to the `NewTabFeedSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `NewTabFeedSchedule` DROP FOREIGN KEY `NewTabFeedSchedule_newTabFeedId_fkey`;

-- AlterTable
ALTER TABLE `NewTabFeedSchedule` DROP COLUMN `newTabFeedId`,
    ADD COLUMN `newTabGuid` VARCHAR(10) NOT NULL;

-- DropTable
DROP TABLE `NewTabFeed`;
