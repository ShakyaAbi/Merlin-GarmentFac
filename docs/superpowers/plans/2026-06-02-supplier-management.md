# Supplier Management Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing minimal supplier module to production grade with full CRUD, soft delete, status management, purchase history, audit logging, and a complete React frontend.

**Architecture:** New domain-organized module at `apps/api/src/modules/suppliers/` (routes → controller → service → Prisma) mounted alongside existing layer-based code. Frontend at `apps/web/pages/inventory/` and `apps/web/components/inventory/` following existing conventions.

**Tech Stack:** Express.js / TypeScript / Prisma ORM / PostgreSQL / Zod / React / Tailwind CSS

---

### Task 1: Prisma Schema — Add SupplierStatus enum and new Supplier fields

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add the SupplierStatus enum**

Insert before the `Supplier` model in `schema.prisma`:

```prisma
enum SupplierStatus {
  ACTIVE
  INACTIVE
}
```

- [ ] **Step 2: Add new fields to the Supplier model**

Find the existing `Supplier` model and replace it:

```prisma
model Supplier {
  id            String          @id @default(cuid())
  name          String
  contactName   String?
  phone         String?
  email         String?
  address       String?
  panVatNumber  String?
  status        SupplierStatus  @default(ACTIVE)
  notes         String?
  externalRef   String?
  balance       Decimal         @default(0)
  createdBy     Int?
  updatedBy     Int?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt()
  deletedAt     DateTime?
  purchases     Purchase[]

  @@index([name])
  @@index([phone])
  @@index([email])
  @@index([panVatNumber])
}
```

- [ ] **Step 3: Generate Prisma migration**

```bash
cd apps/api
npx prisma migrate dev --name add_supplier_status_and_fields
```

Expected: Migration created and applied. `SupplierStatus` enum and new columns exist.

---

### Task 2: Supplier Validation Module

**Files:**
- Create: `apps/api/src/modules/suppliers/supplier.validation.ts`

- [ ] **Step 1: Create the validation schemas**

```ts
import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required'),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().trim().optional(),
  panVatNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
```

---

### Task 3: Supplier Service Module

**Files:**
- Create: `apps/api/src/modules/suppliers/supplier.service.ts`

- [ ] **Step 1: Create the service with all business logic**

```ts
import { PrismaClient, SupplierStatus } from '@prisma/client'
import { createSupplierSchema, updateSupplierSchema, CreateSupplierInput, UpdateSupplierInput } from './supplier.validation'

const prisma = new PrismaClient()

export const createSupplier = async (data: CreateSupplierInput & { createdBy?: number }) => {
  const parsed = createSupplierSchema.parse(data)
  return prisma.supplier.create({
    data: {
      name: parsed.name,
      contactName: parsed.contactPerson,
      phone: parsed.phone,
      email: parsed.email || null,
      address: parsed.address || null,
      panVatNumber: parsed.panVatNumber || null,
      notes: parsed.notes || null,
      createdBy: data.createdBy,
    },
  })
}

export const listSuppliers = async (opts: {
  skip?: number
  take?: number
  search?: string
  status?: SupplierStatus
}) => {
  const where: any = { deletedAt: null }
  if (opts.status) where.status = opts.status
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { phone: { contains: opts.search, mode: 'insensitive' } },
      { email: { contains: opts.search, mode: 'insensitive' } },
      { panVatNumber: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip: opts.skip ?? 0,
      take: opts.take ?? 50,
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.count({ where }),
  ])
  return { data, total, skip: opts.skip ?? 0, take: opts.take ?? 50 }
}

export const getSupplier = async (id: string) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
  })
  if (!supplier) {
    const err = new Error('Supplier not found')
    ;(err as any).statusCode = 404
    throw err
  }
  return supplier
}

export const updateSupplier = async (id: string, data: UpdateSupplierInput & { updatedBy?: number }) => {
  const existing = await getSupplier(id)
  const parsed = updateSupplierSchema.parse(data)
  return prisma.supplier.update({
    where: { id },
    data: {
      name: parsed.name,
      contactName: parsed.contactPerson,
      phone: parsed.phone,
      email: parsed.email !== undefined ? (parsed.email || null) : undefined,
      address: parsed.address !== undefined ? (parsed.address || null) : undefined,
      panVatNumber: parsed.panVatNumber !== undefined ? (parsed.panVatNumber || null) : undefined,
      notes: parsed.notes !== undefined ? (parsed.notes || null) : undefined,
      updatedBy: data.updatedBy,
    },
  })
}

export const toggleSupplierStatus = async (id: string) => {
  const existing = await getSupplier(id)
  const newStatus = existing.status === SupplierStatus.ACTIVE ? SupplierStatus.INACTIVE : SupplierStatus.ACTIVE
  return prisma.supplier.update({
    where: { id },
    data: { status: newStatus },
  })
}

export const removeSupplier = async (id: string) => {
  const existing = await getSupplier(id)
  const purchaseCount = await prisma.purchase.count({ where: { supplierId: id } })
  if (purchaseCount > 0) {
    const err = new Error('Cannot delete supplier linked to existing purchase records')
    ;(err as any).statusCode = 409
    throw err
  }
  return prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export const getSupplierPurchases = async (id: string, opts: { skip?: number; take?: number }) => {
  await getSupplier(id)
  const where = { supplierId: id }
  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip: opts.skip ?? 0,
      take: opts.take ?? 20,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.purchase.count({ where }),
  ])
  return { data, total, skip: opts.skip ?? 0, take: opts.take ?? 20 }
}
```

---

### Task 4: Supplier Controller Module

**Files:**
- Create: `apps/api/src/modules/suppliers/supplier.controller.ts`

- [ ] **Step 1: Create the controller with audit logging**

```ts
import { Request, Response } from 'express'
import * as svc from './supplier.service'
import { recordAudit } from '../../utils/auditLog'

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const created = await svc.createSupplier({ ...req.body, createdBy: user })
  await recordAudit({ action: 'supplier.create', userId: user, after: created }).catch(() => {})
  res.status(201).json(created)
}

export const list = async (req: Request, res: Response) => {
  const data = await svc.listSuppliers({
    skip: Number(req.query.skip) || 0,
    take: Number(req.query.take) || 50,
    search: req.query.search as string,
    status: req.query.status as any,
  })
  res.json(data)
}

export const get = async (req: Request, res: Response) => {
  try {
    const data = await svc.getSupplier(req.params.id)
    res.json(data)
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { message: err.message } })
  }
}

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const before = await svc.getSupplier(req.params.id).catch(() => null)
  const updated = await svc.updateSupplier(req.params.id, { ...req.body, updatedBy: user })
  await recordAudit({ action: 'supplier.update', userId: user, before, after: updated }).catch(() => {})
  res.json(updated)
}

export const toggleStatus = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const updated = await svc.toggleSupplierStatus(req.params.id)
  const action = updated.status === 'ACTIVE' ? 'supplier.activate' : 'supplier.deactivate'
  await recordAudit({ action, userId: user, after: updated }).catch(() => {})
  res.json(updated)
}

export const remove = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user?.id
    const before = await svc.getSupplier(req.params.id).catch(() => null)
    await svc.removeSupplier(req.params.id)
    await recordAudit({ action: 'supplier.delete', userId: user, before }).catch(() => {})
    res.json({ message: 'Supplier deleted' })
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { message: err.message } })
  }
}

export const listPurchases = async (req: Request, res: Response) => {
  try {
    const data = await svc.getSupplierPurchases(req.params.id, {
      skip: Number(req.query.skip) || 0,
      take: Number(req.query.take) || 20,
    })
    res.json(data)
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { message: err.message } })
  }
}
```

---

### Task 5: Supplier Routes + Mount

**Files:**
- Create: `apps/api/src/modules/suppliers/supplier.routes.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Create the route file**

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

- [ ] **Step 2: Mount in routes/index.ts**

Add to imports at top:

```ts
import supplierRoutes from '../modules/suppliers/supplier.routes'
```

Add before `export default router`:

```ts
router.use('/inventory/suppliers', supplierRoutes)
```

- [ ] **Step 3: Remove old inventory routes for suppliers**

In `apps/api/src/routes/inventoryRoutes.ts`, delete the four supplier lines:

```ts
// Remove these lines:
router.post('/suppliers', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), suppliers.create)
router.get('/suppliers', authenticate, suppliers.list)
router.get('/suppliers/:id', authenticate, suppliers.get)
router.put('/suppliers/:id', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), suppliers.update)
```

Also remove the `import * as suppliers from '../controllers/inventory/suppliersController'` import from that file.

- [ ] **Step 4: Verify route mount order**

In `routes/index.ts`, ensure `supplierRoutes` is used **before** the catch-all inventory routes to avoid the old routes hijacking requests:

```ts
router.use('/inventory/suppliers', supplierRoutes)  // NEW module routes first
router.use('/inventory', inventoryRoutes)            // OLD catch-all routes
```

---

### Task 6: Frontend Types + API Client

**Files:**
- Modify: `apps/web/types.ts` — add Supplier type
- Create: `apps/web/services/supplierApi.ts`
- Modify: `apps/web/services/api.ts` — aggregate supplierApi

- [ ] **Step 1: Add Supplier types to `apps/web/types.ts`**

```ts
export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface Supplier {
  id: string
  name: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  panVatNumber?: string | null
  status: SupplierStatus
  notes?: string | null
  createdBy?: number | null
  updatedBy?: number | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface SupplierListResponse {
  data: Supplier[]
  total: number
  skip: number
  take: number
}

export interface PurchaseItem {
  id?: string
  rawMaterialId: string
  quantity: number
  unit: string
  unitPrice: string
  lineTotal?: string
  rawMaterial?: { name: string }
}

export interface Purchase {
  id: string
  supplierId: string
  invoiceNumber?: string | null
  invoiceDate: string
  currency: string
  totalAmount: string
  notes?: string | null
  createdAt: string
  items: PurchaseItem[]
}
```

- [ ] **Step 2: Create `apps/web/services/supplierApi.ts`**

```ts
import { request } from './apiClient'
import { Supplier, SupplierListResponse, Purchase } from '../types'

export const supplierApi = {
  list: (params?: { skip?: number; take?: number; search?: string; status?: string }) =>
    request<SupplierListResponse>('/inventory/suppliers', { params } as any),

  get: (id: string) =>
    request<Supplier>(`/inventory/suppliers/${id}`),

  create: (data: Partial<Supplier>) =>
    request<Supplier>('/inventory/suppliers', { method: 'POST', body: data }),

  update: (id: string, data: Partial<Supplier>) =>
    request<Supplier>(`/inventory/suppliers/${id}`, { method: 'PUT', body: data }),

  toggleStatus: (id: string) =>
    request<Supplier>(`/inventory/suppliers/${id}/status`, { method: 'PATCH' }),

  remove: (id: string) =>
    request<{ message: string }>(`/inventory/suppliers/${id}`, { method: 'DELETE' }),

  listPurchases: (id: string, params?: { skip?: number; take?: number }) =>
    request<{ data: Purchase[]; total: number }>(`/inventory/suppliers/${id}/purchases`, { params } as any),
}
```

- [ ] **Step 3: Add supplierApi to the aggregated API object**

In `apps/web/services/api.ts`, add import:

```ts
import { supplierApi } from './supplierApi'
```

Add to the spread inside the `api` object:

```ts
...supplierApi,
```

---

### Task 7: Rewrite Supplier List Page

**Files:**
- Rewrite: `apps/web/pages/inventory/SuppliersPage.tsx`

- [ ] **Step 1: Rewrite with data table, search, filter, pagination**

```tsx
import React, { useCallback, useEffect, useState } from 'react'
import { supplierApi } from '../../services/supplierApi'
import { Supplier, SupplierStatus } from '../../types'
import { getToken } from '../../services/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const take = 50

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await supplierApi.list({ skip, take, search: search || undefined, status: statusFilter || undefined })
      setSuppliers(res.data)
      setTotal(res.total)
    } catch { setSuppliers([]) }
    setLoading(false)
  }, [skip, take, search, statusFilter])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const totalPages = Math.ceil(total / take)
  const currentPage = Math.floor(skip / take) + 1

  const currentUser = () => {
    try { return JSON.parse(atob((getToken() || '').split('.')[1])) } catch { return {} }
  }
  const role = (currentUser() as any).role
  const canMutate = role === 'ADMIN' || role === 'MANAGER'
  const canDelete = role === 'ADMIN'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        {canMutate && (
          <a href="#/inventory/suppliers/create" className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
            Add Supplier
          </a>
        )}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name, phone, email, or PAN/VAT..."
          value={search}
          onChange={e => { setSearch(e.target.value); setSkip(0) }}
          className="flex-1 p-2 border rounded"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setSkip(0) }}
          className="p-2 border rounded"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Phone</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">PAN/VAT</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.contactName || '-'}</td>
                    <td className="p-3 text-slate-600">{s.phone || '-'}</td>
                    <td className="p-3 text-slate-600">{s.email || '-'}</td>
                    <td className="p-3 text-slate-600">{s.panVatNumber || '-'}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        s.status === SupplierStatus.ACTIVE
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status === SupplierStatus.ACTIVE ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <a href={`#/inventory/suppliers/${s.id}`} className="text-blue-600 hover:underline text-xs">View</a>
                        {canMutate && (
                          <button onClick={() => { window.location.hash = `/inventory/suppliers/${s.id}/edit` }} className="text-amber-600 hover:underline text-xs">Edit</button>
                        )}
                        {canMutate && (
                          <button onClick={async () => {
                            if (window.confirm(`Are you sure you want to ${s.status === SupplierStatus.ACTIVE ? 'deactivate' : 'activate'} ${s.name}?`)) {
                              await supplierApi.toggleStatus(s.id)
                              fetchSuppliers()
                            }
                          }} className="text-purple-600 hover:underline text-xs">
                            {s.status === SupplierStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={async () => {
                            if (!window.confirm(`Are you sure you want to delete ${s.name}? This cannot be undone.`)) return
                            try {
                              await supplierApi.remove(s.id)
                              fetchSuppliers()
                            } catch (err: any) {
                              alert(err.message || 'Cannot delete supplier')
                            }
                          }} className="text-red-600 hover:underline text-xs">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr><td colSpan={7} className="text-center p-8 text-slate-500">No suppliers found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{total} supplier{total !== 1 ? 's' : ''}</span>
            <div className="flex gap-2 items-center">
              <button
                disabled={skip === 0}
                onClick={() => setSkip(s => Math.max(0, s - take))}
                className="px-3 py-1 border rounded disabled:opacity-30"
              >Previous</button>
              <span>Page {currentPage} of {totalPages || 1}</span>
              <button
                disabled={skip + take >= total}
                onClick={() => setSkip(s => s + take)}
                className="px-3 py-1 border rounded disabled:opacity-30"
              >Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

---

### Task 8: Supplier Form Component

**Files:**
- Create: `apps/web/components/inventory/SupplierForm.tsx`

- [ ] **Step 1: Create the shared form**

```tsx
import React, { useState } from 'react'
import { supplierApi } from '../../services/supplierApi'
import { Supplier } from '../../types'

interface Props {
  initial?: Supplier | null
  onSaved: () => void
  onCancel: () => void
}

export default function SupplierForm({ initial, onSaved, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [contactPerson, setContactPerson] = useState(initial?.contactName || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [address, setAddress] = useState(initial?.address || '')
  const [panVatNumber, setPanVatNumber] = useState(initial?.panVatNumber || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Supplier name is required'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    else if (!/^[\d\s\-+()]{7,20}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        panVatNumber: panVatNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      if (initial) {
        await supplierApi.update(initial.id, payload)
      } else {
        await supplierApi.create(payload)
      }
      onSaved()
    } catch (err: any) {
      alert(err.message || 'Failed to save supplier')
    }
    setSubmitting(false)
  }

  const field = (label: string, key: string, value: string, setter: (v: string) => void, required?: boolean) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <input
        type="text"
        value={value}
        onChange={e => setter(e.target.value)}
        className={`w-full p-2 border rounded ${errors[key] ? 'border-red-500' : ''}`}
      />
      {errors[key] && <div className="text-xs text-red-600 mt-1">{errors[key]}</div>}
    </div>
  )

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">{initial ? 'Edit Supplier' : 'Add Supplier'}</h1>
      {field('Supplier Name', 'name', name, setName, true)}
      {field('Contact Person', 'contactPerson', contactPerson, setContactPerson)}
      {field('Phone Number', 'phone', phone, setPhone, true)}
      {field('Email', 'email', email, setEmail)}
      {field('Address', 'address', address, setAddress)}
      {field('PAN / VAT Number', 'panVatNumber', panVatNumber, setPanVatNumber)}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded" rows={3} />
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {submitting ? 'Saving...' : initial ? 'Update Supplier' : 'Create Supplier'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
      </div>
    </div>
  )
}
```

---

### Task 9: Supplier Detail Page

**Files:**
- Create: `apps/web/pages/inventory/SupplierDetailPage.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supplierApi } from '../../services/supplierApi'
import { Supplier, SupplierStatus, Purchase } from '../../types'
import { getToken } from '../../services/apiClient'

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  const role = (() => {
    try { return JSON.parse(atob((getToken() || '').split('.')[1])).role } catch { return '' }
  })()
  const canMutate = role === 'ADMIN' || role === 'MANAGER'

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [s, p] = await Promise.all([
        supplierApi.get(id),
        supplierApi.listPurchases(id),
      ])
      setSupplier(s)
      setPurchases(p.data)
    } catch { setSupplier(null) }
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  if (loading) return <div className="text-center py-8 text-slate-500">Loading...</div>
  if (!supplier) return <div className="text-center py-8 text-red-500">Supplier not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="#/inventory/suppliers" className="text-sm text-blue-600 hover:underline">&larr; Back to Suppliers</a>
          <h1 className="text-2xl font-semibold mt-1">{supplier.name}</h1>
        </div>
        {canMutate && (
          <a href={`#/inventory/suppliers/${supplier.id}/edit`} className="px-4 py-2 bg-amber-600 text-white rounded text-sm">Edit</a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 border rounded bg-white">
        <div>
          <label className="text-xs text-slate-500 uppercase">Status</label>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              supplier.status === SupplierStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
            }`}>{supplier.status === SupplierStatus.ACTIVE ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">Contact Person</label>
          <div className="text-sm">{supplier.contactName || '-'}</div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">Phone</label>
          <div className="text-sm">{supplier.phone || '-'}</div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">Email</label>
          <div className="text-sm">{supplier.email || '-'}</div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">Address</label>
          <div className="text-sm">{supplier.address || '-'}</div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">PAN / VAT Number</label>
          <div className="text-sm">{supplier.panVatNumber || '-'}</div>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-500 uppercase">Notes</label>
          <div className="text-sm whitespace-pre-wrap">{supplier.notes || '-'}</div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">Created</label>
          <div className="text-sm">{new Date(supplier.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase">Last Updated</label>
          <div className="text-sm">{new Date(supplier.updatedAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Purchase History</h2>
        {purchases.length === 0 ? (
          <div className="text-sm text-slate-500">No purchases recorded for this supplier.</div>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Invoice</th>
                  <th className="text-left p-3 font-medium">Items</th>
                  <th className="text-left p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                    <td className="p-3">{p.invoiceNumber || '-'}</td>
                    <td className="p-3">{p.items.length} item{p.items.length !== 1 ? 's' : ''}</td>
                    <td className="p-3 font-medium">{p.currency} {Number(p.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Task 10: Supplier Dropdown Component

**Files:**
- Create: `apps/web/components/inventory/SupplierDropdown.tsx`

- [ ] **Step 1: Create the dropdown**

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { request } from '../../services/apiClient'
import { Supplier, SupplierStatus } from '../../types'

interface Props {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  error?: string
}

export default function SupplierDropdown({ value, onChange, disabled, error }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request<{ data: Supplier[] }>('/inventory/suppliers?status=ACTIVE&take=200')
      .then(res => setSuppliers(res.data))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false))
  }, [])

  const options = useMemo(() => suppliers, [suppliers])

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || loading}
        className={`w-72 p-2 border rounded ${error ? 'border-red-500' : ''}`}
      >
        <option value="">{loading ? 'Loading suppliers...' : 'Select supplier'}</option>
        {options.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}{s.panVatNumber ? ` (${s.panVatNumber})` : ''}
          </option>
        ))}
      </select>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  )
}
```

---

### Task 11: Integrate SupplierDropdown into Purchase Create

**Files:**
- Modify: `apps/web/pages/inventory/PurchaseCreate.tsx`

- [ ] **Step 1: Replace raw `<select>` with SupplierDropdown**

At the top of the file, add import:

```tsx
import SupplierDropdown from '../../components/inventory/SupplierDropdown'
```

Remove the `suppliers` state variable from the `useState` calls (line 7: `const [suppliers, setSuppliers] = useState<any[]>([])`).

Remove the supplier fetch from the `useEffect` (line 15: `request('/inventory/suppliers').then(setSuppliers).catch(()=>{})`).

Replace the supplier select block (lines 63-70):

```tsx
<SupplierDropdown
  value={supplierId}
  onChange={setSupplierId}
  error={errors['supplier']}
/>
```

---

### Task 12: Frontend Routing Update

**Files:**
- Modify: `apps/web/App.tsx`

- [ ] **Step 1: Import new pages**

Add with existing inventory imports:

```tsx
import SupplierDetailPage from './pages/inventory/SupplierDetailPage'
// SupplierFormPage is handled inline by SuppliersPage + query param hash routing
```

- [ ] **Step 2: Add routes**

Add inside the `<Route element={<PrivateRoute><Layout><Outlet /></Layout></PrivateRoute>}>` block, after the existing Suppliers route:

```tsx
<Route path="/inventory/suppliers/:id" element={<SupplierDetailPage />} />
```

Note: Create/Edit forms will use hash-based routing. When the user clicks "Add Supplier" or "Edit", the app redirects to `#/inventory/suppliers/create` or `#/inventory/suppliers/:id/edit`. The `SuppliersPage` and a new wrapper page handle these hash routes. Add a simple wrapper at `apps/web/pages/inventory/SupplierFormPage.tsx`:

- [ ] **Step 3: Create `apps/web/pages/inventory/SupplierFormPage.tsx`**

```tsx
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SupplierForm from '../../components/inventory/SupplierForm'
import { supplierApi } from '../../services/supplierApi'
import { Supplier } from '../../types'

export default function SupplierFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [supplier, setSupplier] = React.useState<Supplier | null>(null)
  const isEdit = Boolean(id) && id !== 'create'

  React.useEffect(() => {
    if (isEdit && id) {
      supplierApi.get(id).then(setSupplier).catch(() => setSupplier(null))
    }
  }, [id, isEdit])

  return (
    <SupplierForm
      initial={supplier}
      onSaved={() => navigate('/inventory/suppliers')}
      onCancel={() => navigate('/inventory/suppliers')}
    />
  )
}
```

- [ ] **Step 4: Add SupplierFormPage route to App.tsx**

Import:

```tsx
import SupplierFormPage from './pages/inventory/SupplierFormPage'
```

Add route:

```tsx
<Route path="/inventory/suppliers/:id/edit" element={<SupplierFormPage />} />
<Route path="/inventory/suppliers/create" element={<SupplierFormPage />} />
```

---

### Task 13: Run Migration + Verify

**Files:**
- N/A — verification only

- [ ] **Step 1: Run Prisma migration**

```bash
cd apps/api
npx prisma migrate dev --name add_supplier_status_and_fields
```

Expected: Migration applied. New columns exist in the `Supplier` table.

- [ ] **Step 2: Start the backend and test endpoints**

```bash
cd apps/api
npm run dev
```

Test each endpoint manually or via curl:

```bash
# Create
curl -X POST http://localhost:4000/api/v1/inventory/suppliers \
  -H "Authorization: Bearer $(TOKEN)" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Supplier","phone":"+977-9800000000"}'

# List
curl http://localhost:4000/api/v1/inventory/suppliers?search=Test \
  -H "Authorization: Bearer $(TOKEN)"

# Toggle status
curl -X PATCH http://localhost:4000/api/v1/inventory/suppliers/:id/status \
  -H "Authorization: Bearer $(TOKEN)"

# Delete (should 409 if has purchases, 200 otherwise)
curl -X DELETE http://localhost:4000/api/v1/inventory/suppliers/:id \
  -H "Authorization: Bearer $(TOKEN)"
```

- [ ] **Step 3: Start the frontend and test UI**

```bash
cd apps/web
npm run dev
```

Verify:
- Supplier list renders with search, filter, pagination
- Creating a supplier redirects to list and shows new record
- Editing a supplier pre-populates the form
- Toggling status changes the badge color
- Detail page shows all fields and purchase history
- Purchase create dropdown shows only active suppliers
- Modals fire for deactivate/delete
- Role-based buttons hide for unauthorized users
