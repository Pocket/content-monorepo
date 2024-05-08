-- Add nullable domainName column, and set it based on the url using the above function
ALTER TABLE `ApprovedItem` ADD COLUMN `domainName` VARCHAR(255);
CREATE INDEX `ApprovedItem_domainName_idx` ON `ApprovedItem`(`domainName`);

-- Set domainName on ApprovedItem based on the URL. Include subdomains except www.
UPDATE `ApprovedItem`
SET `domainName` =
  SUBSTRING_INDEX( -- Extract the domain part before any '?', to remove query parameters
    SUBSTRING_INDEX( -- Extract the domain part before any potential port or path
      SUBSTRING_INDEX( -- Extract the part before the first slash '/', to remove path
        REPLACE( -- Remove www.
          REPLACE( -- Remove https://
            REPLACE(-- Remove http://
              LOWER(url), -- Make url lowercase
              'http://', ''
            ),
            'https://', ''
          ),
          'www.', ''
        ),
        '/', -- URL path delimiter
        1
      ),
      ':', -- Port delimiter
      1
    ),
    '?', -- Query parameters delimiter
    1 -- Indicates that we want the part before the first occurrence of '?'
  );

-- CreateTable
CREATE TABLE `TrustedDomain` (
    `domainName` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`domainName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert all domain names into Domain table
INSERT INTO `TrustedDomain` (`domainName`)
  SELECT DISTINCT ai.`domainName`
  FROM `ApprovedItem` ai
  JOIN `ScheduledItem` si ON ai.`id` = si.`approvedItemId`;

-- Make domainName required
ALTER TABLE `ApprovedItem` MODIFY COLUMN `domainName` VARCHAR(255) NOT NULL;
