-- CreateTable
CREATE TABLE `Section` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `scheduledSurfaceGuid` VARCHAR(50) NOT NULL,
    `sort` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `createSource` ENUM('MANUAL', 'ML') NOT NULL,
    `deactivateSource` ENUM('MANUAL', 'ML') NULL,
    `updateSource` ENUM('MANUAL', 'ML') NULL,
    `deactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Section_externalId_key`(`externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SectionItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(255) NOT NULL,
    `sectionId` INTEGER NOT NULL,
    `approvedItemId` INTEGER NOT NULL,
    `rank` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `deactivateSource` ENUM('MANUAL', 'ML') NULL,
    `deactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SectionItem_externalId_key`(`externalId`),
    INDEX `SectionIdActive`(`sectionId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SectionItem` ADD CONSTRAINT `SectionItem_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SectionItem` ADD CONSTRAINT `SectionItem_approvedItemId_fkey` FOREIGN KEY (`approvedItemId`) REFERENCES `ApprovedItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
