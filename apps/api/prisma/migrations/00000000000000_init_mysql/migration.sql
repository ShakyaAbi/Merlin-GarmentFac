-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `submissionId` INTEGER NOT NULL,
    `indicatorId` INTEGER NOT NULL,
    `organizationId` INTEGER NOT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_submissionId_idx`(`submissionId`),
    INDEX `AuditLog_indicatorId_idx`(`indicatorId`),
    INDEX `AuditLog_organizationId_idx`(`organizationId`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invitation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `organizationId` INTEGER NOT NULL,
    `invitedByUserId` INTEGER NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'DATA_ENTRY') NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invitation_token_key`(`token`),
    UNIQUE INDEX `Invitation_email_organizationId_key`(`email`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'DATA_ENTRY') NOT NULL,
    `name` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `organizationId` INTEGER NOT NULL,
    `timezone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `notificationPreferences` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `sectors` JSON NULL,
    `location` VARCHAR(191) NULL,
    `donor` VARCHAR(191) NULL,
    `budgetAmount` DOUBLE NULL,
    `budgetSpent` DOUBLE NULL,
    `budgetCurrency` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogframeNode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `type` ENUM('GOAL', 'OUTCOME', 'OUTPUT', 'ACTIVITY') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `assumptions` VARCHAR(191) NULL,
    `risks` VARCHAR(191) NULL,
    `parentId` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LogframeNode_projectId_idx`(`projectId`),
    INDEX `LogframeNode_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Indicator` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `logframeNodeId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `baselineValue` DOUBLE NULL,
    `targetValue` DOUBLE NULL,
    `baselineCategory` VARCHAR(191) NULL,
    `targetCategory` VARCHAR(191) NULL,
    `dataType` ENUM('NUMBER', 'PERCENT', 'TEXT', 'BOOLEAN', 'CATEGORICAL') NOT NULL,
    `minValue` DOUBLE NULL,
    `maxValue` DOUBLE NULL,
    `anomalyConfig` JSON NULL,
    `validationConfig` JSON NULL,
    `categories` JSON NULL,
    `categoryConfig` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reminderEnabled` BOOLEAN NOT NULL DEFAULT false,
    `reminderDaysBeforeDue` INTEGER NULL,
    `reminderDaysAfterDue` INTEGER NULL,
    `reminderRecipients` JSON NULL,
    `createdByUserId` INTEGER NOT NULL,

    INDEX `Indicator_logframeNodeId_idx`(`logframeNodeId`),
    INDEX `Indicator_createdByUserId_idx`(`createdByUserId`),
    INDEX `Indicator_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indicatorId` INTEGER NOT NULL,
    `reportedAt` DATETIME(3) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `categoryValue` VARCHAR(191) NULL,
    `disaggregationKey` VARCHAR(191) NULL,
    `evidence` VARCHAR(191) NULL,
    `createdByUserId` INTEGER NOT NULL,
    `sourceImportJobId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isAnomaly` BOOLEAN NOT NULL DEFAULT false,
    `anomalyReason` VARCHAR(191) NULL,
    `anomalyStatus` ENUM('DETECTED', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE') NULL,
    `anomalyScore` DOUBLE NULL,
    `anomalyThreshold` DOUBLE NULL,
    `anomalyMethod` VARCHAR(191) NULL,
    `anomalyMeta` JSON NULL,
    `anomalyReviewedBy` INTEGER NULL,
    `anomalyReviewedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedByUserId` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedByUserId` INTEGER NULL,

    INDEX `Submission_anomalyReviewedBy_idx`(`anomalyReviewedBy`),
    INDEX `Submission_sourceImportJobId_idx`(`sourceImportJobId`),
    INDEX `Submission_deletedAt_idx`(`deletedAt`),
    INDEX `Submission_deletedByUserId_idx`(`deletedByUserId`),
    INDEX `Submission_updatedByUserId_idx`(`updatedByUserId`),
    INDEX `Submission_indicatorId_idx`(`indicatorId`),
    UNIQUE INDEX `Submission_indicatorId_reportedAt_disaggregationKey_key`(`indicatorId`, `reportedAt`, `disaggregationKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indicatorId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `columnMapping` JSON NOT NULL,
    `createdByUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImportTemplate_indicatorId_idx`(`indicatorId`),
    INDEX `ImportTemplate_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportJob` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importType` ENUM('INDICATOR_DEFINITION', 'SUBMISSION') NOT NULL,
    `indicatorId` INTEGER NULL,
    `templateId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `totalRows` INTEGER NOT NULL,
    `processedRows` INTEGER NOT NULL DEFAULT 0,
    `successfulRows` INTEGER NOT NULL DEFAULT 0,
    `failedRows` INTEGER NOT NULL DEFAULT 0,
    `warningRows` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `importMode` ENUM('CREATE_ONLY', 'UPSERT') NOT NULL DEFAULT 'CREATE_ONLY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `ImportJob_indicatorId_idx`(`indicatorId`),
    INDEX `ImportJob_userId_idx`(`userId`),
    INDEX `ImportJob_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportJobRow` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `rowNumber` INTEGER NOT NULL,
    `rawData` JSON NOT NULL,
    `normalizedData` JSON NULL,
    `validationStatus` ENUM('PENDING', 'VALID', 'WARNING', 'ERROR', 'IMPORTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `errors` JSON NULL,
    `warnings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportJobRow_jobId_idx`(`jobId`),
    INDEX `ImportJobRow_validationStatus_idx`(`validationStatus`),
    UNIQUE INDEX `ImportJobRow_jobId_rowNumber_key`(`jobId`, `rowNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indicatorId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `columnConfig` JSON NOT NULL,
    `filterConfig` JSON NULL,
    `formatConfig` JSON NULL,
    `createdByUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExportTemplate_indicatorId_idx`(`indicatorId`),
    INDEX `ExportTemplate_createdByUserId_idx`(`createdByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `supplierNumber` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `panVatNumber` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `notes` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `openingBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `balance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Supplier_supplierNumber_key`(`supplierNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `customerNumber` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `panVatNumber` VARCHAR(191) NULL,
    `customerType` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `openingBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Customer_customerNumber_key`(`customerNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawMaterialCategory` (
    `id` VARCHAR(191) NOT NULL,
    `categoryName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `RawMaterialCategory_categoryName_key`(`categoryName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `defaultUnit` VARCHAR(191) NOT NULL,
    `unitConversions` JSON NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `costPrice` DECIMAL(65, 30) NULL,
    `reorderLevel` DOUBLE NULL,
    `categoryId` VARCHAR(191) NULL,
    `averageUnitCost` DECIMAL(65, 30) NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `updatedBy` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RawMaterial_sku_key`(`sku`),
    INDEX `RawMaterial_sku_name_idx`(`sku`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinishedGoodProduct` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `productCode` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `articleCategoryId` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'pcs',
    `sellingPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `costPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `reorderLevel` DOUBLE NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `bomData` JSON NULL,
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `FinishedGoodProduct_sku_key`(`sku`),
    UNIQUE INDEX `FinishedGoodProduct_productCode_key`(`productCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `invoiceDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'received',
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `Purchase_invoiceNumber_key`(`invoiceNumber`),
    INDEX `Purchase_supplierId_createdAt_idx`(`supplierId`, `createdAt`),
    INDEX `Purchase_invoiceDate_idx`(`invoiceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(65, 30) NOT NULL,
    `lineTotal` DECIMAL(65, 30) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `change` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `transactionType` VARCHAR(191) NOT NULL DEFAULT 'ADJUSTMENT',
    `balanceAfter` DOUBLE NULL,
    `unitCost` DECIMAL(65, 30) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinishedGoodStockTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `change` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `transactionType` ENUM('SALE_OUT', 'SALE_RETURN', 'ADJUSTMENT', 'PRODUCTION_RECEIPT') NOT NULL DEFAULT 'SALE_OUT',
    `balanceAfter` DOUBLE NULL,
    `unitCost` DECIMAL(65, 30) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LowStockAlert` (
    `id` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acknowledged` BOOLEAN NOT NULL DEFAULT false,
    `acknowledgedBy` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `finishedGoodId` VARCHAR(191) NOT NULL,
    `finishedGoodName` VARCHAR(191) NOT NULL,
    `quantityPlanned` DOUBLE NOT NULL,
    `quantityProduced` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'MATERIAL_ISSUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `issuedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionOrder_orderNumber_key`(`orderNumber`),
    INDEX `ProductionOrder_finishedGoodId_idx`(`finishedGoodId`),
    INDEX `ProductionOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionIssueLine` (
    `id` VARCHAR(191) NOT NULL,
    `productionOrderId` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `bomConsumption` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductionIssueLine_productionOrderId_idx`(`productionOrderId`),
    INDEX `ProductionIssueLine_rawMaterialId_idx`(`rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionCompletionLine` (
    `id` VARCHAR(191) NOT NULL,
    `productionOrderId` VARCHAR(191) NOT NULL,
    `finishedGoodId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductionCompletionLine_productionOrderId_idx`(`productionOrderId`),
    INDEX `ProductionCompletionLine_finishedGoodId_idx`(`finishedGoodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requiredBy` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `subtotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesOrder_orderNumber_key`(`orderNumber`),
    INDEX `SalesOrder_customerId_idx`(`customerId`),
    INDEX `SalesOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `salesOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productCode` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitPrice` DECIMAL(65, 30) NOT NULL,
    `discountAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(65, 30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX …988 tokens truncated…eNumber_key`(`expenseNumber`),
    INDEX `Expense_expenseDate_idx`(`expenseDate`),
    INDEX `Expense_category_idx`(`category`),
    INDEX `Expense_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSequence` (
    `key` VARCHAR(191) NOT NULL,
    `nextNumber` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManufacturingCostLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `productionOrderId` VARCHAR(191) NULL,
    `expenseId` VARCHAR(191) NULL,
    `expenseBucket` VARCHAR(191) NOT NULL,
    `allocationBasis` VARCHAR(191) NOT NULL DEFAULT 'PRODUCTION_BASE_COST',
    `baseCost` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `allocatedOverhead` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `fullyAbsorbedCost` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `overheadRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `source` VARCHAR(191) NOT NULL DEFAULT 'OPERATIONS_SUMMARY',
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ManufacturingCostLedgerEntry_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    INDEX `ManufacturingCostLedgerEntry_productionOrderId_idx`(`productionOrderId`),
    INDEX `ManufacturingCostLedgerEntry_expenseId_idx`(`expenseId`),
    INDEX `ManufacturingCostLedgerEntry_expenseBucket_idx`(`expenseBucket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `entryDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `entryType` ENUM('OPENING_BALANCE', 'SALES_INVOICE', 'PAYMENT_RECEIVED') NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `documentNumber` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `debit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `credit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `runningBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerLedgerEntry_customerId_entryDate_idx`(`customerId`, `entryDate`),
    INDEX `CustomerLedgerEntry_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierPayment` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amount` DECIMAL(65, 30) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SupplierPayment_paymentNumber_key`(`paymentNumber`),
    INDEX `SupplierPayment_supplierId_paymentDate_idx`(`supplierId`, `paymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `entryDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `entryType` ENUM('OPENING_BALANCE', 'PURCHASE_INVOICE', 'PAYMENT_MADE') NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `documentNumber` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `debit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `credit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `runningBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupplierLedgerEntry_supplierId_entryDate_idx`(`supplierId`, `entryDate`),
    INDEX `SupplierLedgerEntry_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArticleCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ArticleCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_customers` (
    `id` VARCHAR(191) NOT NULL,
    `customer_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `pan_vat_number` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `billing_address` VARCHAR(191) NULL,
    `shipping_address` VARCHAR(191) NULL,
    `contact_person` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_customers_customer_code_key`(`customer_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `product_code` VARCHAR(191) NULL,
    `product_name` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 2) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxable_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(14, 2) NOT NULL,
    `cost_price` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `profit_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `warehouse_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_invoice_payments` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `reference_number` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `fiscal_year` VARCHAR(191) NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `invoice_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxable_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `non_taxable_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `grand_total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `paid_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `due_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
    `invoice_status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `printed_count` INTEGER NOT NULL DEFAULT 0,
    `sync_status` VARCHAR(191) NULL,
    `sync_reference` VARCHAR(191) NULL,
    `cancellation_reason` VARCHAR(191) NULL,
    `remarks` VARCHAR(191) NULL,
    `created_by` INTEGER NULL,
    `approved_by` INTEGER NULL,
    `issued_by` INTEGER NULL,
    `cancelled_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `issued_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,

    UNIQUE INDEX `sales_invoices_invoice_number_key`(`invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogframeNode` ADD CONSTRAINT `LogframeNode_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `LogframeNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogframeNode` ADD CONSTRAINT `LogframeNode_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indicator` ADD CONSTRAINT `Indicator_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indicator` ADD CONSTRAINT `Indicator_logframeNodeId_fkey` FOREIGN KEY (`logframeNodeId`) REFERENCES `LogframeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indicator` ADD CONSTRAINT `Indicator_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_anomalyReviewedBy_fkey` FOREIGN KEY (`anomalyReviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_deletedByUserId_fkey` FOREIGN KEY (`deletedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_sourceImportJobId_fkey` FOREIGN KEY (`sourceImportJobId`) REFERENCES `ImportJob`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportTemplate` ADD CONSTRAINT `ImportTemplate_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportTemplate` ADD CONSTRAINT `ImportTemplate_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `ImportTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportJobRow` ADD CONSTRAINT `ImportJobRow_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `ImportJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportTemplate` ADD CONSTRAINT `ExportTemplate_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportTemplate` ADD CONSTRAINT `ExportTemplate_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawMaterial` ADD CONSTRAINT `RawMaterial_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `RawMaterialCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinishedGoodProduct` ADD CONSTRAINT `FinishedGoodProduct_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinishedGoodProduct` ADD CONSTRAINT `FinishedGoodProduct_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinishedGoodProduct` ADD CONSTRAINT `FinishedGoodProduct_articleCategoryId_fkey` FOREIGN KEY (`articleCategoryId`) REFERENCES `ArticleCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinishedGoodStockTransaction` ADD CONSTRAINT `FinishedGoodStockTransaction_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinishedGoodStockTransaction` ADD CONSTRAINT `FinishedGoodStockTransaction_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `FinishedGoodProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LowStockAlert` ADD CONSTRAINT `LowStockAlert_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionOrder` ADD CONSTRAINT `ProductionOrder_finishedGoodId_fkey` FOREIGN KEY (`finishedGoodId`) REFERENCES `FinishedGoodProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionIssueLine` ADD CONSTRAINT `ProductionIssueLine_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `ProductionOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionIssueLine` ADD CONSTRAINT `ProductionIssueLine_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionCompletionLine` ADD CONSTRAINT `ProductionCompletionLine_finishedGoodId_fkey` FOREIGN KEY (`finishedGoodId`) REFERENCES `FinishedGoodProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionCompletionLine` ADD CONSTRAINT `ProductionCompletionLine_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `ProductionOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrder` ADD CONSTRAINT `SalesOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrderItem` ADD CONSTRAINT `SalesOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `FinishedGoodProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesOrderItem` ADD CONSTRAINT `SalesOrderItem_salesOrderId_fkey` FOREIGN KEY (`salesOrderId`) REFERENCES `SalesOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_cancelledBy_fkey` FOREIGN KEY (`cancelledBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_issuedBy_fkey` FOREIGN KEY (`issuedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_salesOrderId_fkey` FOREIGN KEY (`salesOrderId`) REFERENCES `SalesOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoiceItem` ADD CONSTRAINT `SalesInvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `SalesInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoiceItem` ADD CONSTRAINT `SalesInvoiceItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `FinishedGoodProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoicePayment` ADD CONSTRAINT `SalesInvoicePayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `SalesInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoicePayment` ADD CONSTRAINT `SalesInvoicePayment_receivedBy_fkey` FOREIGN KEY (`receivedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturingCostLedgerEntry` ADD CONSTRAINT `ManufacturingCostLedgerEntry_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `ProductionOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturingCostLedgerEntry` ADD CONSTRAINT `ManufacturingCostLedgerEntry_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerLedgerEntry` ADD CONSTRAINT `CustomerLedgerEntry_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayment` ADD CONSTRAINT `SupplierPayment_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierLedgerEntry` ADD CONSTRAINT `SupplierLedgerEntry_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_invoice_items` ADD CONSTRAINT `sales_invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice_payments` ADD CONSTRAINT `sales_invoice_payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoices` ADD CONSTRAINT `sales_invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `sales_customers`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
