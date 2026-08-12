# Payment CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete CRUD workflows for both sales-invoice receipts and supplier payments while preserving invoice, supplier, and ledger balances.

**Architecture:** Keep the existing sales-invoice and supplier payment domain services as the accounting authority. Add a paginated sales payment register endpoint and reuse existing supplier payment endpoints, then add shared form/action patterns in the web UI. Every mutation recalculates balances and replaces/removes the matching ledger entry transactionally.

**Tech Stack:** TypeScript, Express, Prisma/MySQL, React, React Router, Jest, Node test runner, Vite.

## Global Constraints

- Do not allow sales payments above invoice due amount.
- Do not allow payments on cancelled or unissued sales invoices.
- Do not delete supplier payments referenced by missing or mismatched supplier records.
- Keep ledger updates inside the same database transaction as payment mutations.
- Preserve existing API routes and response compatibility where possible.
- Use the existing `Modal`, `Button`, `InventorySectionCard`, and toast conventions.

### Task 1: Payment domain contracts and API tests

**Files:**
- Modify: `apps/api/src/validators/salesInvoiceValidators.ts`
- Modify: `apps/api/src/validators/supplierValidators.ts`
- Test: `apps/api/tests/services/salesInvoiceService.test.ts`
- Test: `apps/api/tests/services/supplierService.test.ts`

- [ ] **Step 1: Add failing validation tests** for positive payment amounts, required methods, and valid dates.
- [ ] **Step 2: Run the focused API tests and confirm they fail for missing coverage or invalid schemas.**
- [ ] **Step 3: Implement the smallest shared validation changes.**
- [ ] **Step 4: Run both focused suites and confirm they pass.**

### Task 2: Paginated sales payment register

**Files:**
- Modify: `apps/api/src/repositories/salesInvoiceRepository.ts`
- Modify: `apps/api/src/services/salesInvoiceService.ts`
- Modify: `apps/api/src/controllers/salesInvoiceController.ts`
- Modify: `apps/api/src/routes/salesInvoiceRoutes.ts`
- Modify: `apps/web/services/salesInvoiceApi.ts`
- Test: `apps/api/tests/services/salesInvoiceService.test.ts`

- [ ] **Step 1: Add a failing test** for a payment register query returning payment rows, invoice/customer context, total count, and aggregate amount.
- [ ] **Step 2: Run the test and confirm the register method is missing.**
- [ ] **Step 3: Implement `listPayments` with page, pageSize, search, payment method, date range, and payment status filters.**
- [ ] **Step 4: Add `GET /sales-invoices/payments` before the `/:id` route and expose it through `salesInvoiceApi.listPayments`.**
- [ ] **Step 5: Run focused API tests and the TypeScript check.**

### Task 3: Sales payment CRUD UI

**Files:**
- Modify: `apps/web/pages/finance/PaymentsPage.tsx`
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Modify: `apps/web/services/salesInvoiceApi.ts`
- Test: `apps/web/__tests__/salesInvoiceModule.test.tsx`

- [ ] **Step 1: Add failing UI tests** for payment edit/delete actions and the register form state.
- [ ] **Step 2: Run the focused web tests and confirm the actions are absent.**
- [ ] **Step 3: Add reusable payment form state with amount, date, method, note, and validation.**
- [ ] **Step 4: Add edit/delete actions to the payment register and invoice detail payment activity.**
- [ ] **Step 5: Refresh the register after mutations and show server validation errors inline.**
- [ ] **Step 6: Run focused web tests and build the web app.**

### Task 4: Supplier payment CRUD hardening and register actions

**Files:**
- Modify: `apps/api/src/services/inventory/supplierService.ts`
- Modify: `apps/api/src/controllers/inventory/suppliersController.ts`
- Modify: `apps/web/pages/inventory/SupplierDetailPage.tsx`
- Modify: `apps/web/services/partyLedgerApi.ts`
- Test: `apps/api/tests/services/supplierService.test.ts`

- [ ] **Step 1: Add failing tests** for payment update/delete ledger replacement and missing-payment errors.
- [ ] **Step 2: Run the focused supplier tests and confirm the missing behavior.**
- [ ] **Step 3: Harden update/delete validation and keep ledger mutations transactional.**
- [ ] **Step 4: Confirm the existing supplier edit/delete modal actions use the hardened endpoints.**
- [ ] **Step 5: Run focused supplier tests and the API type check.**

### Task 5: End-to-end verification

**Files:**
- Test: `apps/api/tests/services/salesInvoiceService.test.ts`
- Test: `apps/api/tests/services/supplierService.test.ts`
- Test: `apps/web/__tests__/salesInvoiceModule.test.tsx`

- [ ] **Step 1: Run all focused payment tests.**
- [ ] **Step 2: Run API TypeScript compilation.**
- [ ] **Step 3: Run the production web build.**
- [ ] **Step 4: Run `git diff --check` and update the code graph.**
- [ ] **Step 5: Verify the local UI flows for create, edit, delete, and balance refresh.**
