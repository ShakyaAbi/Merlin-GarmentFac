# Invoice Paper Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Merlin sales and purchase invoices use one shared English paper-style layout, with auto-calculated VAT, editable auto-numbering for sales, and required manual numbering for purchases.

**Architecture:** Add one reusable invoice document component in the web app and feed it with normalized sales or purchase data from the existing detail pages. Keep the current create screens for data entry, but extend them with invoice-number and VAT behavior so the saved record matches the printable output. On the backend, keep invoice totals and numbering authoritative by extending the existing sales invoice flow and the purchase create path to persist the extra invoice fields needed by the paper layout.

**Tech Stack:** React 19, TypeScript, Vite, Express, Prisma, Zod, Jest, React Router

---

### Task 1: Build one shared invoice document component and invoice math helpers

**Files:**
- Create: `apps/web/components/invoices/InvoicePaperDocument.tsx`
- Create: `apps/web/components/invoices/invoiceTotals.ts`
- Create: `apps/web/components/invoices/amountInWords.ts`
- Modify: `apps/web/components/sales/InvoiceTotalsCard.tsx`
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Modify: `apps/web/pages/inventory/PurchaseDetailPage.tsx`

- [ ] **Step 1: Write the failing UI tests for the shared invoice layout**

```ts
// apps/web/__tests__/invoicePaperLayout.test.tsx
// Assert that sales and purchase detail views render:
// - invoice number
// - party block
// - item table
// - subtotal, discount, taxable amount, VAT 13%, grand total
// - amount in words
```

- [ ] **Step 2: Run the tests to confirm the new shared component does not exist yet**

Run:

```bash
http://localhost:5173/#/sales-invoices
```

Expected: the browser still shows the current card-based invoice detail views, not the new paper layout.

- [ ] **Step 3: Implement the shared component and calculation helpers**

```ts
// invoiceTotals.ts
export type InvoiceLine = {
  quantity: number
  unitPrice: number
  discountAmount?: number
}

export function calculateInvoiceTotals(lines: InvoiceLine[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const discountAmount = lines.reduce((sum, line) => sum + Number(line.discountAmount ?? 0), 0)
  const taxableAmount = Math.max(subtotal - discountAmount, 0)
  const taxAmount = taxableAmount * 0.13
  const grandTotal = taxableAmount + taxAmount
  return { subtotal, discountAmount, taxableAmount, taxAmount, grandTotal }
}
```

```tsx
// InvoicePaperDocument.tsx
// Render:
// - header
// - party details
// - metadata
// - items table
// - totals block
// - amount in words
// - notes/signature footer
```

```ts
// amountInWords.ts
// Convert the grand total into simple NPR words for the footer.
```

- [ ] **Step 4: Update the sales and purchase detail pages to use the shared document**

```tsx
// SalesInvoiceDetailPage.tsx and PurchaseDetailPage.tsx
// Build a normalized invoice props object and pass it into InvoicePaperDocument.
// Keep the existing workflow actions outside the paper layout.
```

- [ ] **Step 5: Run the focused web tests**

Run:

```bash
cd apps/api
npm run test:api -- salesInvoiceService.test.ts
```

Expected: the shared invoice document renders from both detail pages, and the API service test remains green.

### Task 2: Add sales invoice numbering and auto VAT to the sales create flow

**Files:**
- Modify: `apps/web/pages/sales/SalesInvoiceCreatePage.tsx`
- Modify: `apps/web/services/salesInvoiceApi.ts`
- Modify: `apps/api/src/validators/salesInvoiceValidators.ts`
- Modify: `apps/api/src/services/salesInvoiceService.ts`
- Modify: `apps/api/src/repositories/salesInvoiceRepository.ts`
- Modify: `apps/api/prisma/schema.prisma` only if the current data model is missing a persisted sales invoice field needed by the paper layout
- Modify: `apps/web/__tests__/salesInvoiceModule.test.tsx`
- Create: `apps/api/src/__tests__/salesInvoiceService.test.ts`

- [ ] **Step 1: Write the failing tests for sales invoice number and VAT behavior**

```ts
// apps/web/__tests__/salesInvoiceModule.test.tsx
// Assert the create page shows a prefilled invoice number field that can be edited.
// Assert the summary shows VAT changing when line values change.

// apps/api/src/__tests__/salesInvoiceService.test.ts
// Assert create/update keeps an edited invoice number.
// Assert invoice taxAmount/grandTotal reflect taxableAmount * 0.13.
```

- [ ] **Step 2: Run the tests and confirm the current flow still lacks the required behavior**

Run:

```bash
cd apps/api
npm run test:api -- salesInvoiceService.test.ts
```

Expected: fail until the VAT and editable numbering behavior is implemented.

- [ ] **Step 3: Implement sales invoice number prefill and editability in the create page**

```tsx
// SalesInvoiceCreatePage.tsx
// Add an invoiceNumber input.
// Prefill it from a sales-invoice preview endpoint or the existing repository numbering rule.
// Keep it editable until issue.
```

- [ ] **Step 4: Centralize sales VAT calculation in the create flow**

```ts
// SalesInvoiceCreatePage.tsx
// Use calculateInvoiceTotals(items) and set taxAmount/grandTotal from taxableAmount * 0.13.
// Keep the backend payload aligned with the previewed VAT.
```

- [ ] **Step 5: Persist and validate the sales invoice number in the backend**

```ts
// salesInvoiceValidators.ts
// Keep invoiceNumber optional in draft creation, but do not overwrite a user-edited value.

// salesInvoiceService.ts
// Preserve payload.invoiceNumber on create and update.
// Continue generating the issue-time fallback only when the invoice number is still blank.
```

- [ ] **Step 6: Update sales repository logic to respect user-entered values**

```ts
// salesInvoiceRepository.ts
// Keep issue-time auto-number generation as a fallback only.
// Do not clobber an invoiceNumber that was already saved from the create screen.
```

- [ ] **Step 7: Run the sales tests**

Run:

```bash
cd apps/api
npm run test:api -- salesInvoiceService.test.ts
```

Expected: sales create, update, and detail flows preserve the edited invoice number and show auto-calculated VAT; verify the web side in the browser on `http://localhost:5173/#/sales-invoices`.

### Task 3: Add manual purchase invoice numbering and VAT persistence

**Files:**
- Modify: `apps/web/pages/inventory/PurchaseCreate.tsx`
- Modify: `apps/web/pages/inventory/PurchaseDetailPage.tsx`
- Modify: `apps/api/src/validators/inventoryValidators.ts`
- Modify: `apps/api/src/controllers/inventory/purchasesController.ts`
- Modify: `apps/api/src/services/inventory/purchaseService.ts`
- Modify: `apps/api/src/repositories/inventory/purchaseRepository.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed_inventory.ts`
- Create: `apps/api/src/__tests__/purchaseService.test.ts`
- Create: `apps/web/__tests__/purchaseInvoiceModule.test.tsx`

- [ ] **Step 1: Write the failing tests for manual purchase numbering and VAT**

```ts
// apps/web/__tests__/purchaseInvoiceModule.test.tsx
// Assert the purchase create page has a required invoice number input.
// Assert the purchase detail page renders the shared paper layout and VAT rows.

// apps/api/src/__tests__/purchaseService.test.ts
// Assert createPurchase rejects missing invoiceNumber.
// Assert totals include VAT 13% and persisted grand total.
```

- [ ] **Step 2: Run the tests to confirm the current purchase flow does not persist VAT yet**

Run:

```bash
cd apps/api
npm run test:api -- purchaseService.test.ts
```

Expected: fail until purchase VAT fields and validation are added.

- [ ] **Step 3: Make invoice number required in the purchase create flow**

```tsx
// PurchaseCreate.tsx
// Add a visible invoiceNumber field in the Details section.
// Mark it required and include it in the POST payload.
```

- [ ] **Step 4: Extend the purchase data model to store tax totals**

```prisma
// schema.prisma
model Purchase {
  id            String   @id @default(cuid())
  supplierId    String
  invoiceNumber String?
  invoiceDate   DateTime
  currency      String   @default("NPR")
  subtotal      Decimal  @default(0)
  discountAmount Decimal @default(0)
  taxableAmount Decimal  @default(0)
  taxAmount     Decimal  @default(0)
  totalAmount   Decimal  @default(0)
  createdBy     Int?
  createdAt     DateTime @default(now())
  status        String   @default("received")
  notes         String?
  items         PurchaseItem[]
}
```

- [ ] **Step 5: Calculate and save VAT during purchase creation**

```ts
// purchaseService.ts
// Compute subtotal from line totals.
// Compute taxableAmount = subtotal - discountAmount.
// Compute taxAmount = taxableAmount * 0.13.
// Save totalAmount = taxableAmount + taxAmount.
```

- [ ] **Step 6: Update the purchase detail page to render the shared paper layout**

```tsx
// PurchaseDetailPage.tsx
// Use the same InvoicePaperDocument props shape as sales.
// Feed supplier info, line items, totals, amount in words, and notes.
```

- [ ] **Step 7: Run the purchase tests**

Run:

```bash
cd apps/api
npm run test:api -- purchaseService.test.ts
```

Expected: purchase create requires invoice number, persists VAT, and detail view matches the shared paper layout; verify the web side in the browser on `http://localhost:5173/#/inventory/purchases`.

### Task 4: Verify the end-to-end invoice output and update the repo graph

**Files:**
- Modify: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Modify: `apps/web/pages/inventory/PurchaseDetailPage.tsx`
- Modify: `apps/web/pages/sales/SalesInvoiceCreatePage.tsx`
- Modify: `apps/web/pages/inventory/PurchaseCreate.tsx`
- Modify: `apps/web/components/invoices/*`

- [ ] **Step 1: Run the API and web tests together**

Run:

```bash
cd apps/api
npm run test:api
```

Expected: the API test suite passes, and the browser validation from the earlier tasks confirms the web layouts.

- [ ] **Step 2: Manually verify the invoice screens in the browser**

Open:

```text
http://localhost:5173/#/sales-invoices
http://localhost:5173/#/inventory/purchases
```

Confirm:

- sales invoice number is auto-filled and editable
- purchase invoice number is manually entered
- VAT updates automatically
- the detail views look like one consistent business invoice style

- [ ] **Step 3: Refresh graphify after code changes**

Run:

```bash
graphify update .
```

Expected: `graphify-out/` is updated to reflect the new invoice component relationships.

- [ ] **Step 4: Commit the implementation**

```bash
git add apps/web/components/invoices apps/web/pages/sales/SalesInvoiceCreatePage.tsx apps/web/pages/sales/SalesInvoiceDetailPage.tsx apps/web/pages/inventory/PurchaseCreate.tsx apps/web/pages/inventory/PurchaseDetailPage.tsx apps/web/services/salesInvoiceApi.ts apps/api/src/validators/salesInvoiceValidators.ts apps/api/src/validators/inventoryValidators.ts apps/api/src/services/salesInvoiceService.ts apps/api/src/services/inventory/purchaseService.ts apps/api/src/repositories/salesInvoiceRepository.ts apps/api/src/repositories/inventory/purchaseRepository.ts apps/api/prisma/schema.prisma apps/api/prisma/seed_inventory.ts apps/web/__tests__/salesInvoiceModule.test.tsx apps/web/__tests__/purchaseInvoiceModule.test.tsx apps/api/src/__tests__/salesInvoiceService.test.ts apps/api/src/__tests__/purchaseService.test.ts
git commit -m "feat(invoices): add paper format for sales and purchases"
```
