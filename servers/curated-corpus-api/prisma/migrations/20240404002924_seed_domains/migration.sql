-- Add nullable domainName column, and set it based on the url using the above function
ALTER TABLE `ApprovedItem` ADD COLUMN `domainName` VARCHAR(255);
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
CREATE TABLE `Domain` (
    `domainName` VARCHAR(255) NOT NULL,
    `isTrusted` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`domainName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert all domain names into Domain table with isTrusted as True
INSERT INTO `Domain` (`domainName`, `isTrusted`)
  SELECT DISTINCT `domainName`, TRUE
  FROM `ApprovedItem`
  ON DUPLICATE KEY UPDATE `domainName` = VALUES(`domainName`);

-- Make domainName required
ALTER TABLE `ApprovedItem` MODIFY COLUMN `domainName` VARCHAR(255) NOT NULL;
ALTER TABLE `ApprovedItem` ADD CONSTRAINT `ApprovedItem_domainName_fkey` FOREIGN KEY (`domainName`) REFERENCES `Domain`(`domainName`) ON DELETE RESTRICT ON UPDATE CASCADE;
