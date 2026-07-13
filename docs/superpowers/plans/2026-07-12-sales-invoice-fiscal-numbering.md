# Sales Invoice Fiscal-Year Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add organization invoice profile settings and a safe fiscal-year reset toggle for sales invoice numbers.

**Architecture:** Organization profile data is persisted on `Organization`, validated through the existing `/auth/me` update path, and returned as a dedicated profile object. Sequence allocation receives organization reset configuration, uses Nepal fiscal-year keys when enabled, and previews through the non-mutating sequence reader.

**Tech Stack:** Prisma, TypeScript/Express API, React/Vite/Tailwind web app, Node test runner.

## Global Constraints

- Do not add a website field.
- Default fiscal-year reset to enabled for backward compatibility.
- Never rewrite existing invoice numbers or delete existing sequence records.
- Previewing a number must not increment a sequence.

### Task 1: Sequence behavior and preview safety

**Files:**
- Modify: `apps/api/src/services/sequenceService.ts`
- Modify: `apps/api/src/repositories/salesInvoiceRepository.ts`
- Test: `apps/api/tests/services/sequenceService.test.ts`

- [ ] Write failing tests for Nepal fiscal-year segmentation, reset-on/reset-off sequence keys, and a preview that does not increment.
- [ ] Run the focused test and confirm it fails because the current allocator always uses a fiscal-year key and the repository preview allocates.
- [ ] Add an organization-aware sequence option and a non-mutating preview path while preserving existing callers.
- [ ] Run the focused test and confirm it passes.

### Task 2: Organization persistence and API contract

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/repositories/organizationRepository.ts`
- Modify: `apps/api/src/validators/authValidators.ts`
- Modify: `apps/api/src/services/authService.ts`
- Test: `apps/api/tests/services/authService.test.ts`

- [ ] Write failing validation/service tests for the new organization profile fields and reset flag.
- [ ] Run the focused tests and confirm the new fields are rejected or absent.
- [ ] Add nullable organization profile fields and `resetSalesInvoiceSequenceEachFiscalYear Boolean @default(true)`, update repository typing, validate the patch payload, and return an explicit profile object from `sanitizeUser`.
- [ ] Run Prisma generation/migration-safe type checks and the focused tests.

### Task 3: Sales invoice integration

**Files:**
- Modify: `apps/api/src/services/salesInvoiceService.ts`
- Modify: `apps/api/src/controllers/salesInvoiceController.ts`
- Modify: `apps/web/types.ts`
- Modify: `apps/web/services/api.ts`
- Modify: `apps/web/components/invoices/invoicePaperDocumentHelpers.ts`
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Test: `apps/web/__tests__/salesInvoiceFiscalSettings.test.ts`

- [ ] Write failing tests for sending organization sequence configuration during preview/issue and rendering configured seller details without website.
- [ ] Run the focused tests and confirm they fail against the current hardcoded organization/PDF values.
- [ ] Thread organization profile through sales invoice preview/allocation and PDF/paper helpers, keeping current visible invoice number format.
- [ ] Run focused web tests and confirm they pass.

### Task 4: Settings UI

**Files:**
- Modify: `apps/web/pages/Settings.tsx`
- Modify: `apps/web/types.ts`
- Test: `apps/web/__tests__/organizationSettings.test.ts`

- [ ] Write failing UI/source tests for the reset toggle, invoice profile fields, and absence of website.
- [ ] Run the focused tests and confirm they fail.
- [ ] Add controlled form state, load/save organization profile data through existing API methods, and show clear reset behavior copy.
- [ ] Run focused tests and the web build.

### Task 5: Verification and graph refresh

- [ ] Run API TypeScript check.
- [ ] Run focused API and web tests.
- [ ] Run the web production build.
- [ ] Run `graphify update .`.
- [ ] Run `git diff --check` and inspect the final diff for unrelated changes.
