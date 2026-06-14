# Module 3: Raw Material Management — Software Requirements Specification

**Project:** Garment Factory Management System (MERLIN Lite)
**Module:** Raw Material Management
**Version:** 1.0
**Date:** 2026-06-03
**Status:** Draft

---

## 1. Purpose

The Raw Material Management module governs the lifecycle of raw materials used in garment production — from cataloging and categorization through purchase entry, stock tracking, cost recording, adjustments, and consumption history. It is the inventory backbone that feeds into production, costing, and reporting.

This module is designed as the third integration point (after Authentication and Supplier Management) and depends on both.

---

## 2. Scope

| In Scope | Out of Scope (Future) |
|---|---|
| Raw material catalog with categories | Barcode/QR tracking |
| Material units (meter, kg, roll, piece, packet) | Multi-warehouse or branch stock |
| Opening stock entry | VAT/tax-aware costing |
| Purchase entry with supplier linkage | IRD integration |
| Unit cost and average cost tracking | Salary tracking |
| Current stock and low stock alerts | Production consumption logic |
| Stock adjustment with reason | BOM costing |
| Stock transaction history | |
| Active/inactive material status | |
| Search and filtering | |

---

## 3. Existing Architecture & Adaptation Notes

The codebase already contains an inventory module. This SRS describes the enhanced module by extending the existing structure rather than creating a parallel system.

| Existing Location | Purpose |
|---|---|
| `apps/api/src/controllers/inventory/` | Materials, purchases, alerts controllers |
| `apps/api/src/services/inventory/` | Material, supplier, purchase services |
| `apps/api/src/repositories/inventory/` | Material, purchase, stock repositories |
| `apps/api/src/validators/inventoryValidators.ts` | Zod validation schemas |
| `apps/api/src/routes/inventoryRoutes.ts` | Route definitions under `/api/v1/inventory` |
| `apps/api/prisma/schema.prisma` | RawMaterial, Purchase, PurchaseItem, StockTransaction, LowStockAlert models |
| `apps/web/pages/inventory/` | MaterialsPage, MaterialDetail, PurchasesPage, etc. |

Enhancements described below use the same layers — controllers, services, repositories, validators, routes — extended with new fields, validation rules, and audit hooks.

---

## 4. Features

- **F-001 Raw Material Catalog** — Create, view, edit, search, and deactivate raw material records.
- **F-002 Raw Material Categories** — Group materials under user-defined categories (Fabric, Thread, Zipper, etc.).
- **F-003 Material Units** — Support meter, kg, roll, piece, packet as primary units.
- **F-004 Opening Stock Entry** — Initial stock balance recorded on material creation or via a stock adjustment.
- **F-005 Purchase Entry** — Record stock-in transactions linked to suppliers with invoice metadata.
- **F-006 Unit Cost Tracking** — Capture per-purchase unit cost and compute rolling average unit cost.
- **F-007 Current Stock Tracking** — Real-time stock derived from sum of stock transactions.
- **F-008 Low Stock Alerts** — Automatic alert when stock falls at or below minimum stock level.
- **F-009 Stock Adjustment** — Manual increase/decrease with mandatory reason.
- **F-010 Stock Transaction History** — Immutable log of every stock movement.
- **F-011 Search & Filter** — Search by name, SKU, category, status.
- **F-012 Active/Inactive Status** — Deactivate obsolete materials; inactive items hidden from new forms.

---

## 5. Functional Requirements

### FR-001: Create Raw Material
The system shall allow authorized users (Admin, Manager, Inventory Staff) to create raw material records with material name (required), SKU, category, unit (required), opening stock, minimum stock level, unit cost, and notes.

### FR-002: Categorize Materials
The system shall allow users to define and assign raw material categories. Each material belongs to exactly one category.

### FR-003: Store Unit & Cost
The system shall store the primary unit type (meter, kg, roll, piece, packet) and per-purchase unit cost for each material. Average unit cost shall be recalculated after each purchase.

### FR-004: Record Purchases
The system shall allow authorized users to record raw material purchases against a supplier with purchase date, invoice number, line items (material, quantity, unit cost), and notes.

### FR-005: Stock Increase After Purchase
The system shall atomically increase raw material stock upon purchase entry. Stock change equals the purchase quantity.

### FR-006: Stock Transaction Creation
The system shall create an immutable stock transaction record for every stock increase (purchase), decrease (adjustment), or manual correction.

### FR-007: Manual Stock Adjustment
The system shall allow authorized users (Admin, Manager) to adjust stock with a mandatory reason. The adjustment may increase or decrease quantity.

### FR-008: Current Stock Display
The system shall display the current stock quantity for each material, computed as the sum of all stock transactions.

### FR-009: Low Stock Alert
The system shall flag materials whose current stock is at or below the minimum stock level. Alerts shall be visible on the materials list and a dedicated alerts page.

### FR-010: Negative Stock Prevention
The system shall prevent stock from going negative by default. An admin-configurable override may permit negative stock at the organization level.

### FR-011: Transaction History
The system shall allow users to view the full stock transaction history for a material, including purchase, adjustment, and any automated changes.

### FR-012: Audit Logging
The system shall record audit log entries for material creation, update, purchase entry, stock adjustment, and deactivation, capturing the acting user and timestamp.

---

## 6. Database Tables

### 6.1 RawMaterials (extend existing `RawMaterial` model)

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | Primary key (exists) |
| materialName | String | Currently `name`; alias for clarity |
| sku | String? | Unique (exists) |
| categoryId | String? | FK to RawMaterialCategories — **new** |
| unit | String | Currently `defaultUnit` |
| currentStock | Float | Derived from StockTransaction sum (computed, not stored) |
| minimumStockLevel | Float? | Currently `reorderLevel` — **rename semantically** |
| averageUnitCost | Decimal? | Rolling average — **new** |
| status | Boolean | Currently `active`; mapped as Active/Inactive |
| notes | String? | — **new** |
| createdBy | Int? | FK to User (exists) |
| updatedBy | Int? | — **new** |
| createdAt | DateTime | (exists) |
| updatedAt | DateTime | (exists) |
| deletedAt | DateTime? | Soft delete — **new** |

### 6.2 RawMaterialCategories (new)

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | Primary key |
| categoryName | String | Unique |
| description | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| deletedAt | DateTime? | Soft delete |

### 6.3 RawMaterialPurchases (existing `Purchase` model)

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | Primary key (exists) |
| supplierId | String | FK to Supplier (exists) |
| purchaseDate | DateTime | Currently `invoiceDate` |
| invoiceNumber | String? | (exists) |
| totalAmount | Decimal | (exists) |
| notes | String? | (exists) |
| createdBy | Int? | (exists) |
| createdAt | DateTime | (exists) |
| updatedAt | DateTime | (exists) |
| deletedAt | DateTime? | — **new** |

### 6.4 RawMaterialPurchaseItems (existing `PurchaseItem` model)

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | Primary key (exists) |
| purchaseId | String | FK to Purchase (exists) |
| rawMaterialId | String | FK to RawMaterial (exists) |
| quantity | Float | (exists) |
| unitCost | Decimal | Currently `unitPrice` |
| lineTotal | Decimal | (exists) |

### 6.5 RawMaterialStockTransactions (extend existing `StockTransaction` model)

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | Primary key (exists) |
| rawMaterialId | String | FK to RawMaterial (exists) |
| transactionType | String | PURCHASE_IN, ADJUSTMENT, OPENING, etc. — **new** (currently implicit) |
| referenceType | String? | "PURCHASE", "ADJUSTMENT" — **new** |
| referenceId | String? | ID of source document — **new** |
| quantityChange | Float | Currently `change` |
| balanceAfter | Float? | Snapshot after transaction — **new** |
| unitCost | Decimal? | Cost at time of transaction — **new** |
| remarks | String? | Currently `reason` |
| createdBy | Int? | (exists) |
| createdAt | DateTime | (exists) |

---

## 7. API Endpoints

All routes are prefixed with `/api/v1/inventory` and protected by JWT authentication.

### 7.1 Raw Materials

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/materials` | Authenticated | List materials (paginated, filterable by search, category, status) |
| GET | `/materials/:id` | Authenticated | Get single material with category, stock, transactions summary |
| POST | `/materials` | Admin, Manager | Create material |
| PUT | `/materials/:id` | Admin, Manager | Update material |
| PATCH | `/materials/:id/status` | Admin, Manager | Activate/deactivate material |
| DELETE | `/materials/:id` | Admin only | Soft-delete material (block if used in production) |
| POST | `/materials/:id/adjust-stock` | Admin, Manager | Manual stock adjustment with reason |
| GET | `/materials/:id/transactions` | Authenticated | Stock transaction history |

### 7.2 Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/material-categories` | Authenticated | List all categories |
| POST | `/material-categories` | Admin, Manager | Create category |

### 7.3 Purchases

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/purchases` | Admin, Manager | Create purchase with items; atomically updates stock |
| GET | `/purchases` | Authenticated | List purchases (paginated, filterable) |
| GET | `/purchases/:id` | Authenticated | Get purchase with line items |

---

## 8. Module Connections

### 8.1 Authentication & User Management
All endpoints use `authenticate` middleware (JWT). Role-based access uses `requireRoles(ADMIN, MANAGER, ...)`. The `req.user` object provides `id`, `email`, `role`, `organizationId` for audit trails and ownership.

### 8.2 Supplier Management
`RawMaterialPurchases.supplierId` references `Supplier.id`. The supplier must exist and be ACTIVE. Supplier details (name, PAN/VAT) appear on purchase records for reporting.

### 8.3 Production Management (Future)
Production work orders will consume raw materials by referencing `RawMaterial.id` and reducing stock via stock transactions with `transactionType = "PRODUCTION_ISSUE"`.

### 8.4 Costing Management (Future)
`averageUnitCost` on RawMaterial feeds into BOM costing and product cost calculations. Per-purchase `unitCost` enables weighted-average cost flow.

### 8.5 Reports & Dashboard (Future)
- Low stock materials → dashboard alert cards
- Stock valuation (currentStock × averageUnitCost) → financial reports
- Purchase volume by supplier → procurement analytics
- Stock movement trends → inventory turnover reports

### 8.6 Audit Logs
All write operations call `recordAudit()` from `apps/api/src/utils/auditLog.ts` with action, userId, and relevant metadata.

---

## 9. Business Rules

| Rule | Detail |
|---|---|
| BR-01 | Only Admin, Manager, or Inventory Staff can create/edit raw materials. |
| BR-02 | Production Staff can view materials but cannot edit stock unless explicitly permitted. |
| BR-03 | Material name and unit are required. |
| BR-04 | Every stock movement must create a `StockTransaction` record. |
| BR-05 | Manual stock adjustments must include a non-empty reason. |
| BR-06 | Materials referenced in a BOM or production order cannot be permanently deleted (soft-delete only). |
| BR-07 | Deactivated materials (`active = false`) are hidden from new purchase and production forms. |
| BR-08 | Stock shall not go negative by default. Admin may enable negative stock via a config flag. |
| BR-09 | Purchase entry updates stock atomically within a database transaction. |
| BR-10 | `averageUnitCost` is recalculated after each purchase as `(existingStock × existingAvgCost + purchaseQty × purchaseUnitCost) / (existingStock + purchaseQty)`. |

---

## 10. Backend Implementation Details

### 10.1 Validation (Zod schemas)

New schemas in `apps/api/src/validators/inventoryValidators.ts`:

```
createMaterialSchema  — name, sku?, categoryId?, unit, openingStock?, minimumStockLevel?, unitCost?, notes?
updateMaterialSchema  — same as create, all optional
adjustStockSchema     — change, reason (required, non-empty), remarks?
createPurchaseSchema  — supplierId, invoiceDate, invoiceNumber?, notes?, items[] (rawMaterialId, quantity, unitCost)
```

### 10.2 Stock Update Logic (transaction-safe)

```
async function processStockChange(rawMaterialId, change, unitCost, transactionType, referenceType, referenceId, remarks, userId):
  prisma.$transaction(async (tx) => {
    // 1. Insert StockTransaction
    // 2. Compute new balance
    // 3. Update averageUnitCost if purchase
    // 4. Check low stock threshold and create LowStockAlert if needed
    // 5. Record audit log
  })
```

### 10.3 Audit Logging

Call `recordAudit()` from controllers after successful write operations:

```
recordAudit({ action: "material.create", userId, after: { materialId, name, ... } })
recordAudit({ action: "material.purchase", userId, after: { purchaseId, totalAmount } })
recordAudit({ action: "material.adjust_stock", userId, after: { materialId, change, reason } })
recordAudit({ action: "material.delete", userId, after: { materialId } })
```

---

## 11. Frontend Implementation Details

### 11.1 Page Components

| Page | File | Description |
|---|---|---|
| Material List | `apps/web/pages/inventory/MaterialsPage.tsx` | Table with search, category filter, low stock badge, status toggle |
| Material Form | `apps/web/pages/inventory/CreateMaterialPage.tsx` | Create/edit form with all fields |
| Material Detail | `apps/web/pages/inventory/MaterialDetail.tsx` | Detail view with stock, transactions, purchase history |
| Purchase Form | `apps/web/pages/inventory/PurchaseCreate.tsx` | Purchase entry with supplier select and line items |
| Stock Adjustment | `apps/web/components/inventory/StockAdjustmentForm.tsx` | Modal/dialog for manual stock change |

### 11.2 API Service Layer

Create `apps/web/services/rawMaterialApi.ts` with typed functions:

```
createMaterial(data)
getMaterials(params)       — pagination, search, category, status filters
getMaterial(id)
updateMaterial(id, data)
toggleMaterialStatus(id)   — activate/deactivate
deleteMaterial(id)
adjustStock(id, data)
getTransactions(id)
getCategories()
createCategory(data)
createPurchase(data)
getPurchases(params)
getPurchase(id)
```

### 11.3 UI States

Each page must handle:
- **Loading** — Skeleton or spinner
- **Empty** — Informational message with call-to-action
- **Error** — Error message with retry option
- **Success** — Data display with appropriate formatting
- **Edge cases** — Deactivated materials shown with visual indicator; zero stock shown as "0" not "—"

### 11.4 Low Stock Indicator

The materials list table should show a colored badge:
- **Red badge** when `currentStock <= minimumStockLevel`
- Tooltip showing "Reorder now — stock at minimum level"

---

## 12. Permissions Matrix

| Action | Admin | Manager | Inventory Staff | Production Staff | Accountant | Viewer |
|---|---|---|---|---|---|---|
| View materials | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create material | ✓ | ✓ | ✓ | | | |
| Edit material | ✓ | ✓ | ✓ | | | |
| Deactivate material | ✓ | ✓ | | | | |
| Delete material | ✓ | | | | | |
| Create purchase | ✓ | ✓ | ✓ | | | |
| Adjust stock | ✓ | ✓ | | | | |
| View transactions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Acknowledge alerts | ✓ | ✓ | ✓ | | | |

---

## 13. Future Compatibility

- **Invoice Numbers** — Stored per purchase for future purchase return, VAT reporting, and IRD reconciliation.
- **VAT Purchase Analysis** — Unit cost and total amount fields support future tax-aware costing without schema changes.
- **Audit Traceability** — Every stock movement is linked to a user and source document for compliance audits.
- **Tax-Aware Costing** — Average unit cost structure can be extended to include tax components.
- **Barcode/QR Tracking** — SKU field and unique ID enable future scanning integration.
- **Multi-Warehouse** — Stock transaction model supports adding a `warehouseId` field without restructuring.
- **Production Consumption** — `transactionType` field accommodates `PRODUCTION_ISSUE` and `PRODUCTION_RETURN` types.

---

## 14. Non-Functional Requirements

- **Performance** — Material list endpoints shall support pagination (default 20, max 100 per page). Transaction history queries shall return at most 500 records per request.
- **Security** — All endpoints require JWT. Role checks enforced at route level. Inputs validated via Zod.
- **Data Integrity** — Stock updates occur within Prisma `$transaction` blocks. Concurrent stock writes are serialized.
- **Audit** — All destructive or financial-impact actions logged with user identity and timestamp.
