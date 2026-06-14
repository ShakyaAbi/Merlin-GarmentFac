# GFMS Audit Report

Date: 2026-06-09

This report reflects the current repository state, not intended design. Items are categorized by verified implementation status.

## Complete

### Authentication and route protection
- JWT-based auth is present.
- Route guards and role checks are wired on the main API routes.
- Password hashing and login/register flows exist.

### Core inventory workflows
- Suppliers, customers, materials, finished goods, BOMs, purchases, production, sales orders, sales invoices, and expenses all have concrete API handlers and frontend screens.
- Raw material stock is updated through stock transactions.
- Finished goods stock is updated through finished-good stock transactions.

### Inventory stock rules
- Production order creation does not deduct raw material stock.
- Raw materials are deducted on issue/start of production.
- Finished goods are increased on production completion.
- Sales orders do not directly move inventory.
- Draft invoices do not move inventory.
- Issued invoices deduct finished goods stock.
- Cancelled invoices reverse the finished-goods movement.

### Validation and audit logging
- Route-level validation exists across inventory, customer, expense, production, sales order, and sales invoice write paths.
- Audit logging is wired into the major create/update/delete/stock-change flows.

### Reporting shell
- Operations dashboard exists and loads `/operations/summary`.
- Date filtering, stock summaries, invoice summaries, purchases, production, and low-stock views are present.

## Partial

### Manufacturing costing
- The app computes manufacturing margin and absorbed overhead in the operations summary.
- The costing model is allocation-based and derived from expenses and BOM data.
- There is no persisted manufacturing ledger or cost-center accounting model yet.

Root cause:
- The Prisma schema contains stock transactions and business documents, but no dedicated overhead ledger table or accounting allocation table.

Impact:
- Profit and manufacturing cost reporting are estimates rather than a persisted accounting record.
- Historical allocation analysis is limited to recomputation from current source data.

Recommended fix:
- Add a persisted manufacturing cost ledger or overhead allocation table with links to production orders, expense buckets, and allocation periods.

### Purchase document detail flow
- Purchase creation is implemented.
- The purchase detail GET endpoint currently returns an empty object instead of loading a document.

Root cause:
- `apps/api/src/controllers/inventory/purchasesController.ts` has a placeholder `get` handler.

Impact:
- Purchase detail pages cannot reliably render loaded purchase data.

Recommended fix:
- Implement `svc.getPurchase(id)` and return the full purchase with items, supplier, and linked stock impact.

### Frontend completeness
- The UI includes most major inventory and finance pages.
- Some screens are still document-shell or list-first and need deeper detail views to match the more complete modules.

Root cause:
- The current frontend prioritizes operational entry screens before full document-detail parity.

Impact:
- Users can create and list records, but not every document has a fully rich detail/editor experience yet.

Recommended fix:
- Reuse the document shell pattern for purchase, BOM, production, and sales detail pages.

## Broken

### Purchase detail endpoint
- `GET /inventory/purchases/:id` currently returns `{}`.

Impact:
- Any consumer expecting an actual purchase document gets unusable data.

### Accounting persistence gap
- The reporting layer presents absorbed overhead and manufacturing margin, but there is no persisted ledger to back it.

Impact:
- Reports are not audit-grade accounting records.

## Missing

### Manufacturing cost ledger
- No persisted ledger exists for:
  - overhead allocation
  - production absorption
  - cost-center tracking
  - period-based cost rollups

### Export coverage parity
- Export functionality exists in some modules, but not every inventory/manufacturing screen has export/import parity.

### Full detail page coverage
- Several inventory screens still need richer detail views to fully match the workflow density already present in the sales and indicator modules.

## Security issue

### Console logging in runtime paths
- Several runtime paths still use `console.log` for operational messages and diagnostics.

Impact:
- Noisy logs in production and potential leakage of internal state.

Recommended fix:
- Route operational logs through the project logger and keep console logging out of request paths.

## Performance issue

### Reporting loads source collections eagerly
- The operations summary builds several metrics by loading multiple collections and computing totals in memory.

Impact:
- This is acceptable for small data volumes, but will degrade as production data grows.

Recommended fix:
- Move heavy aggregates to targeted SQL aggregation queries and introduce indexed summary tables where needed.

## Technical debt

### Broad use of `any`
- The codebase still uses `any` in many controllers, services, and frontend screens.

Impact:
- Type safety is weaker than it should be, and regressions are easier to ship.

Recommended fix:
- Replace `any` with explicit DTOs and typed API contracts module by module.

### Placeholder comments and fallback handlers
- A few controllers and pages still use placeholder wording or shortcut behavior.

Impact:
- The system works, but some flows are clearly not finished at the document-detail level.

Recommended fix:
- Replace placeholders with real loading and detail logic as each screen is hardened.

## Verification status

Verified by inspection:
- `apps/api/prisma/schema.prisma`
- `apps/api/src/services/operationsSummaryService.ts`
- `apps/api/src/controllers/inventory/purchasesController.ts`
- `apps/api/src/services/inventory/purchaseService.ts`
- `apps/web/pages/inventory/PurchaseCreate.tsx`
- `apps/web/pages/inventory/OperationsDashboardPage.tsx`

## Next implementation priority

1. Implement the purchase detail loader.
2. Decide whether a persisted manufacturing ledger is required for production-ready accounting.
3. Expand document-shell parity across inventory detail pages.
