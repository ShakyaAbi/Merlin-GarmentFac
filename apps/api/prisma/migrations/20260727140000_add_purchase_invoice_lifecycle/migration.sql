ALTER TABLE `Purchase`
  ADD COLUMN `paidAmount` DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN `dueAmount` DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN `paymentStatus` ENUM('UNPAID', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN `cancelledBy` INTEGER NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `cancellationReason` VARCHAR(191) NULL;

CREATE TABLE `PurchasePayment` (
  `id` VARCHAR(191) NOT NULL,
  `paymentNumber` VARCHAR(191) NULL,
  `purchaseId` VARCHAR(191) NOT NULL,
  `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `amount` DECIMAL(65,30) NOT NULL,
  `paymentMethod` VARCHAR(191) NOT NULL,
  `note` VARCHAR(191) NULL,
  `createdBy` INTEGER NULL,
  `bankAccountId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PurchasePayment_paymentNumber_key`(`paymentNumber`),
  INDEX `PurchasePayment_purchaseId_paymentDate_idx`(`purchaseId`, `paymentDate`),
  INDEX `PurchasePayment_bankAccountId_idx`(`bankAccountId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PurchasePayment`
  ADD CONSTRAINT `PurchasePayment_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchasePayment_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `OrganizationBankAccount` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
