# Sales Invoice Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Merlin-native sales invoice module that creates draft invoices, issues them against finished-goods stock, records payment status, supports print/export, and tracks cancellations and audit history.

**Architecture:** Build the module inside the existing Merlin web/API stack. Add a dedicated API router, service, repository, and schema-backed invoice tables on the backend; add list/create/detail pages plus shared invoice UI components on the frontend; and wire everything into the existing authenticated layout and sidebar. Stock moves only when an invoice is issued, not when it is drafted.

**Tech Stack:** Express, Prisma, React 19, React Router, TypeScript, Vite, existing Merlin auth/layout/components, existing stock transaction patterns.

---

### Task 1: Add the invoice data model and backend route mount

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/routes/salesInvoiceRoutes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Write the failing schema expectation**

```ts
// Add invoice tables and enums in schema.prisma:
// - sales_invoices
// - sales_invoice_items
// - payments
// - invoice/payment status enums
```

- [ ] **Step 2: Run the backend build and confirm the schema is missing**

Run: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/api run build`
Expected: fail or report missing model references until the schema and routes exist.

- [ ] **Step 3: Implement the schema and route mount**

```prisma
enum SalesInvoiceStatus {
  DRAFT
  PENDING_APPROVAL
  ISSUED
  CANCELLED
}

enum SalesPaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

model SalesInvoice {
  id                String              @id @default(cuid())
  invoiceNumber     String?             @unique
  fiscalYear        String?
  customerId        String
  customer          Customer            @relation(fields: [customerId], references: [id])
  salesOrderId      String?
  invoiceDate       DateTime
  dueDate           DateTime?
  subtotal          Decimal             @default(0)
  discountAmount    Decimal             @default(0)
  taxableAmount     Decimal             @default(0)
  nonTaxableAmount  Decimal             @default(0)
  taxAmount         Decimal             @default(0)
  grandTotal        Decimal             @default(0)
  paidAmount        Decimal             @default(0)
  dueAmount         Decimal             @default(0)
  paymentStatus     SalesPaymentStatus   @default(UNPAID)
  invoiceStatus     SalesInvoiceStatus   @default(DRAFT)
  printedCount      Int                 @default(0)
  syncStatus        String?
  syncReference     String?
  cancellationReason String?
  remarks           String?
  createdBy         Int?
  approvedBy        Int?
  issuedBy          Int?
  cancelledBy       Int?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt()
  approvedAt        DateTime?
  issuedAt          DateTime?
  cancelledAt       DateTime?
  items             SalesInvoiceItem[]
  payments          Payment[]
}

model SalesInvoiceItem {
  id             String       @id @default(cuid())
  invoiceId      String
  invoice        SalesInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  productId      String
  productCode    String?
  productName    String
  quantity       Float
  unitPrice      Decimal
  discountAmount Decimal     @default(0)
  taxableAmount  Decimal     @default(0)
  taxAmount      Decimal     @default(0)
  lineTotal      Decimal
  costPrice      Decimal     @default(0)
  profitAmount   Decimal     @default(0)
  warehouseId    String?
  createdAt      DateTime    @default(now())
}
```

- [ ] **Step 4: Run the backend build and confirm the route compiles**

Run: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/api run build`
Expected: pass after the schema and route file are added.

### Task 2: Implement the invoice service layer and stock rules

**Files:**
- Create: `apps/api/src/services/salesInvoiceService.ts`
- Create: `apps/api/src/repositories/salesInvoiceRepository.ts`
- Modify: `apps/api/src/services/inventory/stockTransactionService.ts`
- Modify: `apps/api/src/services/inventory/materialService.ts`

- [ ] **Step 1: Write the service contract test**

```ts
describe('salesInvoiceService', () => {
  it('does not deduct stock on draft save')
  it('deducts finished goods stock only on issue')
  it('reverses stock on cancel after issue')
  it('updates payment status from payments')
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test` or the focused API test command used in this repo
Expected: fail because the service does not exist yet.

- [ ] **Step 3: Implement transactional invoice logic**

```ts
// Pseudocode for the service:
// - create draft invoice without stock mutation
// - submit to pending approval
// - issue invoice:
//   - validate stock availability for each item
//   - generate invoice number
//   - create sales invoice items
//   - create finished-goods stock transactions
//   - lock invoice fields
//   - compute profit and due amount
// - record payment:
//   - update paidAmount, dueAmount, paymentStatus
// - cancel invoice:
//   - require reason
//   - reverse stock if already issued
//   - preserve invoice number and audit trail
```

- [ ] **Step 4: Run the service tests again**

Run: `npm test`
Expected: pass.

### Task 3: Add invoice controller actions and API endpoints

**Files:**
- Create: `apps/api/src/controllers/salesInvoiceController.ts`
- Modify: `apps/api/src/routes/salesInvoiceRoutes.ts`

- [ ] **Step 1: Write controller tests**

```ts
describe('salesInvoiceController', () => {
  it('lists invoices')
  it('creates drafts')
  it('issues invoices')
  it('records payments')
  it('cancels issued invoices')
})
```

- [ ] **Step 2: Implement controller methods**

```ts
// Endpoints:
// GET /sales-invoices
// GET /sales-invoices/:id
// POST /sales-invoices
// PATCH /sales-invoices/:id
// POST /sales-invoices/:id/submit
// POST /sales-invoices/:id/issue
// POST /sales-invoices/:id/payment
// POST /sales-invoices/:id/cancel
// GET /sales-invoices/:id/pdf
// GET /sales-invoices/export
```

- [ ] **Step 3: Mount the router in the app router tree**

```ts
// app router mount example:
// router.use("/sales-invoices", salesInvoiceRoutes);
```

- [ ] **Step 4: Run the backend build**

Run: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/api run build`
Expected: pass.

### Task 4: Add sales invoice API client methods

**Files:**
- Create: `apps/web/services/salesInvoiceApi.ts`
- Modify: `apps/web/services/api.ts`

- [ ] **Step 1: Write a client usage test**

```ts
// Verify the client calls the correct endpoints and payloads for:
// - list
// - create draft
// - submit
// - issue
// - payment
// - cancel
// - pdf/export
```

- [ ] **Step 2: Implement the client methods**

```ts
export const salesInvoiceApi = {
  list: () => request('/sales-invoices'),
  get: (id: string) => request(`/sales-invoices/${id}`),
  create: (data) => request('/sales-invoices', { method: 'POST', body: data }),
  update: (id: string, data) => request(`/sales-invoices/${id}`, { method: 'PATCH', body: data }),
  submit: (id: string) => request(`/sales-invoices/${id}/submit`, { method: 'POST' }),
  issue: (id: string) => request(`/sales-invoices/${id}/issue`, { method: 'POST' }),
  payment: (id: string, data) => request(`/sales-invoices/${id}/payment`, { method: 'POST', body: data }),
  cancel: (id: string, data) => request(`/sales-invoices/${id}/cancel`, { method: 'POST', body: data }),
}
```

- [ ] **Step 3: Run the web build**

Run: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/web run build`
Expected: pass.

### Task 5: Build the sales invoice pages and sidebar wiring

**Files:**
- Create: `apps/web/pages/sales/SalesInvoiceListPage.tsx`
- Create: `apps/web/pages/sales/SalesInvoiceDetailPage.tsx`
- Create: `apps/web/pages/sales/SalesInvoiceCreatePage.tsx`
- Create: `apps/web/components/sales/InvoiceItemTable.tsx`
- Create: `apps/web/components/sales/InvoiceTotalsCard.tsx`
- Modify: `apps/web/App.tsx`
- Modify: `apps/web/components/Layout.tsx`

- [ ] **Step 1: Write page-level tests**

```ts
// Verify the invoice pages render:
// - list columns
// - draft creation form
// - issue/print/cancel actions
// - payment status and totals
```

- [ ] **Step 2: Implement the list/detail/create pages**

```tsx
// List page:
// - invoice number, customer, date, grand total, paid, due, payment, status, created by, actions
// Create page:
// - customer header, item table, totals, save draft, submit, issue, print
// Detail page:
// - status timeline, item breakdown, payment history, print/export, cancel
```

- [ ] **Step 3: Wire routes and sidebar links**

```tsx
// Add routes:
// /sales-invoices
// /sales-invoices/create
// /sales-invoices/:id
// Add sidebar entries for Sales Invoices and Create Invoice
```

- [ ] **Step 4: Run the web build**

Run: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/web run build`
Expected: pass.

### Task 6: Seed demo sales data and verify the module end to end

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Create: `apps/api/prisma/seed_sales_invoices.ts`

- [ ] **Step 1: Write a seed verification**

```ts
// Seed:
// - one customer
// - one draft invoice
// - one issued invoice
// - one paid invoice
// - one cancelled invoice
// - finished-goods stock transactions
```

- [ ] **Step 2: Implement the seed**

```ts
// Create demo customer and invoice records that exercise all invoice states.
```

- [ ] **Step 3: Run the Prisma seed**

Run: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/api exec -- prisma db seed`
Expected: completes successfully.

- [ ] **Step 4: Run the web and API builds**

Run:
`& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/api run build`
`& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' --workspace apps/web run build`

Expected: both pass.

### Task 7: Verify issued/cancelled stock behavior in the browser

**Files:**
- No code changes expected unless bugs are found.

- [ ] **Step 1: Start the API and web app**

Run the existing Merlin dev commands for API and web only.

- [ ] **Step 2: Create a draft invoice in the UI**

Expected: no stock deduction until issue.

- [ ] **Step 3: Issue the invoice**

Expected: finished-goods stock decreases and stock transaction is recorded.

- [ ] **Step 4: Cancel an issued invoice**

Expected: stock is reversed and cancellation reason is stored.

- [ ] **Step 5: Confirm the invoice list/detail pages reflect status and payment**

Expected: payment status, totals, and print count remain consistent.

### Coverage Check

- Draft invoice without stock deduction: Task 2, Task 7
- Issue/cancel stock rules: Task 2, Task 7
- Invoice number and status flow: Task 1, Task 2, Task 3
- Payment status logic: Task 2, Task 3
- Print/export placeholders and routes: Task 3, Task 5
- Seed/demo data: Task 6
- Merlin-native integration: Task 3, Task 4, Task 5
