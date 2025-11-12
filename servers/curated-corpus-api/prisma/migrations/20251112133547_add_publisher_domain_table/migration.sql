-- CreateTable
CREATE TABLE `PublisherDomain` (
    `domainName` VARCHAR(255) NOT NULL,
    `publisher` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(255) NULL,

    PRIMARY KEY (`domainName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert publisher domain data
-- Only insert domains that exist in the ApprovedItem table
INSERT INTO `PublisherDomain` (`domainName`, `publisher`, `createdBy`, `updatedAt`)
SELECT DISTINCT
    dbm.domain_name,
    dbm.name,
    'migration',
    CURRENT_TIMESTAMP(3)
FROM (
    SELECT 'Saveur' as name, 'saveur.com' as domain_name
    UNION ALL SELECT 'Punch', 'punchdrink.com'
    UNION ALL SELECT 'Gematsu', 'gematsu.com'
    UNION ALL SELECT 'VGC', 'videogameschronicle.com'
    UNION ALL SELECT 'Better Homes & Gardens', 'bhg.com'
    UNION ALL SELECT 'Domino', 'domino.com'
    UNION ALL SELECT 'Money', 'money.com'
    UNION ALL SELECT 'Morningstar', 'morningstar.com'
    UNION ALL SELECT 'HISTORY', 'history.com'
    UNION ALL SELECT 'Semafor', 'semafor.com'
    UNION ALL SELECT 'Stylist', 'stylist.co.uk'
    UNION ALL SELECT 'Country Living', 'countryliving.com'
    UNION ALL SELECT 'Baseball America', 'baseballamerica.com'
    UNION ALL SELECT 'National Football League', 'nfl.com'
    UNION ALL SELECT 'FourFourTwo', 'fourfourtwo.com'
    UNION ALL SELECT 'AARP', 'aarp.org'
    UNION ALL SELECT 'National Hockey League', 'nhl.com'
    UNION ALL SELECT 'Science News', 'sciencenews.org'
    UNION ALL SELECT 'Behavioral Scientist', 'behavioralscientist.org'
    UNION ALL SELECT 'SBI Soccer', 'sbisoccer.com'
    UNION ALL SELECT 'Teen Vogue', 'teenvogue.com'
    UNION ALL SELECT 'Empire', 'empireonline.com'
    UNION ALL SELECT 'House Beautiful', 'housebeautiful.com'
) AS dbm
WHERE EXISTS (
    SELECT 1
    FROM ApprovedItem ai
    WHERE ai.domainName = dbm.domain_name
)
ORDER BY dbm.domain_name;
