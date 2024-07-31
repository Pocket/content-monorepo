-- CreateTable
CREATE TABLE `ScheduleReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scheduledSurfaceGuid` VARCHAR(50) NOT NULL,
    `scheduledDate` DATE NOT NULL,
    `reviewedAt` DATE NOT NULL,
    `reviewedBy` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ScheduleReview_scheduledSurfaceGuid_scheduledDate_key`(`scheduledSurfaceGuid`, `scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
