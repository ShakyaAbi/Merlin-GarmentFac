# Raw Material Management - Inventory Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing MERLIN Lite inventory module so garment raw materials can be created, categorized, purchased, adjusted, and tracked with the current UI and data model.

**Architecture:** Reuse the existing inventory stack instead of adding a parallel system. The backend keeps Prisma as the source of truth for suppliers, raw materials, purchases, stock transactions, and low-stock alerts. The web app keeps the current inventory page family and simply expands the forms, tables, and detail views to surface the extra raw-material metadata.

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, Jest, Supertest, React, React Router, TypeScript, Tailwind CSS.

---

### Task 1: Normalize the backend raw-material contract

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/validators/inventoryValidators.ts`
- Modify: `apps/api/src/repositories/inventory/materialRepository.ts`
- Modify: `apps/api/src/repositories/inventory/purchaseRepository.ts`
- Modify: `apps/api/src/services/inventory/materialService.ts`
- Modify: `apps/api/src/controllers/inventory/materialsController.ts`
- Modify: `apps/api/src/controllers/inventory/purchasesController.ts`
- Modify: `apps/api/src/routes/inventoryRoutes.ts`
- Create: `apps/api/src/__tests__/inventoryValidators.test.ts`

- [ ] **Step 1: Write the failing build gate**

```ts
import { createMaterialSchema, createPurchaseSchema } from '../validators/inventoryValidators'

describe('inventory validators', () => {
  it('requires raw material category fields', () => {
    expect(() =>
      createMaterialSchema.parse({
        name: 'Cotton Fabric White',
        sku: 'FAB-WHT-001',
        defaultUnit: 'Meter',
      }),
    ).toThrow()
  })

  it('accepts purchase metadata needed by the inventory flow', () => {
    expect(
      createPurchaseSchema.parse({
        supplierId: 'sup_1',
        invoiceDate: '2026-06-02',
        invoiceNumber: 'BILL-001',
        notes: 'Monthly stock refill',
        items: [
          { rawMaterialId: 'mat_1', quantity: 10, unit: 'Meter', unitPrice: 200 },
        ],
      }),
    ).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to confirm the contract is missing**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts`

Expected: fail because `createMaterialSchema` does not exist yet and purchase metadata fields are not validated.

- [ ] **Step 3: Add the minimal backend contract and persistence changes**

Implement these changes:
- Extend `RawMaterial` in `apps/api/prisma/schema.prisma` with `category`, `color`, `sizeOrWidth`, `gsmOrSpecification`, `brandOrQualityGrade`, `defaultSupplierId`, `purchaseRate`, `defaultWarehouse`, `remarks`, and `active`/`isActive` alignment if needed.
- Reuse the existing `Purchase.invoiceNumber`, `Purchase.invoiceDate`, and `Purchase.notes` fields as the persisted purchase metadata; only add a simple attachment field if the implementation can do so without broad schema churn.
- Add `createMaterialSchema`, extend `createPurchaseSchema`, and add `adjustStockSchema` in `apps/api/src/validators/inventoryValidators.ts`.
- Make `materialRepository.createMaterial` and `updateMaterial` accept the expanded raw-material payload.
- Make `purchaseRepository.createPurchaseTransactional` persist purchase metadata, continue creating stock transactions, and keep last-price cost updates.
- Keep `materialsController.create`, `materialsController.update`, and `purchasesController.create` using the validated payloads.
- Keep `inventoryRoutes.ts` on the same paths; only add validation and payload support.

- [ ] **Step 4: Run the test again**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/validators/inventoryValidators.ts apps/api/src/repositories/inventory/materialRepository.ts apps/api/src/repositories/inventory/purchaseRepository.ts apps/api/src/services/inventory/materialService.ts apps/api/src/controllers/inventory/materialsController.ts apps/api/src/controllers/inventory/purchasesController.ts apps/api/src/routes/inventoryRoutes.ts apps/api/src/__tests__/inventoryValidators.test.ts
git commit -m "feat(inventory): expand raw material contract"
```

### Task 2: Expand the raw-material UI on existing pages

**Files:**
- Modify: `apps/web/pages/inventory/CreateMaterialPage.tsx`
- Modify: `apps/web/pages/inventory/MaterialsPage.tsx`
- Modify: `apps/web/pages/inventory/MaterialDetail.tsx`
- Modify: `apps/web/services/api.ts`

- [ ] **Step 1: Write the failing test**

The web package does not currently have a test runner, so use the Vite build as the failing gate once the new fields are wired in. The first run should fail on type or missing-field usage until the form state and payloads are updated.

- [ ] **Step 2: Run the failing check or build**

Run: `npm --workspace apps/web run build`

Expected: fail or warn until the UI reads and sends the expanded raw-material fields.

- [ ] **Step 3: Update the material pages**

Implement these changes:
- `CreateMaterialPage.tsx`: add inputs for category, color, size/width, GSM/specification, brand/quality grade, default supplier, purchase rate, default warehouse, active flag, and remarks; keep the current card layout.
- `MaterialsPage.tsx`: show category/item group, color, unit, stock, reorder level, and active status; keep the existing search and low-stock sidebar.
- `MaterialDetail.tsx`: show the expanded metadata and keep edit/adjust-stock actions in the same visual style.
- `apps/web/services/api.ts`: add dedicated inventory helper methods only if needed by the page cleanup; otherwise keep using the generic `api.get/post/put` helpers.

- [ ] **Step 4: Run the web build again**

Run: `npm --workspace apps/web run build`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/pages/inventory/CreateMaterialPage.tsx apps/web/pages/inventory/MaterialsPage.tsx apps/web/pages/inventory/MaterialDetail.tsx apps/web/services/api.ts
git commit -m "feat(inventory-ui): expand raw material pages"
```

### Task 3: Tighten purchase, stock-adjustment, and alert behavior

**Files:**
- Modify: `apps/api/src/validators/inventoryValidators.ts`
- Modify: `apps/api/src/controllers/inventory/materialsController.ts`
- Modify: `apps/api/src/controllers/inventory/purchasesController.ts`
- Modify: `apps/api/src/repositories/inventory/stockRepository.ts`
- Modify: `apps/api/src/controllers/inventory/alertsController.ts`
- Modify: `apps/web/pages/inventory/PurchaseCreate.tsx`
- Modify: `apps/web/pages/inventory/PurchasesPage.tsx`
- Modify: `apps/web/pages/inventory/AlertsPage.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { adjustStockSchema, createPurchaseSchema } from '../validators/inventoryValidators'

describe('purchase and stock guardrails', () => {
  it('rejects blank stock-adjustment reasons', () => {
    expect(() =>
      adjustStockSchema.parse({
        change: -5,
        unit: 'Meter',
        reason: '',
      }),
    ).toThrow()
  })

  it('carries purchase metadata through the create form', () => {
    expect(
      createPurchaseSchema.parse({
        supplierId: 'sup_1',
        purchaseDate: '2026-06-02',
        billNumber: 'BILL-001',
        remarks: 'Monthly stock refill',
        items: [{ rawMaterialId: 'mat_1', quantity: 10, unit: 'Meter', unitPrice: 200 }],
      }),
    ).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the guardrail check**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts`

Expected: fail until the new purchase and adjustment constraints are enforced end to end.

- [ ] **Step 3: Implement the purchase and alert flow updates**

Implement these changes:
- `inventoryValidators.ts`: require `invoiceDate`, `invoiceNumber`, and `notes` for purchase metadata; require an adjustment reason before stock decrement or increment.
- `inventoryValidators.ts`: require `invoiceDate`, `invoiceNumber`, and `notes` for purchase metadata; add `adjustStockSchema` and make it reject empty reasons.
- `purchasesController.ts` and `purchaseRepository.ts`: carry purchase metadata through the full transaction and keep stock transactions in sync.
- `materialsController.adjustStock`: reject blank reasons and keep audit logging intact.
- `stockRepository.ts`: keep transaction writes small and explicit so purchase and manual adjustments share one path.
- `alertsController.ts`: continue serving low-stock alerts from the current low-stock table, but ensure the UI can acknowledge them cleanly.
- `PurchaseCreate.tsx`: label the persisted fields as bill number, purchase date, and remarks, but map them to `invoiceNumber`, `invoiceDate`, and `notes` in the request payload.
- `PurchasesPage.tsx`: replace the current minimal view with the existing list/summary style used elsewhere in inventory.
- `AlertsPage.tsx`: keep the simple acknowledge flow, but show the material name, trigger time, and current state in the current app style.

- [ ] **Step 4: Run the API and web build checks**

Run:

```bash
npm --workspace apps/api test -- --runInBand
npm --workspace apps/web run build
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/validators/inventoryValidators.ts apps/api/src/controllers/inventory/materialsController.ts apps/api/src/controllers/inventory/purchasesController.ts apps/api/src/repositories/inventory/stockRepository.ts apps/api/src/controllers/inventory/alertsController.ts apps/web/pages/inventory/PurchaseCreate.tsx apps/web/pages/inventory/PurchasesPage.tsx apps/web/pages/inventory/AlertsPage.tsx
git commit -m "feat(inventory): tighten purchase and stock flows"
```

### Task 4: Verify the full inventory pass end to end

**Files:**
- Modify: any files required by Tasks 1-3 if review finds gaps

- [ ] **Step 1: Run the full verification commands**

Run:

```bash
npm --workspace apps/api test -- --runInBand
npm --workspace apps/api run build
npm --workspace apps/web run build
```

Expected: all pass.

- [ ] **Step 2: Review for gaps and fix inline**

If any of the following are still missing, fix them before finishing:
- raw-material category field does not persist or display
- purchase metadata is dropped somewhere between form and transaction
- stock adjustment can happen without a reason
- low-stock state does not reflect reorder level
- the inventory pages no longer match the current MERLIN Lite card/sidebar style

- [ ] **Step 3: Commit the final cleanup**

```bash
git add -A
git commit -m "feat(inventory): complete raw material management pass"
```
