# Module 2: Supplier Management — Software Requirements Specification

**Project:** MERLIN Garment Factory Management System  
**Date:** 2026-06-02  
**Status:** Final Draft

---

## 1. Purpose

The Supplier Management module stores and manages supplier information used for raw material purchasing, purchase history tracking, cost analysis, and procurement reporting. It acts as the vendor registry for all inventory procurement workflows in the garment factory.

---

## 2. Current State Analysis

The system already has a minimal supplier implementation. This SRS defines the delta to bring it to production grade.

| Layer | Existing | Missing / Needs Update |
|-------|----------|----------------------|
| **Prisma Model** | `id`, `name`, `contactName`, `phone`, `email`, `address`, `externalRef`, `balance`, `createdBy`, `createdAt`, `updatedAt`, `purchases[]` | `panVatNumber`, `status` (active/inactive), `notes`, `updatedBy`, `deletedAt` |
| **Repository** | `create`, `get`, `list` (name search only), `update`, `softDeleteSupplier` (empty placeholder) | Search by phone/email/PAN; pagination metadata; conditional delete guard |
| **Service** | Thin pass-through to repository | Add business validation, status toggle logic |
| **Controller** | `create`, `list`, `get`, `update` | `remove` (soft delete), `toggleStatus`, `purchases` (history) |
| **Routes** | `POST`, `GET /`, `GET /:id`, `PUT /:id` | `PATCH /:id/status`, `DELETE /:id`, `GET /:id/purchases` |
| **Validation** | None for suppliers | Zod schema for create + update |
| **Frontend** | Single page listing names | Full feature: list, form, detail, search, status badge, dropdown, modals |
| **Audit** | Logs `create` and `update` (after only) | Add `before` state; add `deactivate` and `delete` actions |

---

## 3. Backend Architecture

New module at `apps/api/src/modules/suppliers/`. Mounted into the existing route index without restructuring existing code.

### 3.1 Folder Structure

```
apps/api/src/modules/suppliers/
├── supplier.routes.ts
├── supplier.controller.ts
├── supplier.service.ts
├── supplier.validation.ts
└── supplier.model.ts         (types/mappers)

apps/web/src/features/suppliers/
├── SupplierListPage.tsx
├── SupplierForm.tsx
├── SupplierDetailPage.tsx
├── SupplierDropdown.tsx
└── supplierApi.ts
```

### 3.2 Database Model (Prisma Migration)

Add a `SupplierStatus` enum and extend the `Supplier` model:

```prisma
enum SupplierStatus {
  ACTIVE
  INACTIVE
}

model Supplier {
  id            String          @id @default(cuid())
  name          String
  contactName   String?
  phone         String?
  email         String?
  address       String?
  panVatNumber  String?                       // NEW
  status        SupplierStatus  @default(ACTIVE)  // NEW (was implicit)
  notes         String?                       // NEW
  externalRef   String?
  balance       Decimal         @default(0)
  createdBy     Int?
  updatedBy     Int?                          // NEW
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt()
  deletedAt     DateTime?                     // NEW (soft delete)
  purchases     Purchase[]

  @@index([name])
  @@index([phone])
  @@index([email])
  @@index([panVatNumber])
}
```

### 3.3 Validation Schema (`supplier.validation.ts`)

```ts
import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  panVatNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()
```

### 3.4 Service Layer (`supplier.service.ts`)

| Method | Logic |
|--------|-------|
| `createSupplier(data)` | Validate with `createSupplierSchema`; check duplicate name/phone; call repo; return created record |
| `listSuppliers(opts)` | Pass search (name/phone/email/panVatNumber), status filter, pagination to repo; return `{ data, total, skip, take }` |
| `getSupplier(id)` | Fetch by id; throw 404 if not found or soft-deleted |
| `updateSupplier(id, data)` | Validate with `updateSupplierSchema`; check existence; call repo |
| `toggleSupplierStatus(id)` | Toggle between ACTIVE and INACTIVE; return updated record |
| `removeSupplier(id)` | Check `Purchase.count` for supplier; if > 0, throw 409; else soft-delete (set `deletedAt`) |
| `getSupplierPurchases(id, opts)` | Paginated purchases for supplier; return `{ data, total }` |

### 3.5 Controller Layer (`supplier.controller.ts`)

| Handler | Input | Response | Audit |
|---------|-------|----------|-------|
| `create` | Body | `201` + created record | `supplier.create` (after) |
| `list` | Query: skip, take, search, status | `200` + `{ data, total, skip, take }` | — |
| `get` | Param: id | `200` + record / `404` | — |
| `update` | Param: id, body | `200` + updated record | `supplier.update` (before + after) |
| `toggleStatus` | Param: id | `200` + updated record | `supplier.activate` or `supplier.deactivate` |
| `remove` | Param: id | `200` + `{ message }` / `409` | `supplier.delete` (before) |
| `listPurchases` | Param: id, query | `200` + `{ data, total }` | — |

### 3.6 Routes (`supplier.routes.ts`)

```ts
import { Router } from 'express'
import * as ctrl from './supplier.controller'
import { authenticate } from '../../middleware/auth'
import { requireRoles } from '../../middleware/rbac'
import { Role } from '@prisma/client'

const router = Router()

router.get('/',          authenticate, ctrl.list)
router.get('/:id',       authenticate, ctrl.get)
router.post('/',         authenticate, requireRoles(Role.ADMIN, Role.MANAGER), ctrl.create)
router.put('/:id',       authenticate, requireRoles(Role.ADMIN, Role.MANAGER), ctrl.update)
router.patch('/:id/status', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), ctrl.toggleStatus)
router.delete('/:id',    authenticate, requireRoles(Role.ADMIN), ctrl.remove)
router.get('/:id/purchases', authenticate, ctrl.listPurchases)

export default router
```

Mounted in `routes/index.ts`:

```ts
import supplierRoutes from '../modules/suppliers/supplier.routes'
router.use('/inventory/suppliers', supplierRoutes)
```

### 3.7 Complete API Endpoints

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/api/v1/inventory/suppliers` | JWT | All authenticated | List with pagination, search, status filter |
| `GET` | `/api/v1/inventory/suppliers/:id` | JWT | All authenticated | Get single supplier |
| `POST` | `/api/v1/inventory/suppliers` | JWT | Admin, Manager | Create supplier |
| `PUT` | `/api/v1/inventory/suppliers/:id` | JWT | Admin, Manager | Update supplier |
| `PATCH` | `/api/v1/inventory/suppliers/:id/status` | JWT | Admin, Manager | Toggle active/inactive |
| `DELETE` | `/api/v1/inventory/suppliers/:id` | JWT | Admin | Soft delete (blocked if linked to purchases) |
| `GET` | `/api/v1/inventory/suppliers/:id/purchases` | JWT | All authenticated | Paginated purchase history |

### 3.8 Audit Logging

Every mutation in the controller records via `recordAudit()` from `apps/api/src/utils/auditLog.ts`:

| Action | Captures |
|--------|----------|
| `supplier.create` | `after` = created record |
| `supplier.update` | `before` = old record, `after` = updated record |
| `supplier.deactivate` | `after` = record with INACTIVE status |
| `supplier.activate` | `after` = record with ACTIVE status |
| `supplier.delete` | `before` = full record being soft-deleted |

---

## 4. Frontend Architecture

### 4.1 Supplier List Page (`SupplierListPage.tsx`)

- **Data table** with columns: Name, Contact Person, Phone, Email, PAN/VAT, Status, Actions
- **Pagination** (skip/take from API metadata)
- **Search bar** — debounced, searches across name/phone/email/PAN
- **Status filter** — dropdown: All / Active / Inactive
- **Add Supplier button** — visible to Admin/Manager only
- **Status badge** — green for ACTIVE, gray for INACTIVE
- **Action buttons**: View (all roles), Edit (Admin/Manager), Deactivate/Activate (Admin/Manager), Delete (Admin only)

### 4.2 Supplier Form (`SupplierForm.tsx`)

Shared for create and edit:
- Fields: Supplier Name (required), Contact Person, Phone (required), Email, Address, PAN/VAT Number, Notes
- Inline validation errors
- Loading state on submit
- Cancel navigates back to list
- Pre-populated on edit

### 4.3 Supplier Detail Page (`SupplierDetailPage.tsx`)

Route: `/inventory/suppliers/:id`
- Read-only card layout showing all supplier fields
- Status badge
- Edit button (Admin/Manager)
- Purchase history mini-table (recent purchases with date, invoice, items, amount)
- Back to list link

### 4.4 Supplier Dropdown (`SupplierDropdown.tsx`)

- Fetches active suppliers from `GET /api/v1/inventory/suppliers?status=ACTIVE&take=200`
- Props: `value`, `onChange`, `disabled`
- Displays `"{name} ({panVatNumber})"` when PAN/VAT exists
- Memoizes option list with `useMemo`
- Used in the purchase creation form

### 4.5 Supplier API Client (`supplierApi.ts`)

```ts
export const supplierApi = {
  list:         (params?: { skip?; take?; search?; status? }) => GET('/api/v1/inventory/suppliers', { params }),
  get:          (id: string) => GET(`/api/v1/inventory/suppliers/${id}`),
  create:       (data: CreateSupplierPayload) => POST('/api/v1/inventory/suppliers', data),
  update:       (id: string, data: UpdateSupplierPayload) => PUT(`/api/v1/inventory/suppliers/${id}`, data),
  toggleStatus: (id: string) => PATCH(`/api/v1/inventory/suppliers/${id}/status`),
  remove:       (id: string) => DELETE(`/api/v1/inventory/suppliers/${id}`),
  listPurchases: (id: string, params?: { skip?; take? }) => GET(`/api/v1/inventory/suppliers/${id}/purchases`, { params }),
}
```

### 4.6 Confirmation Modals

Use existing `components/ui/Modal.tsx`:
- **Deactivate**: "Are you sure you want to deactivate {name}? Deactivated suppliers will not appear in purchase dropdowns."
- **Delete**: "Are you sure you want to delete {name}? This action cannot be undone." Error display if blocked (409).

### 4.7 Routing

```tsx
<Route path="/inventory/suppliers/:id" element={<SupplierDetailPage />} />
```

---

## 5. Functional Requirements

| ID | Description |
|----|-------------|
| FR-001 | The system shall allow Admin/Manager users to create supplier records with at minimum a supplier name and phone number. New suppliers default to ACTIVE status. |
| FR-002 | The system shall display a paginated list of all non-deleted suppliers showing name, contact person, phone, email, PAN/VAT, and status. |
| FR-003 | The system shall allow users to search suppliers by name, phone, email, or PAN/VAT using a single search input, and filter by status. |
| FR-004 | The system shall display a detailed view of a supplier including all fields and recent purchase history. |
| FR-005 | The system shall allow Admin/Manager users to update supplier details with validated input and audit logging of before/after values. |
| FR-006 | The system shall allow Admin/Manager users to toggle supplier status between ACTIVE and INACTIVE. Inactive suppliers are excluded from purchase dropdowns. |
| FR-007 | The system shall allow Admin users to soft-delete suppliers by setting `deletedAt`. Deleted records are excluded from all queries. |
| FR-008 | The system shall reject deletion requests (HTTP 409) for suppliers linked to existing purchase records. |
| FR-009 | The system shall expose a paginated purchase history endpoint for each supplier. |
| FR-010 | The system shall validate all supplier input: name and phone required; email validated for format if provided; PAN/VAT optional. |

---

## 6. Business Rules

| ID | Rule |
|----|------|
| BR-001 | Only authenticated users can view supplier data |
| BR-002 | Only Admin or Manager can create, update, or deactivate |
| BR-003 | Only Admin can soft-delete |
| BR-004 | Inventory Staff and Data Entry roles can view suppliers (for purchase selection) |
| BR-005 | Supplier name and phone are required |
| BR-006 | PAN/VAT is optional now, stored for future compliance |
| BR-007 | Inactive suppliers excluded from purchase dropdowns |
| BR-008 | Suppliers with purchase records cannot be deleted |
| BR-009 | All deletions are soft (set `deletedAt`, never `prisma.delete`) |
| BR-010 | Audit logs capture before/after for all mutations |

---

## 7. User Roles & Permissions

| Action | Admin | Manager | Inventory Staff | Data Entry |
|--------|-------|---------|----------------|------------|
| View list/details | ✅ | ✅ | ✅ | ✅ |
| View purchase history | ✅ | ✅ | ✅ | ✅ |
| Create supplier | ✅ | ✅ | ❌ | ❌ |
| Update supplier | ✅ | ✅ | ❌ | ❌ |
| Activate/deactivate | ✅ | ✅ | ❌ | ❌ |
| Soft delete | ✅ | ❌ | ❌ | ❌ |

---

## 8. Module Connections

| Module | Connection |
|--------|-----------|
| **Authentication & User Management** | JWT middleware on all routes; RBAC via `requireRoles`; `createdBy`/`updatedBy` from `req.user` |
| **Raw Material Management** | Supplier selected when creating purchases; dropdown uses active-only filter; `supplierId` FK on `Purchase` |
| **Reports & Dashboard** | `GET /suppliers/:id/purchases` provides data for supplier-wise purchase reports and cost analysis |
| **Audit Logs** | All mutations recorded via `recordAudit()` with before/after snapshots |

---

## 9. Future Compatibility

| Feature | Design Decision |
|---------|----------------|
| Tax reporting (IRD) | `panVatNumber` stored now, queryable later for VAT reports |
| Supplier balance/payables | `balance` field exists on model (Decimal, default 0) |
| Document uploads | Can add `SupplierDocument` table; `notes` field for metadata in current phase |
| IRD purchase invoices | Purchase history endpoint returns structured data with invoice fields |
| Export/Import | Supplier data exportable via existing CSV export module |

---

## 10. Implementation Phases

**Phase 1 — Database + Backend (3-4 days)**
1. Add `SupplierStatus` enum and new fields to Prisma schema; run migration
2. Create `supplier.validation.ts` with Zod schemas
3. Create `supplier.service.ts` with all business logic
4. Create `supplier.controller.ts` with all handlers + audit logging
5. Create `supplier.routes.ts` and mount in route index

**Phase 2 — Frontend (3-4 days)**
1. Create `supplierApi.ts`
2. Build `SupplierListPage.tsx` (table, search, filter, pagination)
3. Build `SupplierForm.tsx` (shared create/edit)
4. Build `SupplierDetailPage.tsx` (detail + purchase history)
5. Build `SupplierDropdown.tsx` (for purchase forms)
6. Add confirmation modals
7. Add route to `App.tsx`

**Phase 3 — Testing (2 days)**
1. Test all endpoints against role matrix
2. Test purchase flow supplier selection
3. Test delete guard with/without purchase records
4. Verify audit log entries
5. Test frontend flows end-to-end
