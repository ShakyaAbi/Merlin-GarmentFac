# Nepal VAT Invoice Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing rounded modern invoice preview with a shared Nepali VAT paper-bill layout for sales and purchase invoices.

**Architecture:** Keep `InvoicePaperDocument` as the shared normalized document renderer. Update its markup and print styles only, preserving the existing sales and purchase data adapters and workflow controls.

**Tech Stack:** React, TypeScript, Tailwind CSS, Jest/Vitest-compatible web tests, Vite.

## Global Constraints

- Use English labels matching the reference and official IRD field structure.
- Keep VAT displayed as 13% and preserve existing calculated totals.
- Keep the output print-safe, responsive, and accessible.
- Do not change backend persistence or invoice workflows unless verification exposes a missing field.

---

### Task 1: Lock the shared paper layout contract

**Files:**
- Modify: `apps/web/components/invoices/InvoicePaperDocument.tsx`
- Modify: `apps/web/components/invoices/invoicePaperDocumentHelpers.ts`
- Test: `apps/web/__tests__/invoicePaperLayout.test.tsx`

- [ ] Add assertions for TAX INVOICE, seller PAN, transaction/issue dates, party details, payment mode, invoice number, VAT 13%, grand total, amount in words, and both footer signatures.
- [ ] Run the focused test and observe the expected failure for the new structure.
- [ ] Implement the flat ruled document with the shared sales/purchase props.
- [ ] Run the focused test and confirm it passes.

### Task 2: Verify both detail surfaces and print output

**Files:**
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Modify: `apps/web/pages/inventory/PurchaseDetailPage.tsx`
- Modify: `apps/web/components/invoices/InvoicePaperDocument.tsx`

- [ ] Confirm both detail pages use the shared document and keep workflow actions outside it.
- [ ] Add print media rules for A4 portrait, compact ruled rows, and hidden interactive controls.
- [ ] Run the web test suite and production build.

### Task 3: Refresh graphify and review the diff

**Files:**
- Modify: `graphify-out/*` generated output after update.

- [ ] Run `graphify update .`.
- [ ] Inspect `git diff --check` and the final diff for unrelated changes.
