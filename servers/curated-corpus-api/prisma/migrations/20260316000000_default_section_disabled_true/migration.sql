-- AlterTable: change the default value of `disabled` from false to true
-- so that newly created ML sections require explicit enablement.
ALTER TABLE `Section` ALTER COLUMN `disabled` SET DEFAULT true;
