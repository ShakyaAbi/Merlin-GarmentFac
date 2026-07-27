# Data-entry RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `DATA_ENTRY` users create and process articles, materials, invoices, and production batches while blocking all edits and deletions of existing records.

**Architecture:** Keep authorization in the existing Express `requireRoles` middleware and change only explicit route role lists. Add a small React current-user context/capability helper in the existing layout, then use it to hide data-entry edit/delete controls while retaining create and production workflow controls. No schema or dependency changes.

**Tech Stack:** Express, Prisma `Role` enum, Jest/ts-jest, React, TypeScript, React Router, existing Merlin API client and layout.

## Global Constraints

- The API is the security boundary; UI visibility is not authorization.
- `DATA_ENTRY` may create articles, materials, invoices, and production batches.
- `DATA_ENTRY` may issue and complete production batches and create invoice payments.
- `DATA_ENTRY` may not edit or delete existing business records or edit/delete invoice payments.
- Admin and manager behavior must remain unchanged.
- Preserve all unrelated dirty-worktree changes.

---

### Task 1: Lock the backend permission matrix with failing source tests

**Files:**
- Create: `apps/api/src/__tests__/dataEntryRbacSource.test.ts`
- Read/verify: `apps/api/src/routes/inventoryRoutes.ts`
- Read/verify: `apps/api/src/routes/salesInvoiceRoutes.ts`
- Read/verify: `apps/api/src/routes/productionRoutes.ts`
- Read/verify: `apps/api/src/routes/salesOrderRoutes.ts`
- Read/verify: `apps/api/src/routes/expenseRoutes.ts`

**Interfaces:**
- Produces a regression test suite that names the exact allowed and denied route behavior before route edits.

- [ ] **Step 1: Write failing route-source assertions**

Add tests that load route source text and assert:

```ts
it('allows data entry to create articles, materials, and production batches', () => {
  expect(inventorySource).toMatch(/router\.post\('\/materials',[\s\S]*Role\.DATA_ENTRY/)
  expect(inventorySource).toMatch(/router\.post\('\/finished-goods',[\s\S]*Role\.DATA_ENTRY/)
  expect(productionSource).toMatch(/router\.post\('/', authenticate, requireRoles\(Role\.ADMIN, Role\.MANAGER, Role\.DATA_ENTRY\)/)
})

it('allows data entry to issue and complete production batches', () => {
  expect(productionSource).toMatch(/router\.post\('\/:id\/issue',[\s\S]*Role\.DATA_ENTRY/)
  expect(productionSource).toMatch(/router\.post\('\/:id\/complete',[\s\S]*Role\.DATA_ENTRY/)
})

it('keeps data entry off existing-record edit and delete routes', () => {
  expect(inventorySource).not.toMatch(/router\.put\('\/materials\/:id',[\s\S]*Role\.DATA_ENTRY/)
  expect(inventorySource).not.toMatch(/router\.put\('\/finished-goods\/:id',[\s\S]*Role\.DATA_ENTRY/)
  expect(productionSource).not.toMatch(/router\.put\('\/:id',[\s\S]*Role\.DATA_ENTRY/)
  expect(productionSource).not.toMatch(/router\.delete\('\/:id',[\s\S]*Role\.DATA_ENTRY/)
  expect(invoiceSource).not.toMatch(/router\.patch\('\/:id',[\s\S]*Role\.DATA_ENTRY/)
  expect(invoiceSource).not.toMatch(/router\.patch\('\/:id\/payments\/:paymentId',[\s\S]*Role\.DATA_ENTRY/)
  expect(invoiceSource).not.toMatch(/router\.delete\('\/:id\/payments\/:paymentId',[\s\S]*Role\.DATA_ENTRY/)
})
```

Also assert that invoice creation, invoice submit, and payment creation retain `Role.DATA_ENTRY`, while payment update/delete and invoice cancellation do not.

- [ ] **Step 2: Run the focused test and verify it fails for the current route lists**

Run: `npm.cmd --workspace apps/api test -- --runInBand src/__tests__/dataEntryRbacSource.test.ts`

Expected: FAIL because materials/articles/production create currently exclude `DATA_ENTRY`, production issue/complete exclude it, and invoice edit/payment mutation currently include it.

### Task 2: Apply the minimal backend route changes

**Files:**
- Modify: `apps/api/src/routes/inventoryRoutes.ts`
- Modify: `apps/api/src/routes/productionRoutes.ts`
- Modify: `apps/api/src/routes/salesInvoiceRoutes.ts`
- Modify: `apps/api/src/routes/salesOrderRoutes.ts`
- Modify: `apps/api/src/routes/expenseRoutes.ts`

**Interfaces:**
- Consumes: Existing `requireRoles(...roles: Role[])` middleware.
- Produces: Server-enforced data-entry create/process-only access.

- [ ] **Step 1: Widen only requested create/process routes**

Add `Role.DATA_ENTRY` to:

```ts
POST /inventory/materials
POST /inventory/finished-goods
POST /production
POST /production/:id/issue
POST /production/:id/complete
POST /sales-invoices
POST /sales-invoices/:id/submit
POST /sales-invoices/:id/payment
```

Keep existing admin/manager-only guards on article/material import, stock adjustment, image upload, category creation, purchases, and all other inventory mutations.

- [ ] **Step 2: Remove data-entry from existing-record mutations**

Remove `Role.DATA_ENTRY` from:

```ts
PATCH /sales-invoices/:id
PATCH /sales-invoices/:id/payments/:paymentId
DELETE /sales-invoices/:id/payments/:paymentId
PATCH /expenses/:id
PATCH /sales-orders/:id
POST /sales-orders/:id/confirm
POST /sales-orders/:id/invoice
```

Leave route behavior for admin and manager unchanged. Keep `POST /sales-orders` and `POST /expenses` unchanged only if their existing create workflow is still used; no data-entry edit/delete route may remain.

- [ ] **Step 3: Run the focused route tests**

Run: `npm.cmd --workspace apps/api test -- --runInBand src/__tests__/dataEntryRbacSource.test.ts`

Expected: PASS with all allowed and denied route assertions green.

### Task 3: Add frontend role capabilities and hide forbidden controls

**Files:**
- Create: `apps/web/components/auth/CurrentUserContext.tsx`
- Modify: `apps/web/components/Layout.tsx`
- Modify: `apps/web/pages/inventory/FinishedGoodsPage.tsx`
- Modify: `apps/web/pages/inventory/FinishedGoodDetailPage.tsx`
- Modify: `apps/web/components/inventory/MaterialCard.tsx`
- Modify: `apps/web/pages/inventory/MaterialsPage.tsx`
- Modify: `apps/web/pages/inventory/MaterialDetail.tsx`
- Modify: `apps/web/pages/inventory/ProductionOrdersPage.tsx`
- Modify: `apps/web/pages/inventory/ProductionOrderDetailPage.tsx`
- Modify: `apps/web/pages/sales/SalesInvoiceListPage.tsx`
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`

**Interfaces:**
- Produces `CurrentUserProvider` and `useCurrentUser()` returning `{ user, isDataEntry, canCreate, canEdit, canDelete, canIssue, canComplete }`.
- `canCreate` is true for admin, manager, and data-entry on the requested create pages.
- `canEdit` and `canDelete` are false for data-entry; `canIssue` and `canComplete` are true for all three roles on production pages.

- [ ] **Step 1: Add the context and wire it through `Layout`**

Use the existing `api.me()` request already made by `Layout`, expose the loaded `CurrentUser` through React context, and keep the existing profile display. Make the hook fail clearly if used outside the provider.

- [ ] **Step 2: Hide article/material edit and destructive controls for data-entry**

Keep Create Article/Create Material visible. Hide article edit, image replacement, BOM editing, stock adjustment, status changes, delete, CSV import, category-management links, and material edit controls when `isDataEntry` is true. Read-only detail views remain available.

- [ ] **Step 3: Hide invoice edit/payment edit/delete/cancel controls for data-entry**

Keep New Invoice, invoice submit if present, and Add/Record Payment visible. Hide invoice edit navigation, payment edit/delete buttons, and cancel actions for data-entry. Do not change read/export behavior.

- [ ] **Step 4: Keep production create/issue/complete visible and hide edit/delete**

For data-entry, show Create Batch and the existing Issue/Complete actions. Hide Edit Batch and Delete Batch on both list and detail pages. Keep the existing draft/status checks that prevent invalid workflow transitions.

- [ ] **Step 5: Run the web typecheck/build**

Run: `npm.cmd run build:web`

Expected: exit code 0 with no TypeScript or Vite build errors.

### Task 4: Add frontend source regression coverage and run full verification

**Files:**
- Create: `apps/api/src/__tests__/dataEntryUiRbacSource.test.ts`
- Modify: only affected UI files from Task 3 if assertions expose missed controls.

**Interfaces:**
- Produces source-level regression coverage consistent with the repository's existing frontend source tests.

- [ ] **Step 1: Write UI source assertions**

Assert that affected pages consume `useCurrentUser`/capabilities and conditionally render the edit/delete controls, while production pages retain issue/complete actions for data-entry.

- [ ] **Step 2: Run focused API tests and the full API test suite**

Run: `npm.cmd --workspace apps/api test -- --runInBand src/__tests__/dataEntryRbacSource.test.ts src/__tests__/dataEntryUiRbacSource.test.ts`

Then run: `npm.cmd run test:api`

Expected: exit code 0 and no failed tests.

- [ ] **Step 3: Build API and web**

Run: `npm.cmd run build`

Expected: exit code 0 for both workspace builds.

- [ ] **Step 4: Update the code graph**

Run: `graphify update .`

Expected: graphify completes and updates only graph-derived output as expected.

- [ ] **Step 5: Inspect the final diff without staging unrelated work**

Run: `git diff -- docs/superpowers/specs/2026-07-26-data-entry-rbac-design.md docs/superpowers/plans/2026-07-26-data-entry-rbac.md apps/api/src/routes apps/api/src/__tests__ apps/web/components/auth apps/web/components/Layout.tsx apps/web/pages/inventory apps/web/pages/sales`

Confirm that pre-existing dirty files outside the RBAC change remain untouched.
