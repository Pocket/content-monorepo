-- CreateTable
CREATE TABLE `ApprovedItemAuthor` (
    `externalId` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `approvedItemId` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ApprovedItemAuthor_approvedItemId_idx`(`approvedItemId`),
    PRIMARY KEY (`externalId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApprovedItemAuthor` ADD CONSTRAINT `ApprovedItemAuthor_approvedItemId_fkey` FOREIGN KEY (`approvedItemId`) REFERENCES `ApprovedItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
