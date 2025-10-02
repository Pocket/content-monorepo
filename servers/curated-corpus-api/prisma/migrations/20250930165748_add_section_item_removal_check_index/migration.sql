-- CreateIndex
CREATE INDEX `ApprovedItemRemovalCheck` ON `SectionItem`(`approvedItemId`, `deactivateSource`, `active`);
