# Warehouse Module — Design

**Status:** Approved (pending spec review)
**Date:** 2026-06-05
**Scope:** Add per-warehouse stock tracking, stock transfer flow, per-user warehouse permissions, and rolling per-warehouse weighted-average valuation to the garment-factory inventory module.

## Goal

Today `StockTransaction` records a single global balance per `RawMaterial`. This blocks every downstream requirement that depends on physically separating fabric, accessories, WIP, finished goods, and damaged stock. This spec introduces a `Warehouse` model that every stock movement is tagged with, plus a first-class `StockTransfer` flow for moving material between warehouses (production start, damage write-off, etc.).

## Non-goals

- Work Order / production consumption flow (separate spec).
- New roles beyond the existing `ADMIN`, `MANAGER`, `DATA_ENTRY`.
- Multi-location / multi-site warehouses (a warehouse is a single physical zone in one factory).
- Per-bin or rack-level tracking inside a warehouse.
- Reports module (separate spec).

## Decisions captured during brainstorming

1. **Tier:** Full — per-warehouse stock + transfer flow + per-user permissions + rolling valuation.
2. **Permissions:** User ↔ Warehouse assignment table (`UserWarehouseAccess`).
3. **Valuation:** Rolling per-warehouse weighted-average (no nightly snapshot job).
4. **Migration:** Backfill all existing stock transactions and materials to a seeded `Raw Material Warehouse` (`wh_rm`).
5. **Roles:** Keep only `ADMIN`, `MANAGER`, `DATA_ENTRY`. No new roles.

## Schema

### New models

```prisma
enum WarehouseType {
  RAW_MATERIAL
  FABRIC
  ACCESSORIES
  WIP
  FINISHED_GOODS
  DAMAGED
}

model Warehouse {
  id          String         @id @default(cuid())
  code        String         @unique           // "RM", "FAB", "WIP", ...
  name        String                            // "Raw Material Warehouse"
  type        WarehouseType
  description String?
  active      Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  stockTransactions   StockTransaction[]
  defaultForMaterials RawMaterial[]         @relation("DefaultWarehouse")
  userAccess          UserWarehouseAccess[]
  outgoingTransfers   StockTransfer[]       @relation("FromWarehouse")
  incomingTransfers   StockTransfer[]       @relation("ToWarehouse")
  warehouseStocks     MaterialWarehouseStock[]
  lowStockAlerts      LowStockAlert[]
}

model UserWarehouseAccess {
  id          String    @id @default(cuid())
  userId      Int
  user        User      @relation("WarehouseAccess", fields: [userId], references: [id], onDelete: Cascade)
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  canRead     Boolean   @default(true)
  canWrite    Boolean   @default(false)        // adjust, transfer, receive into this warehouse
  createdAt   DateTime  @default(now())
  createdBy   Int?
  @@unique([userId, warehouseId])
  @@index([userId])
  @@index([warehouseId])
}

model StockTransfer {
  id              String    @id @default(cuid())
  fromWarehouseId String
  fromWarehouse   Warehouse @relation("FromWarehouse", fields: [fromWarehouseId], references: [id])
  toWarehouseId   String
  toWarehouse     Warehouse @relation("ToWarehouse", fields: [toWarehouseId], references: [id])
  reason          String                          // "production_start", "damage", "manual", "wip_to_fg"
  notes           String?
  createdBy       Int?
  createdAt       DateTime  @default(now())
  lines           StockTransferLine[]
  @@index([fromWarehouseId])
  @@index([toWarehouseId])
  @@index([createdAt])
}

model StockTransferLine {
  id            String   @id @default(cuid())
  transferId    String
  transfer      StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  rawMaterialId String
  rawMaterial   RawMaterial @relation(fields: [rawMaterialId], references: [id])
  quantity      Float
  unit          String
  unitCost      Decimal?                         // snapshot of source weighted-avg at transfer time
  pairedTransactions StockTransaction[]
  @@index([transferId])
  @@index([rawMaterialId])
}

model MaterialWarehouseStock {
  id            String      @id @default(cuid())
  rawMaterialId String
  rawMaterial   RawMaterial @relation(fields: [rawMaterialId], references: [id], onDelete: Cascade)
  warehouseId   String
  warehouse     Warehouse   @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  quantity      Float       @default(0)
  avgUnitCost   Decimal     @default(0)
  totalValue    Decimal     @default(0)
  updatedAt     DateTime    @updatedAt
  @@unique([rawMaterialId, warehouseId])
  @@index([warehouseId])
}
```

### Changes to existing models

- `RawMaterial`
  - Add `defaultWarehouseId String?`
  - Add relation `defaultWarehouse Warehouse? @relation("DefaultWarehouse", fields: [defaultWarehouseId], references: [id])`
  - Add reverse relations: `warehouseStocks MaterialWarehouseStock[]`, `transferLines StockTransferLine[]`
  - Existing `averageUnitCost` field is **kept** and becomes a denormalized cross-warehouse rollup (sum of `MaterialWarehouseStock.totalValue` / sum of `MaterialWarehouseStock.quantity`), recomputed inside `recordStockChange` after the per-warehouse update. Existing UI reads keep working without changes during the transition.
- `StockTransaction`
  - Add `warehouseId String` (nullable in migration A, NOT NULL after backfill in migration B)
  - Add relation `warehouse Warehouse @relation(fields: [warehouseId], references: [id])`
  - Add `transferLineId String?` + relation to `StockTransferLine`
  - Add `@@index([warehouseId])`
- `LowStockAlert`
  - Add `warehouseId String?` + relation. Nullable to allow material-wide alerts during transition; new alerts always set it.
- `User`
  - Add reverse relation `warehouseAccess UserWarehouseAccess[] @relation("WarehouseAccess")`

`Role` enum is **unchanged**.

## Migration plan

Two migrations + an idempotent seed step between them.

### Migration A — `add_warehouses`
1. Create enum `WarehouseType`.
2. Create tables: `Warehouse`, `UserWarehouseAccess`, `StockTransfer`, `StockTransferLine`, `MaterialWarehouseStock`.
3. Alter `StockTransaction`: add nullable `warehouseId`, nullable `transferLineId`, indexes, FKs.
4. Alter `RawMaterial`: add nullable `defaultWarehouseId`, FK.
5. Alter `LowStockAlert`: add nullable `warehouseId`, FK.

### Seed step (between migrations)
Run as part of `seed_inventory.ts` and as a one-off script `apps/api/prisma/backfill_warehouses.ts`:

```sql
-- Seeded with fixed ids so the migration is idempotent and repeatable.
INSERT INTO "Warehouse" (id, code, name, type, active, "createdAt", "updatedAt")
VALUES
  ('wh_rm',  'RM',  'Raw Material Warehouse',  'RAW_MATERIAL',   true, now(), now()),
  ('wh_fab', 'FAB', 'Fabric Warehouse',        'FABRIC',         true, now(), now()),
  ('wh_acc', 'ACC', 'Accessories Warehouse',   'ACCESSORIES',    true, now(), now()),
  ('wh_wip', 'WIP', 'Work In Progress Warehouse', 'WIP',         true, now(), now()),
  ('wh_fg',  'FG',  'Finished Goods Warehouse', 'FINISHED_GOODS', true, now(), now()),
  ('wh_dmg', 'DMG', 'Damaged Material Warehouse', 'DAMAGED',     true, now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE "StockTransaction" SET "warehouseId" = 'wh_rm' WHERE "warehouseId" IS NULL;
UPDATE "RawMaterial"      SET "defaultWarehouseId" = 'wh_rm' WHERE "defaultWarehouseId" IS NULL;
```

After this, rebuild `MaterialWarehouseStock` cache from the now-tagged `StockTransaction` rows (single SQL aggregate per material, see Services below).

### Migration B — `enforce_warehouse_not_null`
1. `ALTER TABLE "StockTransaction" ALTER COLUMN "warehouseId" SET NOT NULL`
2. No change to `RawMaterial.defaultWarehouseId` — it stays nullable (a material can be unassigned).
3. No change to `LowStockAlert.warehouseId` — stays nullable for legacy alerts.

If Migration B fails because some row still has NULL `warehouseId`, the seed step was skipped. Operators re-run the seed and retry B.

## Services

### `stockTransactionService.recordStockChange`
Signature gains required `warehouseId`. Inside one Prisma transaction:

1. Compute current per-warehouse balance: `SUM(change)` from `StockTransaction WHERE rawMaterialId=? AND warehouseId=?`.
2. `balanceAfter = current + change`. If `< 0`, throw `InsufficientStockError` with warehouse name.
3. Insert `StockTransaction` with `warehouseId`, `balanceAfter`, `unitCost`, `transferLineId`.
4. Upsert `MaterialWarehouseStock` for `(rawMaterialId, warehouseId)`:
   - If `change > 0` and `unitCost != null` (i.e. a receive), recompute weighted average:
     `newAvg = (oldQty*oldAvg + change*unitCost) / (oldQty + change)`
   - If `change < 0` (issue), keep `avgUnitCost` unchanged, decrement `quantity`.
   - Recompute `totalValue = quantity * avgUnitCost`.
5. Low-stock check: compare per-warehouse `quantity` against `RawMaterial.reorderLevel`. If breached, upsert a `LowStockAlert` with `warehouseId` (no duplicate unacknowledged alerts per warehouse).

### `stockTransferService.executeTransfer` (new)
Inputs: `fromWarehouseId`, `toWarehouseId`, `reason`, `notes?`, `lines: [{rawMaterialId, quantity, unit}]`, `createdBy`.

Atomic Prisma transaction:
1. Validate source ≠ destination.
2. For each line, read source `MaterialWarehouseStock`; ensure `quantity >= line.quantity`. Snapshot `unitCost = source.avgUnitCost`.
3. Insert `StockTransfer` header, then `StockTransferLine` per line.
4. For each line, call `recordStockChange` twice within the same `$transaction`:
   - source: `change = -quantity`, `transactionType = 'TRANSFER_OUT'`, `transferLineId = line.id`, `unitCost = snapshot`
   - destination: `change = +quantity`, `transactionType = 'TRANSFER_IN'`, `transferLineId = line.id`, `unitCost = snapshot`
5. Low-stock recheck runs naturally inside the inner call.
6. Return transfer with lines.

### `purchaseRepository.createPurchaseTransactional`
Each `PurchaseItem` payload gains optional `warehouseId`. Default resolution order:
1. Payload `warehouseId`.
2. `RawMaterial.defaultWarehouseId`.
3. `wh_rm` (seeded fallback).

The generated `StockTransaction` carries that `warehouseId` and `transactionType = 'PURCHASE_IN'`. `unitCost = unitPrice`.

### `materialsController.adjustStock`
Payload gains optional `warehouseId` (defaults to material default, then `wh_rm`). Calls `recordStockChange` with `transactionType = 'ADJUSTMENT'` and that warehouse.

### Cache rebuild helper (one-off + repair tool)
`rebuildMaterialWarehouseStock(materialId?)`:
- For each `(materialId, warehouseId)` pair in `StockTransaction`, compute `SUM(change)` and a weighted-average of `unitCost` over rows with `change > 0 AND unitCost IS NOT NULL`.
- Upsert into `MaterialWarehouseStock`.
- Run at end of seed step. Expose as `npm run inventory:rebuild-stock-cache` for manual repair.

## Permissions

Two middleware layers compose per route:

### Role gate (existing `requireRoles`)
- Catalog management (warehouse CRUD, user-warehouse assignment, material default): `ADMIN`, `MANAGER`.
- Stock movement (purchase, adjustment, transfer): `ADMIN`, `MANAGER`, `DATA_ENTRY`.
- Read endpoints: all authenticated users.

### Warehouse gate (new `requireWarehouseAccess`)
Factory: `requireWarehouseAccess({ resolveWarehouseIds, mode })`
- `resolveWarehouseIds(req)` returns one or more warehouse ids extracted from body/params (e.g. transfer reads both `fromWarehouseId` and `toWarehouseId`; purchase reads each line's `warehouseId`).
- `mode` is `'read'` or `'write'`.
- `ADMIN` and `MANAGER` bypass.
- `DATA_ENTRY` must have a `UserWarehouseAccess` row with the matching flag for every resolved warehouse id. Missing access on any one warehouse → `403`.

Read endpoints for listings (e.g. `GET /inventory/warehouses`) filter to accessible warehouses for `DATA_ENTRY`; do not 403.

## Routes

New:
```
GET    /inventory/warehouses                              list (scoped for DATA_ENTRY)
POST   /inventory/warehouses                              ADMIN/MANAGER
GET    /inventory/warehouses/:id                          detail
PATCH  /inventory/warehouses/:id                          ADMIN/MANAGER
GET    /inventory/warehouses/:id/stock                    material balances + values in this warehouse
GET    /inventory/warehouses/:id/value                    totalQuantity + totalValue summary

POST   /inventory/transfers                               create (warehouse-write gated on both sides)
GET    /inventory/transfers                               list, filters: warehouse/material/dateFrom/dateTo
GET    /inventory/transfers/:id                           detail with lines

GET    /inventory/materials/:id/stock-by-warehouse        breakdown for one material

GET    /inventory/users/:userId/warehouse-access          ADMIN
PUT    /inventory/users/:userId/warehouse-access          ADMIN — replace full list for that user
DELETE /inventory/users/:userId/warehouse-access/:warehouseId   ADMIN
```

Modified:
```
POST  /inventory/materials                  body accepts defaultWarehouseId
PUT   /inventory/materials/:id              body accepts defaultWarehouseId
POST  /inventory/purchases                  each item accepts warehouseId
PATCH /inventory/materials/:id/adjust-stock body accepts warehouseId
GET   /inventory/alerts                     response includes warehouse
```

## Validators (Zod)

New schemas in `inventoryValidators.ts`:
- `createWarehouseSchema`: code (1–10 chars, uppercase enforced), name (1–120), type (enum), description, active.
- `updateWarehouseSchema`: partial of the above, excluding code (code is immutable to keep transaction history readable).
- `createTransferSchema`: fromWarehouseId, toWarehouseId (must differ), reason (1–60), notes, lines (≥1, each {rawMaterialId, quantity > 0, unit}).
- `userWarehouseAccessSchema`: array of {warehouseId, canRead, canWrite}.
- Extend `createPurchaseSchema` and `adjustStockSchema` to accept optional `warehouseId`.

## Frontend

### New pages
- `apps/web/pages/inventory/WarehousesPage.tsx` — list with type badge, current value, low-stock count.
- `apps/web/pages/inventory/WarehouseDetail.tsx` — material balances table, recent transactions, total value card.
- `apps/web/pages/inventory/CreateTransferPage.tsx` — select source + destination warehouse, add lines (autocomplete material, qty), preview cost snapshot, submit.
- `apps/web/pages/inventory/admin/UserWarehouseAccessPage.tsx` — ADMIN-only, select user, toggle warehouses + read/write.

### Modified pages
- `MaterialsPage.tsx` — add "Total Value" column (sum of `totalValue` across warehouses); expandable row showing per-warehouse stock.
- `MaterialDetail.tsx` — replace single `currentStock` with stock-by-warehouse table; transactions table gains "Warehouse" column.
- `CreateMaterialPage.tsx` — add Default Warehouse dropdown.
- `PurchaseCreate.tsx` — per-line Warehouse dropdown defaulting to material default.
- `AlertsPage.tsx` — show warehouse name alongside material.
- `Layout.tsx` sidebar — new section "Warehouses" with links to Warehouses list and Transfers list.

### API client
Add typed helpers to `apps/web/services/api.ts`:
- `listWarehouses`, `getWarehouse`, `createWarehouse`, `updateWarehouse`, `getWarehouseStock`, `getWarehouseValue`
- `listTransfers`, `getTransfer`, `createTransfer`
- `getMaterialStockByWarehouse`
- `getUserWarehouseAccess`, `setUserWarehouseAccess`, `removeUserWarehouseAccess`

## Tests

Located in `apps/api/src/__tests__/`:

### Validator tests (`warehouseValidators.test.ts`)
- Warehouse create rejects lowercase code, requires type, enforces length bounds.
- Transfer create rejects same source/dest, rejects empty lines, rejects quantity ≤ 0.

### Service tests (`stockTransactionService.warehouse.test.ts`)
- `recordStockChange` enforces per-warehouse non-negative balance: succeeds in warehouse A even when warehouse B has zero.
- Weighted-average: receive 10 @ NPR 100, then 10 @ NPR 200 → avg = 150; issue 5 → avg stays 150, qty = 15.
- Cross-warehouse: receive in A then transfer to B carries source avg cost into B.
- Low-stock alert fires per warehouse and dedupes per warehouse.

### Transfer service tests (`stockTransferService.test.ts`)
- Atomic: simulate failure on second line; first line's source decrement is rolled back.
- Insufficient source stock throws and writes nothing.
- Source/dest identical is rejected before any writes.

### Permission tests (`warehouseAccess.test.ts`)
- DATA_ENTRY without access to Fabric Warehouse → 403 on purchase line into Fabric Warehouse.
- DATA_ENTRY with read-only access → 403 on adjust-stock, 200 on stock listing.
- ADMIN/MANAGER bypass.
- Transfer requires write access on both sides.

### Migration smoke test (`migration.warehouses.test.ts`)
- Seed an old-shape stock transaction (warehouseId NULL via raw SQL), run backfill script, assert it ends up in `wh_rm`.
- Rebuild cache from transactions matches sum of changes.

## Audit logging

Every write hook records to `AuditLog` via `recordAudit` (the existing helper). Until the broader audit-log refactor lands, use the existing helper unchanged but tag `action` with the new verbs:
- `warehouse.create`, `warehouse.update`
- `warehouse_access.set`, `warehouse_access.remove`
- `transfer.create`
- `material.adjust_stock` and `purchase.create` continue to log; their `meta` field gains `warehouseId`(s).

## Rollout

1. Land the spec + plan.
2. PR 1: Migration A + seed + backfill + cache rebuild + repair script. Deployable in isolation; nothing reads warehouse columns yet.
3. PR 2: Service layer changes + new routes + validators + tests. `warehouseId` becomes required at the API boundary.
4. PR 3: Migration B (NOT NULL).
5. PR 4: Frontend pages + sidebar.

PR 1 and 2 can ship the same day; PR 3 must come after PR 2 has been live long enough that no new NULL writes are possible.

## Open risks

- **Cache drift**: `MaterialWarehouseStock` can drift if a code path writes a `StockTransaction` without going through `recordStockChange`. Mitigation: repair script + a periodic sanity job that compares cache to aggregate and logs deltas (post-MVP).
- **Decimal precision**: weighted-average computed in JS as `number`. Risk of float drift on long histories. Mitigation: rebuild from source-of-truth transactions at any time; cache is recomputable.
- **Concurrent transfers on same `(material, warehouse)`**: a row-level lock or `SELECT ... FOR UPDATE` on the cache row may be needed. Decision: rely on Prisma `$transaction` serializable isolation level for now; revisit if production hits conflict errors.

## Acceptance criteria

- A user can create, list, update warehouses (6 seeded by default).
- Every new stock transaction is tagged with a warehouse.
- Existing stock transactions all show `Raw Material Warehouse` after migration.
- A purchase line can specify a destination warehouse; defaults work.
- A stock adjustment specifies a warehouse.
- A user can create a transfer that atomically moves quantity from one warehouse to another, with cost snapshot preserved.
- `MaterialWarehouseStock` shows correct per-warehouse quantity, average cost, and total value after each operation.
- Low-stock alerts identify the warehouse that triggered them.
- DATA_ENTRY without `UserWarehouseAccess` for a warehouse cannot write into it; ADMIN/MANAGER always can.
- Frontend `MaterialsPage`, `MaterialDetail`, `CreateMaterialPage`, `PurchaseCreate`, `AlertsPage` reflect the warehouse dimension.
- All new and modified validators, services, and permissions have tests; tests pass under `npm run test:api`.
