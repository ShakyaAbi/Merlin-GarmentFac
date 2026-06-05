# Warehouse Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-warehouse stock tracking, warehouse access control, stock transfers, and warehouse-aware purchasing/adjustments to the existing raw-material inventory module.

**Architecture:** Extend the current Prisma-backed inventory stack instead of introducing a parallel system. Stock movements stay transactional in the API, but every movement becomes warehouse-tagged and rolls into a cache table for fast current-balance/value reads. The web app keeps the existing inventory pages and adds warehouse-focused screens plus per-page warehouse selection.

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, TypeScript, React, React Router, Jest, ts-jest, Tailwind CSS, Vite.

---

### Task 1: Add warehouse schema and cache tables

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260605_add_warehouses/migration.sql`
- Modify: `apps/api/prisma/seed_inventory.ts`
- Create: `apps/api/src/scripts/backfillWarehouses.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
// apps/api/src/__tests__/warehouseSchema.test.ts
import { PrismaClient } from '@prisma/client'

describe('warehouse schema', () => {
  it('exposes warehouse models and warehouse-linked stock fields', async () => {
    const prisma = new PrismaClient()
    expect(prisma.warehouse).toBeDefined()
    expect(prisma.userWarehouseAccess).toBeDefined()
    expect(prisma.stockTransfer).toBeDefined()
    expect(prisma.materialWarehouseStock).toBeDefined()
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 2: Run the test to verify the schema is missing**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/warehouseSchema.test.ts`

Expected: fail until Prisma schema and client are regenerated.

- [ ] **Step 3: Add the schema models and fields**

Add these to `apps/api/prisma/schema.prisma`:

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
  code        String         @unique
  name        String
  type        WarehouseType
  description String?
  active      Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  stockTransactions   StockTransaction[]
  defaultForMaterials RawMaterial[] @relation("DefaultWarehouse")
  userAccess          UserWarehouseAccess[]
  outgoingTransfers   StockTransfer[] @relation("FromWarehouse")
  incomingTransfers   StockTransfer[] @relation("ToWarehouse")
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
  canWrite    Boolean   @default(false)
  createdBy   Int?
  createdAt   DateTime  @default(now())

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
  reason          String
  notes           String?
  createdBy       Int?
  createdAt       DateTime  @default(now())
  lines           StockTransferLine[]
}

model StockTransferLine {
  id            String  @id @default(cuid())
  transferId    String
  transfer      StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  rawMaterialId String
  rawMaterial   RawMaterial @relation(fields: [rawMaterialId], references: [id])
  quantity      Float
  unit          String
  unitCost      Decimal?
  pairedTransactions StockTransaction[]
}

model MaterialWarehouseStock {
  id            String   @id @default(cuid())
  rawMaterialId String
  rawMaterial   RawMaterial @relation(fields: [rawMaterialId], references: [id], onDelete: Cascade)
  warehouseId   String
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  quantity      Float    @default(0)
  avgUnitCost   Decimal   @default(0)
  totalValue    Decimal   @default(0)
  updatedAt     DateTime  @updatedAt

  @@unique([rawMaterialId, warehouseId])
  @@index([warehouseId])
}
```

Extend existing models:

```prisma
model RawMaterial {
  defaultWarehouseId String?
  defaultWarehouse   Warehouse? @relation("DefaultWarehouse", fields: [defaultWarehouseId], references: [id])
  warehouseStocks    MaterialWarehouseStock[]
  transferLines      StockTransferLine[]
  averageUnitCost     Decimal? @default(0)
}

model StockTransaction {
  warehouseId     String
  warehouse       Warehouse @relation(fields: [warehouseId], references: [id])
  transferLineId  String?
  transferLine    StockTransferLine? @relation(fields: [transferLineId], references: [id])
  @@index([warehouseId])
}

model LowStockAlert {
  warehouseId   String?
  warehouse     Warehouse? @relation(fields: [warehouseId], references: [id])
}

model User {
  warehouseAccess UserWarehouseAccess[] @relation("WarehouseAccess")
}
```

- [ ] **Step 4: Create and apply migration A**

Run: `npx prisma migrate dev --name add_warehouses`

Expected: migration creates the new tables and nullable warehouse columns.

- [ ] **Step 5: Seed the six warehouses and backfill existing rows**

Update `apps/api/prisma/seed_inventory.ts` to insert these fixed warehouse ids:

```ts
await prisma.warehouse.createMany({
  data: [
    { id: 'wh_rm', code: 'RM', name: 'Raw Material Warehouse', type: 'RAW_MATERIAL' },
    { id: 'wh_fab', code: 'FAB', name: 'Fabric Warehouse', type: 'FABRIC' },
    { id: 'wh_acc', code: 'ACC', name: 'Accessories Warehouse', type: 'ACCESSORIES' },
    { id: 'wh_wip', code: 'WIP', name: 'Work In Progress Warehouse', type: 'WIP' },
    { id: 'wh_fg', code: 'FG', name: 'Finished Goods Warehouse', type: 'FINISHED_GOODS' },
    { id: 'wh_dmg', code: 'DMG', name: 'Damaged Material Warehouse', type: 'DAMAGED' },
  ],
  skipDuplicates: true,
})
```

Create `apps/api/src/scripts/backfillWarehouses.ts` that:

```ts
import { prisma } from '../prisma'

async function main() {
  await prisma.stockTransaction.updateMany({ where: { warehouseId: null }, data: { warehouseId: 'wh_rm' } })
  await prisma.rawMaterial.updateMany({ where: { defaultWarehouseId: null }, data: { defaultWarehouseId: 'wh_rm' } })
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 6: Rebuild the Prisma client**

Run: `npm --workspace apps/api run prisma:generate`

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/prisma/seed_inventory.ts apps/api/src/scripts/backfillWarehouses.ts
git commit -m "feat(inventory): add warehouses and stock cache models"
```

---

### Task 2: Add warehouse-aware validators and middleware

**Files:**
- Modify: `apps/api/src/validators/inventoryValidators.ts`
- Modify: `apps/api/src/middleware/rbac.ts`
- Create: `apps/api/src/middleware/warehouseAccess.ts`
- Modify: `apps/api/src/__tests__/inventoryValidators.test.ts`
- Create: `apps/api/src/__tests__/warehouseAccess.test.ts`

- [ ] **Step 1: Write the failing validator and access tests**

```ts
// apps/api/src/__tests__/warehouseAccess.test.ts
import { requireWarehouseAccess } from '../middleware/warehouseAccess'

describe('warehouse access middleware', () => {
  it('blocks data entry users without access', async () => {
    const middleware = requireWarehouseAccess({ resolveWarehouseIds: () => ['wh_fab'], mode: 'write' })
    await expect(middleware(mockReq('DATA_ENTRY'), mockRes(), mockNext)).resolves.toBeUndefined()
  })
})
```

```ts
// apps/api/src/__tests__/inventoryValidators.test.ts
it('accepts warehouse ids on purchase and stock adjustment payloads', () => {
  expect(createPurchaseSchema.parse({
    supplierId: 'sup_1',
    invoiceDate: '2026-06-02',
    items: [{ rawMaterialId: 'mat_1', quantity: 10, unit: 'Meter', unitPrice: 200, warehouseId: 'wh_fab' }],
  })).toBeTruthy()

  expect(adjustStockSchema.parse({
    change: 5,
    unit: 'Meter',
    reason: 'opening stock correction',
    warehouseId: 'wh_rm',
  })).toBeTruthy()
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts src/__tests__/warehouseAccess.test.ts`

Expected: fail until schemas and middleware exist.

- [ ] **Step 3: Add schemas and middleware**

Add to `inventoryValidators.ts`:

```ts
export const warehouseTypeSchema = z.enum(['RAW_MATERIAL', 'FABRIC', 'ACCESSORIES', 'WIP', 'FINISHED_GOODS', 'DAMAGED'])

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(1).max(10),
  name: z.string().trim().min(1),
  type: warehouseTypeSchema,
  description: z.string().trim().optional(),
  active: z.coerce.boolean().optional(),
})

export const updateWarehouseSchema = createWarehouseSchema.partial().omit({ code: true })

export const userWarehouseAccessSchema = z.object({
  warehouseId: z.string().trim().min(1),
  canRead: z.coerce.boolean().optional(),
  canWrite: z.coerce.boolean().optional(),
})

export const createTransferSchema = z.object({
  fromWarehouseId: z.string().trim().min(1),
  toWarehouseId: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  lines: z.array(z.object({
    rawMaterialId: z.string().trim().min(1),
    quantity: z.coerce.number().positive(),
    unit: z.string().trim().min(1),
  })).min(1),
})

export const createPurchaseSchema = z.object({
  supplierId: z.string().trim().min(1),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  currency: z.string().optional(),
  items: z.array(purchaseItemSchema.extend({ warehouseId: z.string().trim().optional() })).min(1),
  notes: z.string().optional(),
})

export const adjustStockSchema = z.object({
  change: z.coerce.number(),
  unit: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  referenceId: z.string().trim().optional(),
  transactionType: z.string().trim().optional(),
  unitCost: z.coerce.number().optional(),
  warehouseId: z.string().trim().optional(),
})
```

Create `apps/api/src/middleware/warehouseAccess.ts`:

```ts
import { NextFunction, Request, Response } from 'express'
import { prisma } from '../prisma'
import { ForbiddenError } from '../utils/errors'

export function requireWarehouseAccess(params: {
  resolveWarehouseIds: (req: Request) => string[]
  mode: 'read' | 'write'
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) return next(new ForbiddenError('Insufficient permissions'))
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return next()

    const warehouseIds = [...new Set(params.resolveWarehouseIds(req).filter(Boolean))]
    if (warehouseIds.length === 0) return next()

    const accessRows = await prisma.userWarehouseAccess.findMany({
      where: { userId: user.id, warehouseId: { in: warehouseIds } },
    })

    const allowed = new Set(
      accessRows
        .filter((row) => params.mode === 'read' ? row.canRead : row.canWrite)
        .map((row) => row.warehouseId),
    )

    if (warehouseIds.some((id) => !allowed.has(id))) {
      return next(new ForbiddenError('Insufficient warehouse access'))
    }

    return next()
  }
}
```

- [ ] **Step 4: Run the tests again**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts src/__tests__/warehouseAccess.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/validators/inventoryValidators.ts apps/api/src/middleware/rbac.ts apps/api/src/middleware/warehouseAccess.ts apps/api/src/__tests__/inventoryValidators.test.ts apps/api/src/__tests__/warehouseAccess.test.ts
git commit -m "feat(inventory): add warehouse-aware validation and access control"
```

---

### Task 3: Make stock transactions warehouse-aware

**Files:**
- Modify: `apps/api/src/services/inventory/stockTransactionService.ts`
- Modify: `apps/api/src/repositories/inventory/materialRepository.ts`
- Modify: `apps/api/src/controllers/inventory/materialsController.ts`
- Modify: `apps/api/src/repositories/inventory/purchaseRepository.ts`
- Modify: `apps/api/src/controllers/inventory/purchasesController.ts`
- Modify: `apps/api/src/controllers/inventory/alertsController.ts`
- Create: `apps/api/src/services/inventory/warehouseStockService.ts`
- Create: `apps/api/src/__tests__/stockTransactionWarehouse.test.ts`
- Create: `apps/api/src/__tests__/purchaseWarehouse.test.ts`

- [ ] **Step 1: Write the failing warehouse stock tests**

```ts
// apps/api/src/__tests__/stockTransactionWarehouse.test.ts
describe('recordStockChange warehouse balance', () => {
  it('tracks balance per warehouse', async () => {
    // create material, two warehouse stock rows, add stock in one warehouse only
  })
})
```

```ts
// apps/api/src/__tests__/purchaseWarehouse.test.ts
describe('purchase creates warehouse-tagged stock', () => {
  it('defaults to material default warehouse', async () => {
    // create purchase item without warehouseId and assert transaction uses defaultWarehouseId
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/stockTransactionWarehouse.test.ts src/__tests__/purchaseWarehouse.test.ts`

- [ ] **Step 3: Add warehouse-aware balance and cache helpers**

Create `apps/api/src/services/inventory/warehouseStockService.ts` with helpers for:
- `getWarehouseBalance(rawMaterialId, warehouseId)`
- `upsertWarehouseStock(rawMaterialId, warehouseId, deltaQty, unitCost?)`
- `rebuildMaterialWarehouseStock(materialId?)`

Implementation rules:
- Use `StockTransaction` as source of truth.
- Keep `MaterialWarehouseStock` synchronized inside the same Prisma transaction as the write.
- Recompute `RawMaterial.averageUnitCost` as the global rollup across all warehouses.

- [ ] **Step 4: Update stock transaction writes**

Change `recordStockChange()` so it requires `warehouseId`, stores it on `StockTransaction`, computes balance per `(rawMaterialId, warehouseId)`, updates `MaterialWarehouseStock`, and creates per-warehouse low-stock alerts.

- [ ] **Step 5: Update purchase flow to pass warehouse ids**

Change `createPurchaseTransactional()` to accept `warehouseId` on each item and resolve the destination in this order:
1. line warehouse
2. raw material default warehouse
3. `wh_rm`

Change the purchase controller so validation includes the warehouse field and the audit payload includes warehouse ids.

- [ ] **Step 6: Update manual stock adjustment and alerts**

Change `materialsController.adjustStock()` to accept `warehouseId` and record the adjustment in that warehouse.

Change `alertsController.list()` so each alert includes the warehouse name and `warehouseId`.

- [ ] **Step 7: Run the targeted tests**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/stockTransactionWarehouse.test.ts src/__tests__/purchaseWarehouse.test.ts`

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/services/inventory/stockTransactionService.ts apps/api/src/services/inventory/warehouseStockService.ts apps/api/src/repositories/inventory/materialRepository.ts apps/api/src/repositories/inventory/purchaseRepository.ts apps/api/src/controllers/inventory/materialsController.ts apps/api/src/controllers/inventory/purchasesController.ts apps/api/src/controllers/inventory/alertsController.ts apps/api/src/__tests__/stockTransactionWarehouse.test.ts apps/api/src/__tests__/purchaseWarehouse.test.ts
git commit -m "feat(inventory): make stock transactions warehouse-aware"
```

---

### Task 4: Add warehouse CRUD and access management routes

**Files:**
- Create: `apps/api/src/repositories/inventory/warehouseRepository.ts`
- Create: `apps/api/src/services/inventory/warehouseService.ts`
- Create: `apps/api/src/controllers/inventory/warehousesController.ts`
- Create: `apps/api/src/controllers/inventory/userWarehouseAccessController.ts`
- Modify: `apps/api/src/routes/inventoryRoutes.ts`
- Create: `apps/api/src/__tests__/warehouseRoutes.test.ts`

- [ ] **Step 1: Write the failing route test**

```ts
// apps/api/src/__tests__/warehouseRoutes.test.ts
describe('warehouse routes', () => {
  it('lists warehouses and allows admin to create', async () => {
    // hit /inventory/warehouses and /inventory/warehouses POST through the test app
  })
})
```

- [ ] **Step 2: Run the route test and confirm it fails**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/warehouseRoutes.test.ts`

- [ ] **Step 3: Implement repository, service, and controllers**

Add:
- `listWarehouses`, `createWarehouse`, `updateWarehouse`, `getWarehouse`, `getWarehouseStock`, `getWarehouseValue`
- `listUserWarehouseAccess`, `setUserWarehouseAccess`, `removeUserWarehouseAccess`

Controller behavior:
- ADMIN/MANAGER only for write operations.
- `GET /inventory/warehouses` filters to accessible warehouses for `DATA_ENTRY`.
- `GET /inventory/warehouses/:id/stock` returns per-material quantities and values from `MaterialWarehouseStock`.

- [ ] **Step 4: Wire the routes**

Update `inventoryRoutes.ts` with:
- `/warehouses`
- `/warehouses/:id`
- `/warehouses/:id/stock`
- `/warehouses/:id/value`
- `/users/:userId/warehouse-access`

- [ ] **Step 5: Run the route test again**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/warehouseRoutes.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/repositories/inventory/warehouseRepository.ts apps/api/src/services/inventory/warehouseService.ts apps/api/src/controllers/inventory/warehousesController.ts apps/api/src/controllers/inventory/userWarehouseAccessController.ts apps/api/src/routes/inventoryRoutes.ts apps/api/src/__tests__/warehouseRoutes.test.ts
git commit -m "feat(inventory): add warehouse and access routes"
```

---

### Task 5: Add stock transfer flow

**Files:**
- Create: `apps/api/src/repositories/inventory/transferRepository.ts`
- Create: `apps/api/src/services/inventory/stockTransferService.ts`
- Create: `apps/api/src/controllers/inventory/transfersController.ts`
- Modify: `apps/api/src/routes/inventoryRoutes.ts`
- Create: `apps/api/src/__tests__/stockTransferWarehouse.test.ts`

- [ ] **Step 1: Write the failing transfer test**

```ts
// apps/api/src/__tests__/stockTransferWarehouse.test.ts
describe('stock transfer', () => {
  it('moves stock from source warehouse to destination warehouse atomically', async () => {
    // seed source stock, call transfer endpoint/service, assert source decreases and destination increases
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/stockTransferWarehouse.test.ts`

- [ ] **Step 3: Implement the transfer service**

Add `executeTransfer()` that:
- validates source != destination,
- checks source balance in each line,
- snapshots source weighted-average cost,
- writes `StockTransfer` and `StockTransferLine`,
- creates paired `StockTransaction` rows for out/in,
- updates `MaterialWarehouseStock` on both sides,
- records audit entries.

- [ ] **Step 4: Add the controller and route**

Add `POST /inventory/transfers` and `GET /inventory/transfers/:id`.

- [ ] **Step 5: Run the test again**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/stockTransferWarehouse.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/repositories/inventory/transferRepository.ts apps/api/src/services/inventory/stockTransferService.ts apps/api/src/controllers/inventory/transfersController.ts apps/api/src/routes/inventoryRoutes.ts apps/api/src/__tests__/stockTransferWarehouse.test.ts
git commit -m "feat(inventory): add warehouse stock transfers"
```

---

### Task 6: Enforce warehouse not-null and rebuild stock cache

**Files:**
- Create: `apps/api/prisma/migrations/20260605_enforce_warehouse_not_null/migration.sql`
- Create: `apps/api/src/scripts/rebuildWarehouseStockCache.ts`
- Modify: `apps/api/prisma/seed_inventory.ts`

- [ ] **Step 1: Write the migration smoke test**

```ts
// apps/api/src/__tests__/migrationWarehouseBackfill.test.ts
describe('warehouse backfill', () => {
  it('moves legacy null warehouse transactions to wh_rm', async () => {
    // insert/update legacy transaction through raw SQL or prisma helper, run backfill, assert warehouseId is wh_rm
  })
})
```

- [ ] **Step 2: Run the smoke test and confirm it fails until the backfill script exists**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/migrationWarehouseBackfill.test.ts`

- [ ] **Step 3: Add migration B**

Set `StockTransaction.warehouseId` to `NOT NULL` after backfill is in place.

- [ ] **Step 4: Add the cache rebuild script**

Create `rebuildWarehouseStockCache.ts` that rebuilds `MaterialWarehouseStock` from `StockTransaction` aggregates and recomputes `RawMaterial.averageUnitCost`.

- [ ] **Step 5: Update seed and backfill execution**

Make `seed_inventory.ts` call the warehouse seed and document running `backfillWarehouses.ts` before migration B.

- [ ] **Step 6: Run the smoke test again**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/migrationWarehouseBackfill.test.ts`

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/migrations apps/api/prisma/seed_inventory.ts apps/api/src/scripts/rebuildWarehouseStockCache.ts apps/api/src/__tests__/migrationWarehouseBackfill.test.ts
git commit -m "feat(db): enforce warehouse stock history"
```

---

### Task 7: Add warehouse pages and API helpers

**Files:**
- Modify: `apps/web/services/api.ts`
- Create: `apps/web/services/warehouseApi.ts`
- Modify: `apps/web/App.tsx`
- Modify: `apps/web/components/Layout.tsx`
- Create: `apps/web/pages/inventory/WarehousesPage.tsx`
- Create: `apps/web/pages/inventory/WarehouseDetail.tsx`
- Create: `apps/web/pages/inventory/CreateTransferPage.tsx`
- Create: `apps/web/pages/inventory/admin/UserWarehouseAccessPage.tsx`

- [ ] **Step 1: Write the failing frontend build check**

Run: `npm --workspace apps/web run build`

Expected: fail until the new page imports and API helpers exist.

- [ ] **Step 2: Add warehouse API helpers**

Add helpers for warehouses, warehouse stock, transfers, and access assignment in `apps/web/services/warehouseApi.ts`, then export them from `apps/web/services/api.ts`.

- [ ] **Step 3: Add routes and sidebar links**

Add routes in `App.tsx` for:
- `/inventory/warehouses`
- `/inventory/warehouses/:id`
- `/inventory/transfers/create`
- `/inventory/transfers/:id`
- `/inventory/admin/warehouse-access`

Add sidebar links under Inventory in `Layout.tsx` for Warehouses and Transfers.

- [ ] **Step 4: Build the pages**

Implement:
- `WarehousesPage.tsx` with summary cards and warehouse list.
- `WarehouseDetail.tsx` with per-material balance table and value summary.
- `CreateTransferPage.tsx` with source/destination selectors and line entry.
- `UserWarehouseAccessPage.tsx` for ADMIN warehouse assignment.

- [ ] **Step 5: Run the frontend build**

Run: `npm --workspace apps/web run build`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/services/api.ts apps/web/services/warehouseApi.ts apps/web/App.tsx apps/web/components/Layout.tsx apps/web/pages/inventory/WarehousesPage.tsx apps/web/pages/inventory/WarehouseDetail.tsx apps/web/pages/inventory/CreateTransferPage.tsx apps/web/pages/inventory/admin/UserWarehouseAccessPage.tsx
git commit -m "feat(web): add warehouse inventory screens"
```

---

### Task 8: Update existing inventory pages to use warehouses

**Files:**
- Modify: `apps/web/pages/inventory/CreateMaterialPage.tsx`
- Modify: `apps/web/pages/inventory/MaterialsPage.tsx`
- Modify: `apps/web/pages/inventory/MaterialDetail.tsx`
- Modify: `apps/web/pages/inventory/PurchaseCreate.tsx`
- Modify: `apps/web/pages/inventory/AlertsPage.tsx`

- [ ] **Step 1: Write the failing build check**

Run: `npm --workspace apps/web run build`

Expected: fail until the existing inventory pages compile with the new warehouse fields.

- [ ] **Step 2: Add default warehouse support to material creation**

Update `CreateMaterialPage.tsx` so the form includes `defaultWarehouseId` and sends it on create.

- [ ] **Step 3: Show warehouse-aware balances in the materials UI**

Update `MaterialsPage.tsx` to show total stock value, low-stock count by warehouse, and per-warehouse drill-down links.

- [ ] **Step 4: Expand material detail to show per-warehouse stock**

Update `MaterialDetail.tsx` to show warehouse stock rows, warehouse columns in transactions, and purchase rows grouped by warehouse.

- [ ] **Step 5: Make purchase creation warehouse-aware**

Update `PurchaseCreate.tsx` so each line can choose a warehouse, defaulting to the material default.

- [ ] **Step 6: Surface warehouse names in alerts**

Update `AlertsPage.tsx` so each alert shows the triggering warehouse.

- [ ] **Step 7: Run the frontend build**

Run: `npm --workspace apps/web run build`

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/pages/inventory/CreateMaterialPage.tsx apps/web/pages/inventory/MaterialsPage.tsx apps/web/pages/inventory/MaterialDetail.tsx apps/web/pages/inventory/PurchaseCreate.tsx apps/web/pages/inventory/AlertsPage.tsx
git commit -m "feat(web): make inventory pages warehouse-aware"
```

---

### Task 9: Final verification

**Files:**
- None

- [ ] **Step 1: Run API tests**

Run: `npm --workspace apps/api test`

Expected: all API tests pass.

- [ ] **Step 2: Run API build**

Run: `npm --workspace apps/api run build`

Expected: pass.

- [ ] **Step 3: Run web build**

Run: `npm --workspace apps/web run build`

Expected: pass.

- [ ] **Step 4: Check the inventory flow end-to-end**

Verify these user journeys manually:
- create warehouse
- create material with default warehouse
- create purchase into warehouse
- adjust stock in warehouse
- transfer stock between warehouses
- view alerts for low stock by warehouse

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "feat(inventory): complete warehouse module"
```
