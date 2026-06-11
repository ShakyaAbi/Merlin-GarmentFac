import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { request } from '../../services/apiClient'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'

type MaterialOption = {
  id: string
  name: string
  sku?: string | null
  currentStock?: number | null
  reorderLevel?: number | null
}

type SupplierOption = {
  id: string
  name: string
}

type PurchaseLedgerRow = {
  id: string
  supplierId: string
  supplierName?: string | null
  supplier?: { id: string; name: string } | null
  invoiceNumber?: string | null
  invoiceDate?: string | null
  currency?: string | null
  totalAmount?: number | string | null
  createdAt: string
  status?: string | null
  notes?: string | null
  primaryMaterialId: string
  primaryMaterialName: string
  materialIds: string[]
  materialNames: string[]
  matchCount: number
}

const money = (value: number | string | null | undefined, currency = 'USD') => {
  const amount = Number(value ?? 0)
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return amount.toFixed(2)
  }
}

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : '-')

const addUnique = (items: string[], value: string) => (items.includes(value) ? items : [...items, value])

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'POSTED':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200'
  }
}

export default function PurchasesPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [purchases, setPurchases] = useState<PurchaseLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [materialFilter, setMaterialFilter] = useState('ALL')

  const loadDashboard = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)

    setError(null)
    try {
      const [materialData, supplierData] = await Promise.all([
        request('/inventory/materials'),
        request('/inventory/suppliers'),
      ])

      const materialRows: MaterialOption[] = Array.isArray(materialData)
        ? materialData
        : Array.isArray((materialData as any)?.data)
          ? (materialData as any).data
          : []
      const supplierRows: SupplierOption[] = Array.isArray(supplierData)
        ? supplierData
        : Array.isArray((supplierData as any)?.data)
          ? (supplierData as any).data
          : []

      setMaterials(materialRows)
      setSuppliers(supplierRows)

      const historySources = materialRows.filter((material) => material.id).slice(0, 15)
      const purchaseBuckets = await Promise.all(
        historySources.map(async (material) => {
          try {
            const rows = await request<any[]>(`/inventory/materials/${material.id}/purchases?page=1&pageSize=8`)
            return {
              material,
              rows: Array.isArray(rows) ? rows : [],
            }
          } catch {
            return {
              material,
              rows: [],
            }
          }
        }),
      )

      const ledger = new Map<string, PurchaseLedgerRow>()
      for (const bucket of purchaseBuckets) {
        for (const row of bucket.rows) {
          const existing = ledger.get(row.id)
          const supplierName = row.supplier?.name || row.supplierName || null
          const baseMaterialName = bucket.material.name
          if (existing) {
            existing.materialIds = addUnique(existing.materialIds, bucket.material.id)
            existing.materialNames = addUnique(existing.materialNames, baseMaterialName)
            existing.matchCount += 1
            continue
          }

          ledger.set(row.id, {
            id: row.id,
            supplierId: row.supplierId,
            supplierName,
            supplier: row.supplier || (supplierName ? { id: row.supplierId, name: supplierName } : null),
            invoiceNumber: row.invoiceNumber || null,
            invoiceDate: row.invoiceDate || null,
            currency: row.currency || 'USD',
            totalAmount: row.totalAmount ?? 0,
            createdAt: row.createdAt,
            status: row.status || null,
            notes: row.notes || null,
            primaryMaterialId: bucket.material.id,
            primaryMaterialName: baseMaterialName,
            materialIds: [bucket.material.id],
            materialNames: [baseMaterialName],
            matchCount: 1,
          })
        }
      }

      const sortedPurchases = Array.from(ledger.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setPurchases(sortedPurchases)
    } catch (err: any) {
      setError(err?.message || 'Failed to load the purchase register.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadDashboard('initial')
  }, [])

  const purchaseMaterials = useMemo(() => materials.filter((material) => material.id), [materials])
  const lowStockMaterials = useMemo(
    () => materials.filter((material) => material.reorderLevel != null && Number(material.currentStock ?? 0) <= Number(material.reorderLevel)),
    [materials],
  )

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase()
    return purchases.filter((purchase) => {
      const matchesMaterial = materialFilter === 'ALL' ? true : purchase.materialIds.includes(materialFilter)
      const haystack = [
        purchase.invoiceNumber,
        purchase.supplierName,
        purchase.supplier?.name,
        purchase.notes,
        purchase.materialNames.join(' '),
        purchase.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesMaterial && (query ? haystack.includes(query) : true)
    })
  }, [materialFilter, purchases, search])

  const stats = useMemo(() => {
    const registerValue = filteredPurchases.length
    const procurementTotal = filteredPurchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount ?? 0), 0)
    const materialCoverage = purchaseMaterials.filter((material) => purchases.some((purchase) => purchase.materialIds.includes(material.id))).length

    return [
      { label: 'Register rows', value: registerValue },
      { label: 'Suppliers', value: suppliers.length, tone: 'success' as const },
      { label: 'Materials with history', value: materialCoverage },
      { label: 'Low stock materials', value: lowStockMaterials.length, tone: 'warning' as const },
      { label: 'Procurement total', value: money(procurementTotal) },
    ]
  }, [filteredPurchases, lowStockMaterials.length, purchaseMaterials, purchases, suppliers.length])

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Purchases"
      description="Document register and procurement dashboard for raw-material purchases."
      actions={[
        { label: 'Create Purchase', to: '/inventory/purchases/create' },
        { label: 'Materials', variant: 'outline', to: '/inventory/materials' },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <InventorySectionCard
          title="Purchase Register"
          description="Search by purchase number, supplier, notes, or material name."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => loadDashboard('refresh')} isLoading={refreshing}>
                Refresh
              </Button>
            </div>
          }
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search purchase register"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lg:max-w-md"
            />
            <select
              value={materialFilter}
              onChange={(event) => setMaterialFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lg:max-w-xs"
            >
              <option value="ALL">All materials</option>
              {purchaseMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500" role="status" aria-live="polite">
              Loading purchase register...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
              {search.trim() || materialFilter !== 'ALL'
                ? 'No purchases match the current filters.'
                : 'No purchase documents yet. Start with a new purchase.'}
            </div>
          ) : (
            <InventoryDataTable
              caption="Purchase register"
              columns={[
                { label: 'Purchase', className: 'px-3' },
                { label: 'Supplier', className: 'px-3' },
                { label: 'Date', className: 'px-3' },
                { label: 'Total', className: 'px-3' },
                { label: 'Materials', className: 'px-3' },
                { label: 'Status', className: 'px-3' },
                { label: 'Actions', className: 'px-3' },
              ]}
            >
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                  <td className="px-3 py-4 align-top">
                    <div className="font-semibold text-slate-900">{purchase.invoiceNumber || purchase.id}</div>
                    <div className="text-xs text-slate-500">{purchase.primaryMaterialName}</div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="font-medium text-slate-900">{purchase.supplier?.name || purchase.supplierName || 'Unknown supplier'}</div>
                    <div className="text-xs text-slate-500">{purchase.notes || 'No notes'}</div>
                  </td>
                  <td className="px-3 py-4 align-top text-slate-600">{formatDate(purchase.invoiceDate || purchase.createdAt)}</td>
                  <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(purchase.totalAmount, purchase.currency || 'USD')}</td>
                  <td className="px-3 py-4 align-top">
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900">{purchase.primaryMaterialName}</div>
                      {purchase.materialNames.length > 1 ? (
                        <div className="text-xs text-slate-500">+{purchase.materialNames.length - 1} more material{purchase.materialNames.length === 2 ? '' : 's'}</div>
                      ) : (
                        <div className="text-xs text-slate-500">Single-material source</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(purchase.status)}`}>
                      {purchase.status || 'DRAFT'}
                    </span>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/inventory/purchases/${purchase.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </Link>
                      <Link
                        to={`/inventory/purchases/create?material=${purchase.primaryMaterialId}`}
                        className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Repeat
                      </Link>
                      <Link
                        to={`/inventory/materials/${purchase.primaryMaterialId}`}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Material
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </InventoryDataTable>
          )}
        </InventorySectionCard>

        <div className="space-y-6">
          <InventorySectionCard title="Procurement Workflow" description="Track procurement from materials back to supplier purchases.">
            <div className="space-y-3 text-sm text-slate-600">
              <p>Create a new purchase directly from this dashboard or from a material detail page.</p>
              <p>The register is assembled from Merlin's existing per-material purchase history helpers, so the API contract stays unchanged.</p>
              <p>Use the material filter to focus on a single procurement lane when reconciling costs or reordering stock.</p>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Low Stock" description="Materials that are at or below their reorder point.">
            <div className="space-y-3">
              {lowStockMaterials.slice(0, 5).map((material) => (
                <div key={material.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{material.name}</div>
                    <div className="text-slate-500">Reorder {material.reorderLevel ?? 'N/A'}</div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/purchases/create?material=${material.id}`)}>
                    Reorder
                  </Button>
                </div>
              ))}
              {lowStockMaterials.length === 0 ? <div className="text-sm text-slate-500">No low-stock materials.</div> : null}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => navigate('/inventory/purchases/create')}>
                Create Purchase
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/suppliers')}>
                Suppliers
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/materials')}>
                Materials
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/boms/create')}>
                Create BOM
              </Button>
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
