CREATE TABLE `OrganizationBankAccount` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` INTEGER NOT NULL,
  `bankName` VARCHAR(191) NOT NULL,
  `accountName` VARCHAR(191) NOT NULL,
  `accountNumber` VARCHAR(191) NOT NULL,
  `branchName` VARCHAR(191) NOT NULL,
  `branchCode` VARCHAR(100) NULL,
  `accountType` VARCHAR(50) NOT NULL DEFAULT 'CURRENT',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NPR',
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OrganizationBankAccount_organizationId_active_idx` (`organizationId`, `active`),
  INDEX `OrganizationBankAccount_organizationId_accountNumber_idx` (`organizationId`, `accountNumber`),
  CONSTRAINT `OrganizationBankAccount_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SalesInvoicePayment`
  ADD COLUMN `bankAccountId` VARCHAR(191) NULL,
  ADD INDEX `SalesInvoicePayment_bankAccountId_idx` (`bankAccountId`),
  ADD CONSTRAINT `SalesInvoicePayment_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `OrganizationBankAccount` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SupplierPayment`
  ADD COLUMN `bankAccountId` VARCHAR(191) NULL,
  ADD INDEX `SupplierPayment_bankAccountId_idx` (`bankAccountId`),
  ADD CONSTRAINT `SupplierPayment_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `OrganizationBankAccount` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
