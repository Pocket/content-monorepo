-- CreateTable
CREATE TABLE `CuratedItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `curatedImageId` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `status` ENUM('RECOMMENDATION', 'CORPUS', 'DECLINE') NOT NULL DEFAULT 'CORPUS',
    `language` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CuratedItem_externalId_key`(`externalId`),
    UNIQUE INDEX `CuratedItem_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewTabFeed` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(10) NOT NULL DEFAULT 'en_US',
    `utcOffset` VARCHAR(6) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NewTabFeed_externalId_key`(`externalId`),
    UNIQUE INDEX `NewTabFeed_shortName_key`(`shortName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewTabFeedSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `curatedItemId` INTEGER NOT NULL,
    `newTabFeedId` INTEGER NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `scheduledDate` DATE NOT NULL,
    `approvedBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `NewTabFeedSchedule_externalId_key`(`externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuratedItemImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `mimeType` VARCHAR(255) NOT NULL,
    `fileSizeBytes` INTEGER NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CuratedItemImage_path_key`(`path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CuratedItem` ADD CONSTRAINT `CuratedItem_curatedImageId_fkey` FOREIGN KEY (`curatedImageId`) REFERENCES `CuratedItemImage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NewTabFeedSchedule` ADD CONSTRAINT `NewTabFeedSchedule_curatedItemId_fkey` FOREIGN KEY (`curatedItemId`) REFERENCES `CuratedItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NewTabFeedSchedule` ADD CONSTRAINT `NewTabFeedSchedule_newTabFeedId_fkey` FOREIGN KEY (`newTabFeedId`) REFERENCES `NewTabFeed`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
