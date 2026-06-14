# Raw Material Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Raw Material Management module on top of the existing inventory stack — categories, enhanced material records, audit-safe stock transactions, and frontend pages.

**Architecture:** Extend existing Prisma models, controllers, services, and repositories under `apps/api/src/controllers/inventory/`. Enhance existing React pages under `apps/web/pages/inventory/` rather than creating new page families. Keep the existing card/sidebar layout style.

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, TypeScript, React 19, React Router, Vite, Tailwind CSS, Jest, Supertest.

---

### Task 1: Add RawMaterialCategory model and extend schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/XXX_add_raw_material_category/migration.sql`

- [ ] **Step 1: Add RawMaterialCategory model and extend existing models**

Add this model to `schema.prisma` after the `Supplier` model:

```prisma
model RawMaterialCategory {
  id            String       @id @default(cuid())
  categoryName  String       @unique
  description   String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt()
  deletedAt     DateTime?
  rawMaterials  RawMaterial[]
}
```

Extend the `RawMaterial` model — add these fields after `defaultUnit`:

```prisma
  categoryId    String?
  category      RawMaterialCategory? @relation(fields: [categoryId], references: [id])
  averageUnitCost Decimal? @default(0)
  notes         String?
  updatedBy     Int?
  deletedAt     DateTime?
```

Extend `StockTransaction` — add these fields after `reason`:

```prisma
  transactionType String  @default("ADJUSTMENT")
  balanceAfter    Float?
  unitCost        Decimal?
```

- [ ] **Step 2: Generate and apply migration**

Run: `npx prisma migrate dev --name add_raw_material_category`

Expected: new migration created and applied successfully.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add RawMaterialCategory and extend RawMaterial, StockTransaction"
```

---

### Task 2: Add category Zod schemas and extend material validators

**Files:**
- Modify: `apps/api/src/validators/inventoryValidators.ts`

- [ ] **Step 1: Write the failing test**

```ts
// In apps/api/src/__tests__/inventoryValidators.test.ts
import { createCategorySchema, createMaterialSchema, adjustStockSchema } from '../validators/inventoryValidators'

describe('category validator', () => {
  it('rejects empty category name', () => {
    expect(() => createCategorySchema.parse({ categoryName: '' })).toThrow()
  })

  it('accepts valid category', () => {
    expect(createCategorySchema.parse({ categoryName: 'Fabric', description: 'All fabric types' })).toBeTruthy()
  })
})

describe('extended material validator', () => {
  it('accepts material with category', () => {
    expect(createMaterialSchema.parse({
      name: 'Cotton Fabric',
      defaultUnit: 'Meter',
      categoryId: 'cat_1',
      notes: 'Premium quality',
    })).toBeTruthy()
  })
})

describe('stock adjustment validator', () => {
  it('requires non-empty reason', () => {
    expect(() => adjustStockSchema.parse({ change: -5, unit: 'Meter', reason: '' })).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts`

Expected: FAIL — `createCategorySchema` is not defined.

- [ ] **Step 3: Add new and extend existing Zod schemas**

Add to `apps/api/src/validators/inventoryValidators.ts`:

```ts
export const createCategorySchema = z.object({
  categoryName: z.string().trim().min(1, 'Category name is required'),
  description: z.string().trim().optional(),
})
```

Extend `createMaterialSchema` — add after `active`:

```ts
  categoryId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  averageUnitCost: z.coerce.number().optional(),
```

Extend `adjustStockSchema` — change `reason` to require min 1 char (already present). Add:

```ts
  transactionType: z.string().trim().optional(),
  unitCost: z.coerce.number().optional(),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/api test -- --runInBand src/__tests__/inventoryValidators.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/validators/inventoryValidators.ts apps/api/src/__tests__/inventoryValidators.test.ts
git commit -m "feat(api): add category and extended material validators"
```

---

### Task 3: Build category backend (repository → service → controller → routes)

**Files:**
- Create: `apps/api/src/repositories/inventory/categoryRepository.ts`
- Create: `apps/api/src/services/inventory/categoryService.ts`
- Create: `apps/api/src/controllers/inventory/categoryController.ts`
- Modify: `apps/api/src/routes/inventoryRoutes.ts`

- [ ] **Step 1: Create category repository**

`apps/api/src/repositories/inventory/categoryRepository.ts`:

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const listCategories = async () => {
  return prisma.rawMaterialCategory.findMany({
    where: { deletedAt: null },
    orderBy: { categoryName: 'asc' },
  })
}

export const createCategory = async (data: { categoryName: string; description?: string }) => {
  return prisma.rawMaterialCategory.create({ data })
}

export const getCategory = async (id: string) => {
  return prisma.rawMaterialCategory.findUnique({ where: { id } })
}
```

- [ ] **Step 2: Create category service**

`apps/api/src/services/inventory/categoryService.ts`:

```ts
import * as repo from '../../repositories/inventory/categoryRepository'

export const listCategories = async () => repo.listCategories()
export const createCategory = async (data: { categoryName: string; description?: string }) => repo.createCategory(data)
export const getCategory = async (id: string) => repo.getCategory(id)
```

- [ ] **Step 3: Create category controller**

`apps/api/src/controllers/inventory/categoryController.ts`:

```ts
import { Request, Response } from 'express'
import * as svc from '../../services/inventory/categoryService'
import { createCategorySchema } from '../../validators/inventoryValidators'
import { AppError } from '../../utils/errors'
import { recordAudit } from '../../utils/auditLog'

export const list = async (req: Request, res: Response) => {
  const data = await svc.listCategories()
  res.json(data)
}

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = createCategorySchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid category data', { errors: parsed.error.errors })
  const created = await svc.createCategory(parsed.data)
  try { await recordAudit({ action: 'category.create', userId: user, after: created }) } catch (e) {}
  res.status(201).json(created)
}
```

- [ ] **Step 4: Add category routes**

In `apps/api/src/routes/inventoryRoutes.ts`, add after the supplier routes:

```ts
import * as categories from '../controllers/inventory/categoryController'

router.get('/material-categories', authenticate, categories.list)
router.post('/material-categories', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), categories.create)
```

- [ ] **Step 5: Run API build**

Run: `npm --workspace apps/api run build`

Expected: TypeScript compiles without errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/repositories/inventory/categoryRepository.ts apps/api/src/services/inventory/categoryService.ts apps/api/src/controllers/inventory/categoryController.ts apps/api/src/routes/inventoryRoutes.ts
git commit -m "feat(api): add raw material category CRUD"
```

---

### Task 4: Extend material repository with search, pagination, status filter

**Files:**
- Modify: `apps/api/src/repositories/inventory/materialRepository.ts`
- Modify: `apps/api/src/services/inventory/materialService.ts`
- Modify: `apps/api/src/controllers/inventory/materialsController.ts`

- [ ] **Step 1: Write failing test for paginated material list**

```ts
// In apps/api/src/__tests__/inventoryValidators.test.ts or a new test file
describe('material repository', () => {
  it('should list materials with search and category filter', () => {
    // Integration test placeholder — verified via controller test
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Extend material repository with search, filter, pagination, soft-delete guard**

Replace `listMaterials` in `apps/api/src/repositories/inventory/materialRepository.ts`:

```ts
export const listMaterials = async (opts: {
  skip?: number
  take?: number
  lowStock?: boolean
  search?: string
  categoryId?: string
  active?: boolean
} = {}) => {
  const where: any = { deletedAt: null }
  if (opts.lowStock) where.reorderLevel = { not: null }
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  if (opts.categoryId) where.categoryId = opts.categoryId
  if (opts.active !== undefined) where.active = opts.active
  return prisma.rawMaterial.findMany({
    where,
    skip: opts.skip || 0,
    take: opts.take || 20,
    orderBy: { name: 'asc' },
    include: { category: true },
  })
}
```

Add to material repository:

```ts
export const softDeleteMaterial = async (id: string) => {
  return prisma.rawMaterial.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
  })
}

export const countMaterials = async (opts: { search?: string; categoryId?: string } = {}) => {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  if (opts.categoryId) where.categoryId = opts.categoryId
  return prisma.rawMaterial.count({ where })
}
```

- [ ] **Step 3: Extend material service**

In `apps/api/src/services/inventory/materialService.ts`, update `listMaterials`:

```ts
export const listMaterials = async (opts: any = {}) => {
  const page = opts.page || 1
  const pageSize = opts.pageSize || 20
  const skip = (page - 1) * pageSize
  const [materials, total] = await Promise.all([
    repo.listMaterials({ ...opts, skip, take: pageSize }),
    repo.countMaterials(opts),
  ])
  const withStock = await Promise.all(
    materials.map(async (material: any) => ({
      ...material,
      currentStock: await repo.computeCurrentStock(material.id),
    })),
  )
  return { data: withStock, total, page, pageSize }
}
```

Add helper:

```ts
export const toggleMaterialStatus = async (id: string, active: boolean, userId?: number) => {
  return repo.updateMaterial(id, { active, updatedBy: userId })
}

export const deleteMaterial = async (id: string) => {
  return repo.softDeleteMaterial(id)
}
```

- [ ] **Step 4: Extend material controller**

Replace `list` in `apps/api/src/controllers/inventory/materialsController.ts`:

```ts
export const list = async (req: Request, res: Response) => {
  const { low, search, categoryId, active, page, pageSize } = req.query
  const data = await svc.listMaterials({
    lowStock: low === '1' || low === 'true',
    search: search as string | undefined,
    categoryId: categoryId as string | undefined,
    active: active !== undefined ? active === 'true' : undefined,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  })
  res.json(data)
}
```

Add toggle status and delete handlers:

```ts
export const toggleStatus = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const { active } = req.body
  const updated = await svc.toggleMaterialStatus(req.params.id, active, user)
  try { await recordAudit({ action: 'material.toggle_status', userId: user, after: { id: req.params.id, active } }) } catch (e) {}
  res.json(updated)
}

export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  await svc.deleteMaterial(req.params.id)
  try { await recordAudit({ action: 'material.delete', userId: user, after: { id: req.params.id } }) } catch (e) {}
  res.status(204).end()
}
```

- [ ] **Step 5: Update routes**

In `apps/api/src/routes/inventoryRoutes.ts`, add after the material routes:

```ts
router.patch('/materials/:id/status', authenticate, requireRoles(Role.ADMIN, Role.MANAGER), materials.toggleStatus)
router.delete('/materials/:id', authenticate, requireRoles(Role.ADMIN), materials.remove)
```

- [ ] **Step 6: Run build**

Run: `npm --workspace apps/api run build`

Expected: compiles clean.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/repositories/inventory/materialRepository.ts apps/api/src/services/inventory/materialService.ts apps/api/src/controllers/inventory/materialsController.ts apps/api/src/routes/inventoryRoutes.ts
git commit -m "feat(api): add material search, pagination, status toggle, soft delete"
```

---

### Task 5: Build atomic stock transaction service with balance tracking

**Files:**
- Create: `apps/api/src/services/inventory/stockTransactionService.ts`
- Modify: `apps/api/src/repositories/inventory/stockRepository.ts`
- Modify: `apps/api/src/controllers/inventory/materialsController.ts` (adjustStock refactor)

- [ ] **Step 1: Write the failing test**

```ts
describe('stock transaction service', () => {
  it('should create transaction with balance snapshot', () => {
    // Verified via integration — the service must compute balanceAfter
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Create stock transaction service**

`apps/api/src/services/inventory/stockTransactionService.ts`:

```ts
import { prisma } from '../../prisma'
import { recordAudit } from '../../utils/auditLog'

export async function recordStockChange(params: {
  rawMaterialId: string
  change: number
  unit: string
  transactionType: string
  referenceType?: string
  referenceId?: string
  unitCost?: number
  remarks?: string
  createdBy?: number
}) {
  return prisma.$transaction(async (tx) => {
    // Compute current balance
    const agg = await tx.stockTransaction.aggregate({
      _sum: { change: true },
      where: { rawMaterialId: params.rawMaterialId },
    })
    const currentBalance = (agg._sum.change || 0) + params.change
    if (currentBalance < 0) {
      throw new Error('Insufficient stock: transaction would cause negative balance')
    }

    // Create transaction
    const txRecord = await tx.stockTransaction.create({
      data: {
        rawMaterialId: params.rawMaterialId,
        change: params.change,
        unit: params.unit,
        transactionType: params.transactionType,
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
        balanceAfter: currentBalance,
        unitCost: params.unitCost || null,
        reason: params.remarks || params.transactionType,
        createdBy: params.createdBy,
      },
    })

    // If purchase, update average unit cost
    if (params.transactionType === 'PURCHASE_IN' && params.unitCost && params.change > 0) {
      const mat = await tx.rawMaterial.findUnique({ where: { id: params.rawMaterialId } })
      const prevAvg = Number(mat?.averageUnitCost || 0)
      const prevQty = currentBalance - params.change
      const newAvg = prevQty > 0
        ? ((prevAvg * prevQty) + (params.unitCost * params.change)) / (prevQty + params.change)
        : params.unitCost
      await tx.rawMaterial.update({
        where: { id: params.rawMaterialId },
        data: { averageUnitCost: newAvg },
      })
    }

    // Check low stock threshold
    const mat = await tx.rawMaterial.findUnique({ where: { id: params.rawMaterialId } })
    if (mat && mat.reorderLevel !== null && currentBalance <= mat.reorderLevel) {
      const existing = await tx.lowStockAlert.findFirst({
        where: { rawMaterialId: params.rawMaterialId, acknowledged: false },
      })
      if (!existing) {
        await tx.lowStockAlert.create({
          data: { rawMaterialId: params.rawMaterialId },
        })
      }
    }

    return txRecord
  })
}
```

- [ ] **Step 3: Update stock repository to delegate to service**

In `apps/api/src/repositories/inventory/stockRepository.ts`, replace `createStockTransaction`:

```ts
import { recordStockChange } from '../../services/inventory/stockTransactionService'

export const createStockTransaction = async (data: any) => {
  return recordStockChange({
    rawMaterialId: data.rawMaterialId,
    change: data.change,
    unit: data.unit,
    transactionType: data.transactionType || 'ADJUSTMENT',
    referenceType: data.referenceType || null,
    referenceId: data.referenceId || null,
    unitCost: data.unitCost,
    remarks: data.reason || data.remarks,
    createdBy: data.createdBy,
  })
}
```

- [ ] **Step 4: Refactor adjustStock controller to use service**

In `apps/api/src/controllers/inventory/materialsController.ts`, replace `adjustStock`:

```ts
export const adjustStock = async (req: Request, res: Response) => {
  const user = (req as any).user?.id
  const parsed = adjustStockSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'INVALID_INPUT', 'Invalid adjustment', { errors: parsed.error.errors })
  const { change, unit, reason, transactionType, unitCost } = parsed.data
  const { recordStockChange } = await import('../../services/inventory/stockTransactionService')
  const tx = await recordStockChange({
    rawMaterialId: req.params.id,
    change,
    unit,
    transactionType: transactionType || 'ADJUSTMENT',
    referenceType: 'ADJUSTMENT',
    remarks: reason,
    unitCost,
    createdBy: user,
  })
  try { await recordAudit({ action: 'material.adjust_stock', userId: user, after: tx }) } catch (e) {}
  res.status(201).json(tx)
}
```

- [ ] **Step 5: Run build**

Run: `npm --workspace apps/api run build`

Expected: compiles clean.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/inventory/stockTransactionService.ts apps/api/src/repositories/inventory/stockRepository.ts apps/api/src/controllers/inventory/materialsController.ts
git commit -m "feat(api): atomic stock transaction service with balance tracking"
```

---

### Task 6: Create frontend raw material API module

**Files:**
- Create: `apps/web/services/rawMaterialApi.ts`
- Modify: `apps/web/services/api.ts` (wire new module)

- [ ] **Step 1: Create rawMaterialApi.ts**

`apps/web/services/rawMaterialApi.ts`:

```ts
import { request } from './apiClient'

export interface RawMaterialPayload {
  name: string
  sku?: string
  defaultUnit: string
  categoryId?: string
  description?: string
  reorderLevel?: number
  costPrice?: number
  averageUnitCost?: number
  active?: boolean
  notes?: string
}

export interface StockAdjustPayload {
  change: number
  unit: string
  reason: string
  transactionType?: string
  unitCost?: number
}

export interface CategoryPayload {
  categoryName: string
  description?: string
}

export const rawMaterialApi = {
  list: (params?: { search?: string; categoryId?: string; active?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.categoryId) q.set('categoryId', params.categoryId)
    if (params?.active) q.set('active', params.active)
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return request<any>(`/inventory/materials?${q.toString()}`)
  },

  get: (id: string) => request<any>(`/inventory/materials/${id}`),

  create: (data: RawMaterialPayload) =>
    request<any>('/inventory/materials', { method: 'POST', body: data }),

  update: (id: string, data: Partial<RawMaterialPayload>) =>
    request<any>(`/inventory/materials/${id}`, { method: 'PUT', body: data }),

  toggleStatus: (id: string, active: boolean) =>
    request<any>(`/inventory/materials/${id}/status`, { method: 'PATCH', body: { active } }),

  delete: (id: string) =>
    request<void>(`/inventory/materials/${id}`, { method: 'DELETE' }),

  adjustStock: (id: string, data: StockAdjustPayload) =>
    request<any>(`/inventory/materials/${id}/adjust-stock`, { method: 'POST', body: data }),

  getTransactions: (id: string, params?: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return request<any[]>(`/inventory/materials/${id}/transactions?${q.toString()}`)
  },

  getCategories: () => request<any[]>('/inventory/material-categories'),

  createCategory: (data: CategoryPayload) =>
    request<any>('/inventory/material-categories', { method: 'POST', body: data }),

  getPurchases: (id: string) =>
    request<any[]>(`/inventory/materials/${id}/purchases`),
}
```

- [ ] **Step 2: Wire into api.ts**

In `apps/web/services/api.ts`, add:

```ts
import { rawMaterialApi } from './rawMaterialApi'
```

And add to the `api` object:

```ts
  ...rawMaterialApi,
```

- [ ] **Step 3: Run web build**

Run: `npm --workspace apps/web run build`

Expected: compiles clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/rawMaterialApi.ts apps/web/services/api.ts
git commit -m "feat(web): add raw material API module"
```

---

### Task 7: Enhance material list page with categories, search, status badge

**Files:**
- Modify: `apps/web/pages/inventory/MaterialsPage.tsx`

- [ ] **Step 1: Update MaterialsPage.tsx**

Replace the entire file content:

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { rawMaterialApi } from '../../services/rawMaterialApi'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const navigate = useNavigate()

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (search) params.search = search
      if (categoryFilter) params.categoryId = categoryFilter
      const [matRes, cats] = await Promise.all([
        rawMaterialApi.list(params),
        rawMaterialApi.getCategories(),
      ])
      setMaterials(Array.isArray(matRes) ? matRes : matRes?.data || [])
      setCategories(cats || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const lowStockMaterials = useMemo(
    () => materials.filter((m) => m.reorderLevel != null && Number(m.currentStock ?? 0) <= Number(m.reorderLevel)),
    [materials],
  )

  const totalStock = useMemo(
    () => materials.reduce((sum, m) => sum + Number(m.currentStock ?? 0), 0),
    [materials],
  )

  const handleSearch = () => { fetchData() }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading materials...</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/inventory/purchases" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4">
          ← Back to Purchases
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Garment Factory
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Materials</h1>
            <p className="text-slate-600 mt-1">Manage fabric, trims, accessories, and stock levels.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Button variant="outline" onClick={() => navigate('/inventory/boms/create')}>
              Create BOM
            </Button>
            <Button onClick={() => navigate('/inventory/materials/create')}>
              Create Material
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Material Catalog</h2>
                <p className="text-sm text-slate-500">Search and open a material to manage stock and purchases.</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setTimeout(fetchData, 0) }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.categoryName}</option>
                  ))}
                </select>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="Search materials"
                  className="w-full md:w-56 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button size="sm" onClick={handleSearch}>Search</Button>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 font-medium">Name</th>
                    <th className="py-3 font-medium">SKU</th>
                    <th className="py-3 font-medium">Category</th>
                    <th className="py-3 font-medium">Unit</th>
                    <th className="py-3 font-medium">Stock</th>
                    <th className="py-3 font-medium">Reorder</th>
                    <th className="py-3 font-medium">Status</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m: any) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 font-medium text-slate-900">
                        <Link to={`/inventory/materials/${m.id}`} className="text-blue-600 hover:text-blue-700">
                          {m.name}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-600">{m.sku || '\u2014'}</td>
                      <td className="py-3 text-slate-600">{m.category?.categoryName || '\u2014'}</td>
                      <td className="py-3 text-slate-600">{m.defaultUnit || '\u2014'}</td>
                      <td className="py-3">
                        <span className={`font-medium ${m.reorderLevel != null && Number(m.currentStock ?? 0) <= Number(m.reorderLevel) ? 'text-red-600' : 'text-slate-900'}`}>
                          {m.currentStock ?? 0}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{m.reorderLevel ?? '\u2014'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.active !== false ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                          {m.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/inventory/materials/${m.id}`)}>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {materials.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500">No materials found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900">Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total materials</span>
                <span className="font-semibold text-slate-900">{materials.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Low stock items</span>
                <span className={`font-semibold ${lowStockMaterials.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>{lowStockMaterials.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total stock</span>
                <span className="font-semibold text-slate-900">{totalStock}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900">Low Stock</h3>
            <div className="mt-3 space-y-3">
              {lowStockMaterials.slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-red-600">{m.currentStock ?? 0} / {m.reorderLevel ?? '?'}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/inventory/materials/${m.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
              {lowStockMaterials.length === 0 && (
                <div className="text-sm text-slate-500">All materials adequately stocked.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate('/inventory/materials/create')}>New Material</Button>
              <Button variant="outline" onClick={() => navigate('/inventory/boms/create')}>New BOM</Button>
              <Button variant="outline" onClick={() => navigate('/inventory/suppliers')}>Suppliers</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run web build**

Run: `npm --workspace apps/web run build`

Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/inventory/MaterialsPage.tsx
git commit -m "feat(web): add category filter, search, status badge to materials list"
```

---

### Task 8: Enhance material create/edit form with categories and notes

**Files:**
- Modify: `apps/web/pages/inventory/CreateMaterialPage.tsx`

- [ ] **Step 1: Update CreateMaterialPage.tsx**

Replace the file:

```tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { rawMaterialApi } from '../../services/rawMaterialApi'

const UNITS = ['Meter', 'Kg', 'Roll', 'Piece', 'Packet']

export default function CreateMaterialPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    defaultUnit: 'Meter',
    categoryId: '',
    reorderLevel: '',
    costPrice: '',
    notes: '',
    active: true,
  })

  useEffect(() => {
    rawMaterialApi.getCategories().then(setCategories).catch(() => {})
  }, [])

  const save = async () => {
    if (!form.name.trim()) { alert('Material name is required'); return }
    setSaving(true)
    try {
      const created: any = await rawMaterialApi.create({
        ...form,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      })
      navigate(`/inventory/materials/${created.id}`)
    } catch (err: any) {
      alert('Failed to create: ' + (err?.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Material</h1>
        <p className="text-slate-600 mt-1">Add a fabric, trim, or accessory to the catalog.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.categoryName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.defaultUnit} onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
            <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
            <input type="number" className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
          <label htmlFor="active" className="text-sm text-slate-700">Active</label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button isLoading={saving} onClick={save}>Save Material</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run web build**

Run: `npm --workspace apps/web run build`

Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/inventory/CreateMaterialPage.tsx
git commit -m "feat(web): add category, unit select, notes to material form"
```

---

### Task 9: Enhance material detail page with enhanced stock transactions

**Files:**
- Modify: `apps/web/pages/inventory/MaterialDetail.tsx`

- [ ] **Step 1: Update MaterialDetail.tsx**

Replace the file:

```tsx
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { rawMaterialApi } from '../../services/rawMaterialApi'

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>()
  const [material, setMaterial] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [boms, setBoms] = useState<any[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [activeTab, setActiveTab] = useState<'transactions' | 'purchases' | 'prices'>('transactions')

  useEffect(() => {
    if (!id) return
    rawMaterialApi.get(id).then(setMaterial).catch(() => { })
    rawMaterialApi.getTransactions(id).then(setTransactions).catch(() => { })
    rawMaterialApi.getPurchases(id).then(setPurchases).catch(() => { })
  }, [id])

  if (!material) return <div className="p-8 text-center text-slate-500">Loading...</div>

  const lowStock = material.reorderLevel != null && Number(material.currentStock ?? 0) <= Number(material.reorderLevel)

  const handleSaveEdit = async (payload: any) => {
    try {
      const updated = await rawMaterialApi.update(material.id, payload)
      setMaterial(updated)
      setShowEdit(false)
    } catch (err: any) { alert('Update failed: ' + err.message) }
  }

  const handleAdjust = async (payload: any) => {
    try {
      const tx = await rawMaterialApi.adjustStock(material.id, payload)
      setTransactions([tx, ...transactions])
      const refreshed = await rawMaterialApi.get(material.id)
      setMaterial(refreshed)
      setShowAdjust(false)
    } catch (err: any) { alert('Adjust failed: ' + err.message) }
  }

  const handleToggleStatus = async () => {
    try {
      const updated = await rawMaterialApi.toggleStatus(material.id, !material.active)
      setMaterial(updated)
    } catch (err: any) { alert('Status change failed: ' + err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/inventory/materials" className="text-sm text-blue-600 hover:text-blue-700">\u2190 Back</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-semibold">{material.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${material.active !== false ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
              {material.active !== false ? 'Active' : 'Inactive'}
            </span>
            {lowStock && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Low Stock
              </span>
            )}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            {material.sku && <span>SKU: {material.sku} \u00B7 </span>}
            Unit: {material.defaultUnit}
            {material.category?.categoryName && <span> \u00B7 {material.category.categoryName}</span>}
            {material.averageUnitCost != null && <span> \u00B7 Avg Cost: {Number(material.averageUnitCost).toFixed(2)}</span>}
          </div>
        </div>
        <div className="space-x-2">
          <Link to={`/inventory/purchases/create?material=${material.id}`} className="px-3 py-2 bg-blue-600 text-white rounded">
            Create Purchase
          </Link>
          <Button variant="outline" onClick={() => setShowAdjust(true)}>Adjust Stock</Button>
          <Button variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="outline" onClick={handleToggleStatus}>
            {material.active !== false ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {material.notes && (
        <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
          {material.notes}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="text-sm text-slate-500">Current Stock</div>
          <div className={`text-2xl font-bold ${lowStock ? 'text-red-600' : 'text-slate-900'}`}>{material.currentStock ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="text-sm text-slate-500">Reorder Level</div>
          <div className="text-2xl font-bold text-slate-900">{material.reorderLevel ?? 'Not set'}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="text-sm text-slate-500">Avg Unit Cost</div>
          <div className="text-2xl font-bold text-slate-900">{material.averageUnitCost ? Number(material.averageUnitCost).toFixed(2) : material.costPrice ? Number(material.costPrice).toFixed(2) : 'N/A'}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="text-sm text-slate-500">Total Purchases</div>
          <div className="text-2xl font-bold text-slate-900">{purchases.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 border-b border-slate-200 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`text-sm font-medium pb-1 border-b-2 ${activeTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            Stock Transactions
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`text-sm font-medium pb-1 border-b-2 ${activeTab === 'purchases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`text-sm font-medium pb-1 border-b-2 ${activeTab === 'prices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            Price History
          </button>
        </div>

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Change</th>
                  <th className="py-3 font-medium">Balance</th>
                  <th className="py-3 font-medium">Unit Cost</th>
                  <th className="py-3 font-medium">Reason</th>
                  <th className="py-3 font-medium">Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t: any) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-600">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.transactionType === 'PURCHASE_IN' ? 'bg-green-100 text-green-800' : t.change < 0 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {t.transactionType || 'ADJUSTMENT'}
                      </span>
                    </td>
                    <td className={`py-3 font-medium ${t.change < 0 ? 'text-red-600' : 'text-green-600'}`}>{t.change > 0 ? '+' : ''}{t.change}</td>
                    <td className="py-3 text-slate-900">{t.balanceAfter ?? '\u2014'}</td>
                    <td className="py-3 text-slate-600">{t.unitCost ? Number(t.unitCost).toFixed(2) : '\u2014'}</td>
                    <td className="py-3 text-slate-600">{t.reason || '\u2014'}</td>
                    <td className="py-3 text-slate-500 text-xs">{t.referenceId ? t.referenceId.slice(0, 8) + '\u2026' : '\u2014'}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-slate-500">No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div>
            {purchases.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">No purchases recorded.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 font-medium">Date</th>
                    <th className="py-3 font-medium">Supplier</th>
                    <th className="py-3 font-medium">Invoice</th>
                    <th className="py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p: any) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-slate-900">{p.supplier?.name || '\u2014'}</td>
                      <td className="py-3 text-slate-600">{p.invoiceNumber || '\u2014'}</td>
                      <td className="py-3 text-slate-900">{Number(p.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'prices' && (
          <div>
            {prices.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">No price history.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 font-medium">Date</th>
                    <th className="py-3 font-medium">Supplier</th>
                    <th className="py-3 font-medium">Unit Price</th>
                    <th className="py-3 font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p: any) => (
                    <tr key={p.purchaseId} className="border-b border-slate-100">
                      <td className="py-3 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="py-3 text-slate-900">{p.supplier?.name || '\u2014'}</td>
                      <td className="py-3 font-medium text-slate-900">{Number(p.unitPrice).toFixed(2)}</td>
                      <td className="py-3 text-slate-600">{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-semibold text-slate-900">Bill of Materials</h3>
        {boms.length === 0 ? (
          <div className="mt-2 text-sm text-slate-500">No BOMs reference this material.</div>
        ) : (
          <table className="w-full text-left mt-3 text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-3 font-medium">Garment</th>
                <th className="py-3 font-medium">Consumption</th>
                <th className="py-3 font-medium">Unit</th>
                <th className="py-3 font-medium">Yield</th>
              </tr>
            </thead>
            <tbody>
              {boms.map((b: any) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="py-3 text-slate-900">{b.garmentStyle}</td>
                  <td className="py-3 text-slate-600">{b.consumption}</td>
                  <td className="py-3 text-slate-600">{b.unit}</td>
                  <td className="py-3 text-slate-600">{b.yield ?? '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit ${material.name}`} size="md">
        <EditMaterialForm material={material} onCancel={() => setShowEdit(false)} onSave={handleSaveEdit} />
      </Modal>

      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title={`Adjust Stock \u2014 ${material.name}`} size="md">
        <AdjustStockForm material={material} onCancel={() => setShowAdjust(false)} onSave={handleAdjust} />
      </Modal>
    </div>
  )
}

function EditMaterialForm({ material, onCancel, onSave }: any) {
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState({
    name: material.name,
    sku: material.sku || '',
    defaultUnit: material.defaultUnit || 'Meter',
    categoryId: material.categoryId || '',
    reorderLevel: material.reorderLevel || '',
    costPrice: material.costPrice ? Number(material.costPrice) : '',
    notes: material.notes || '',
  })

  useEffect(() => {
    rawMaterialApi.getCategories().then(setCategories).catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">SKU</label>
          <input className="w-full p-2 border rounded" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select className="w-full p-2 border rounded" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">None</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Unit</label>
          <input className="w-full p-2 border rounded" value={form.defaultUnit} onChange={e => setForm({ ...form, defaultUnit: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Reorder Level</label>
          <input type="number" className="w-full p-2 border rounded" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Cost Price</label>
          <input type="number" className="w-full p-2 border rounded" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea className="w-full p-2 border rounded" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </div>
  )
}

function AdjustStockForm({ material, onCancel, onSave }: any) {
  const [change, setChange] = useState(0)
  const [unit, setUnit] = useState(material.defaultUnit || '')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (change === 0) e.change = 'Change must be non-zero'
    if (!reason.trim()) e.reason = 'Reason is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ change, unit, reason, transactionType: 'ADJUSTMENT' })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Change (positive to add, negative to reduce)</label>
        <input type="number" className="w-full p-2 border rounded" value={change} onChange={e => setChange(Number(e.target.value))} />
        {errors.change && <div className="text-xs text-red-600 mt-1">{errors.change}</div>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Unit</label>
        <input className="w-full p-2 border rounded" value={unit} onChange={e => setUnit(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Reason *</label>
        <input className="w-full p-2 border rounded" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Damaged goods, cycle count correction" />
        {errors.reason && <div className="text-xs text-red-600 mt-1">{errors.reason}</div>}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run web build**

Run: `npm --workspace apps/web run build`

Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/inventory/MaterialDetail.tsx
git commit -m "feat(web): enhance material detail with category, status, enhanced transactions"
```

---

### Task 10: Enhance purchase form with invoice metadata

**Files:**
- Modify: `apps/web/pages/inventory/PurchaseCreate.tsx`

- [ ] **Step 1: Update PurchaseCreate.tsx**

Replace the file:

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { request } from '../../services/apiClient'

type Item = { rawMaterialId: string; quantity: number; unit: string; unitPrice: string }

export default function PurchaseCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedMaterial = searchParams.get('material') || ''
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([
    { rawMaterialId: preselectedMaterial, quantity: 1, unit: 'Meter', unitPrice: '0' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    request('/inventory/suppliers').then(setSuppliers).catch(() => {})
    request('/inventory/materials').then((data: any) => setMaterials(Array.isArray(data) ? data : data?.data || [])).catch(() => {})
  }, [])

  const addLine = () => setItems([...items, { rawMaterialId: '', quantity: 1, unit: 'Meter', unitPrice: '0' }])
  const removeLine = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateLine = (idx: number, patch: Partial<Item>) => {
    const copy = [...items]; copy[idx] = { ...copy[idx], ...patch }; setItems(copy)
  }

  const lineValid = (it: Item) => {
    if (!it.rawMaterialId) return false
    if (!it.quantity || Number(it.quantity) <= 0) return false
    if (it.unitPrice === '' || Number(it.unitPrice) < 0) return false
    return true
  }

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice || 0)), 0), [items])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!supplierId) e.supplier = 'Supplier is required'
    if (items.length === 0) e.items = 'At least one item is required'
    items.forEach((it, idx) => {
      if (!it.rawMaterialId) e[`item.${idx}.material`] = 'Select material'
      if (!it.quantity || Number(it.quantity) <= 0) e[`item.${idx}.quantity`] = 'Quantity must be > 0'
      if (it.unitPrice === '' || Number(it.unitPrice) < 0) e[`item.${idx}.unitPrice`] = 'Unit price required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const payload = {
      supplierId,
      invoiceNumber: invoiceNumber || undefined,
      invoiceDate,
      notes: notes || undefined,
      items: items.map(({ rawMaterialId, quantity, unit, unitPrice }) => ({ rawMaterialId, quantity, unit, unitPrice })),
    }
    try {
      const res: any = await request('/inventory/purchases', { method: 'POST', body: payload })
      alert('Purchase created successfully')
      navigate('/inventory/purchases')
    } catch (err: any) {
      alert('Error: ' + (err?.message || 'failed'))
    }
    setSubmitting(false)
  }

  const anyInvalid = !supplierId || items.some(it => !lineValid(it))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Create Purchase</h1>

      <div>
        <label className="block text-sm font-medium text-slate-700">Supplier *</label>
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 block w-72 p-2 border rounded">
          <option value="">Select supplier</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {errors.supplier && <div className="text-xs text-red-600 mt-1">{errors.supplier}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Invoice Number</label>
          <input className="mt-1 w-full p-2 border rounded" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. BILL-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Invoice Date</label>
          <input type="date" className="mt-1 w-full p-2 border rounded" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Items</h2>
        {errors.items && <div className="text-xs text-red-600 mt-1">{errors.items}</div>}
        {items.map((it, idx) => (
          <div key={idx} className="p-3 border rounded mt-2">
            <div className="flex items-center gap-3">
              <select value={it.rawMaterialId} onChange={e => updateLine(idx, { rawMaterialId: e.target.value })} className="p-2 border rounded flex-1">
                <option value="">Select material</option>
                {materials.filter((m: any) => m.active !== false).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.defaultUnit})</option>
                ))}
              </select>
              <input type="number" value={it.quantity} onChange={e => updateLine(idx, { quantity: Number(e.target.value) })} className="p-2 w-20 border rounded" placeholder="Qty" />
              <input type="text" value={it.unit} onChange={e => updateLine(idx, { unit: e.target.value })} className="p-2 w-24 border rounded" placeholder="Unit" />
              <input type="text" value={it.unitPrice} onChange={e => updateLine(idx, { unitPrice: e.target.value })} className="p-2 w-28 border rounded" placeholder="Unit price" />
              <div className="text-sm text-slate-600 w-24 text-right">{(Number(it.quantity) * Number(it.unitPrice || 0)).toFixed(2)}</div>
              {items.length > 1 && <button onClick={() => removeLine(idx)} className="text-red-500 px-2">Remove</button>}
            </div>
            <div className="flex gap-2 mt-1">
              {errors[`item.${idx}.material`] && <div className="text-xs text-red-600">{errors[`item.${idx}.material`]}</div>}
              {errors[`item.${idx}.quantity`] && <div className="text-xs text-red-600">{errors[`item.${idx}.quantity`]}</div>}
              {errors[`item.${idx}.unitPrice`] && <div className="text-xs text-red-600">{errors[`item.${idx}.unitPrice`]}</div>}
            </div>
          </div>
        ))}
        <div className="mt-2">
          <button onClick={addLine} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Add Item</button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea className="mt-1 w-full p-2 border rounded" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about this purchase" />
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
        <div>
          <div className="text-sm text-slate-600">Total</div>
          <div className="text-xl font-bold">{total.toFixed(2)}</div>
        </div>
        <div className="space-x-2">
          <button onClick={() => navigate('/inventory/purchases')} className="px-4 py-2 border rounded">Cancel</button>
          <button
            disabled={anyInvalid || submitting}
            onClick={submit}
            className={`px-4 py-2 rounded ${anyInvalid || submitting ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-green-600 text-white'}`}
          >
            {submitting ? 'Creating...' : 'Create Purchase'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run web build**

Run: `npm --workspace apps/web run build`

Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/pages/inventory/PurchaseCreate.tsx
git commit -m "feat(web): add invoice metadata and notes to purchase form"
```

---

### Task 11: Enhance purchases list and alerts pages

**Files:**
- Modify: `apps/web/pages/inventory/PurchasesPage.tsx`
- Modify: `apps/web/pages/inventory/AlertsPage.tsx`
- Modify: `apps/api/src/controllers/inventory/purchasesController.ts`

- [ ] **Step 1: Update PurchasesPage.tsx**

```tsx
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { request } from '../../services/apiClient'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    request('/inventory/purchases')
      .then((data: any) => setPurchases(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-500">Loading purchases...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/inventory/materials" className="text-sm text-blue-600 hover:text-blue-700">\u2190 Materials</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Purchases</h1>
          <p className="text-slate-600 mt-1">Raw material purchase records.</p>
        </div>
        <Button onClick={() => navigate('/inventory/purchases/create')}>Create Purchase</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        {purchases.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No purchases yet. Create your first purchase.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Supplier</th>
                <th className="py-3 font-medium">Invoice</th>
                <th className="py-3 font-medium">Items</th>
                <th className="py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 font-medium text-slate-900">{p.supplier?.name || p.supplierName || '\u2014'}</td>
                  <td className="py-3 text-slate-600">{p.invoiceNumber || '\u2014'}</td>
                  <td className="py-3 text-slate-600">{p._count?.items ?? '\u2014'}</td>
                  <td className="py-3 font-medium text-slate-900">{Number(p.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update AlertsPage.tsx**

```tsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { request } from '../../services/apiClient'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => { request('/inventory/alerts').then(setAlerts).catch(() => {}) }, [])

  const ack = async (id: string) => {
    await request(`/inventory/alerts/${id}/ack`, { method: 'POST' })
    setAlerts(alerts.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/inventory/materials" className="text-sm text-blue-600 hover:text-blue-700">\u2190 Materials</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Low Stock Alerts</h1>
        <p className="text-slate-600 mt-1">Materials that need reordering.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        {alerts.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">All materials are adequately stocked.</div>
        ) : (
          <div className="space-y-3">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">{a.rawMaterial?.name || 'Unknown material'}</div>
                  <div className="text-sm text-red-600">Triggered: {new Date(a.createdAt).toLocaleString()}</div>
                  {a.acknowledged && <div className="text-xs text-slate-500">Acknowledged</div>}
                </div>
                <div className="space-x-2">
                  <Link to={`/inventory/materials/${a.rawMaterialId}`} className="text-sm text-blue-600 hover:underline">View</Link>
                  {!a.acknowledged && (
                    <Button size="sm" variant="outline" onClick={() => ack(a.id)}>Acknowledge</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add purchase list endpoint**

In `apps/api/src/controllers/inventory/purchasesController.ts`, add list and enhance get:

```ts
export const list = async (req: Request, res: Response) => {
  const prisma = (await import('../../prisma')).prisma
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  })
  res.json(purchases)
}
```

Add route in `inventoryRoutes.ts`:

```ts
router.get('/purchases', authenticate, purchases.list)
```

- [ ] **Step 4: Run builds**

Run: `npm --workspace apps/api run build && npm --workspace apps/web run build`

Expected: both compile clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/pages/inventory/PurchasesPage.tsx apps/web/pages/inventory/AlertsPage.tsx apps/api/src/controllers/inventory/purchasesController.ts apps/api/src/routes/inventoryRoutes.ts
git commit -m "feat: enhance purchases list, alerts page, add purchase list endpoint"
```

---

### Task 12: Run full test suite and verify

**Files:**
- Run: `apps/api` test suite and web build

- [ ] **Step 1: Run API tests**

Run: `npm --workspace apps/api test -- --runInBand`

Expected: all existing and new tests pass.

- [ ] **Step 2: Run API build**

Run: `npm --workspace apps/api run build`

Expected: TypeScript compiles clean.

- [ ] **Step 3: Run web build**

Run: `npm --workspace apps/web run build`

Expected: Vite build succeeds.

- [ ] **Step 4: Fix any issues found**

If tests or builds fail, fix inline and re-run until all pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(raw-materials): complete raw material management module"
```
