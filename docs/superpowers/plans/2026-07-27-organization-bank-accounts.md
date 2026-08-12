# Organization Bank Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators manage organization bank accounts and let users attach the organization account used for customer receipts and supplier payments.

**Architecture:** Add an organization-owned `OrganizationBankAccount` master table. Add nullable `bankAccountId` foreign keys to customer invoice payments and supplier payments so existing payment records remain valid. Expose admin CRUD for accounts and authenticated read access for payment forms; validate selected accounts belong to the current organization and are active.

**Tech Stack:** Prisma/MySQL, Express controllers/routes/services, React/Vite settings and payment forms, Jest source-policy tests.

## Global Constraints

- Bank account management is Admin-only.
- Existing payments without a bank account remain valid.
- Cash payments do not require a bank account; cheque, bank transfer, and mobile banking payments require one when the form supports the selection.
- Historical payment ledger entries and invoice balances must continue to recalculate normally.
- No new dependency is required.

---

### Task 1: Add the bank-account data model and organization-scoped API

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260727120000_add_organization_bank_accounts/migration.sql`
- Create: `apps/api/src/repositories/organizationBankAccountRepository.ts`
- Create: `apps/api/src/services/organizationBankAccountService.ts`
- Create: `apps/api/src/controllers/organizationBankAccountController.ts`
- Create: `apps/api/src/validators/organizationBankAccountValidators.ts`
- Create: `apps/api/src/routes/organizationBankAccountRoutes.ts`
- Modify: `apps/api/src/server.ts` or the existing API route registration file
- Test: `apps/api/src/__tests__/organizationBankAccountSource.test.ts`

**Interfaces:**
- `OrganizationBankAccount`: `id`, `organizationId`, `bankName`, `accountName`, `accountNumber`, `branchName`, optional `branchCode`, `accountType`, `currency`, `active`, timestamps.
- `GET /organization/bank-accounts`: authenticated users read active accounts for their organization.
- `POST /organization/bank-accounts`: Admin creates an account.
- `PATCH /organization/bank-accounts/:id`: Admin edits or deactivates an account.
- `DELETE /organization/bank-accounts/:id`: Admin soft-deactivates an account.

- [ ] Write source tests proving Admin-only mutation routes, organization scoping, and active-account listing.
- [ ] Run the focused test and confirm it fails because the routes/model do not exist.
- [ ] Add the Prisma model, relations, and migration SQL with indexes on `(organizationId, active)` and `(organizationId, accountNumber)`.
- [ ] Implement repository/service/controller validation so an account from another organization cannot be read or changed.
- [ ] Register routes and run the focused test plus API TypeScript compilation.

### Task 2: Attach selected accounts to customer and supplier payments

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260727123000_add_payment_bank_account_links/migration.sql`
- Modify: `apps/api/src/validators/salesInvoiceValidators.ts`
- Modify: `apps/api/src/validators/supplierValidators.ts`
- Modify: `apps/api/src/services/salesInvoiceService.ts`
- Modify: `apps/api/src/services/inventory/supplierService.ts`
- Modify: `apps/api/src/repositories/salesInvoiceRepository.ts`
- Modify: `apps/api/src/repositories/inventory/supplierRepository.ts`
- Modify: `apps/api/src/controllers/salesInvoiceController.ts`
- Modify: `apps/api/src/controllers/inventory/suppliersController.ts`
- Modify: `apps/api/src/routes/inventoryRoutes.ts`
- Modify: `apps/api/src/__tests__/dataEntryRbacSource.test.ts`

**Interfaces:**
- `SalesInvoicePayment.bankAccountId?: String` and `SupplierPayment.bankAccountId?: String`.
- Payment payloads accept optional `bankAccountId` and preserve it on create/update/read.
- Payment services validate the bank account belongs to the authenticated user’s organization and is active before writing.

- [ ] Add failing tests for payment payload fields, organization ownership validation, and nullable legacy records.
- [ ] Add nullable Prisma foreign keys and migration SQL.
- [ ] Add bank-account validation and persistence to both payment flows.
- [ ] Keep cash payments valid without a bank account; reject bank/cheque/mobile methods without a selected account where the new UI requires it.
- [ ] Run payment tests and API TypeScript compilation.

### Task 3: Add Admin settings and payment selectors

**Files:**
- Modify: `apps/web/services/api.ts` or add `apps/web/services/organizationBankAccountApi.ts`
- Modify: `apps/web/pages/Settings.tsx`
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Modify: `apps/web/pages/inventory/SupplierDetailPage.tsx`
- Modify: `apps/web/services/salesInvoiceApi.ts`
- Modify: `apps/web/services/partyLedgerApi.ts`
- Modify: `apps/web/__tests__/salesInvoiceModule.test.tsx` or an existing source-policy test

**Interfaces:**
- Settings displays an Admin-only Bank Accounts section with create, edit, activate/deactivate, and account list controls.
- Customer payment form displays `Deposit account` for cheque, bank transfer, and mobile banking.
- Supplier payment form displays `Pay from account` for cheque and bank transfer.
- Existing payment records display the selected bank and branch when available.

- [ ] Add failing UI/source tests for Admin-only settings and both payment selectors.
- [ ] Add the API client and settings CRUD UI.
- [ ] Add selectors and validation to customer and supplier payment forms.
- [ ] Ensure data-entry users can select active accounts but cannot manage the account master list.
- [ ] Run focused tests and the web production build.

### Task 4: Verify integration and update the graph

**Files:**
- Modify: `graphify-out/` through `graphify update .`

- [ ] Run focused API tests, API TypeScript compilation, web build, and `git diff --check`.
- [ ] Run `graphify update .`.
- [ ] Confirm no unrelated files or destructive database operations were changed.
