import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { api } from '../../services/api'
import { rawMaterialApi } from '../../services/rawMaterialApi'
import { MaterialCard } from '../../components/inventory/MaterialCard'
import { MaterialCsvActions } from '../../components/inventory/MaterialCsvActions'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { RawMaterialCategorySelect } from '../../components/inventory/RawMaterialCategorySelect'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    rawMaterialApi
      .list({ page: 1, pageSize: 500 })
      .then((data: any) => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        setMaterials(rows)
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || 'Failed to load materials.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase()
    return materials.filter((m) =>
      (!categoryId || m.categoryId === categoryId) &&
      (!q ||
        [m.name, m.sku, m.defaultUnit, m.type, m.description]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))),
    )
  }, [categoryId, materials, search])

  const lowStockMaterials = useMemo(
    () => filteredMaterials.filter((m) => m.reorderLevel != null && Number(m.currentStock ?? 0) <= Number(m.reorderLevel)),
    [filteredMaterials],
  )

  const totalStock = useMemo(
    () => filteredMaterials.reduce((sum, m) => sum + Number(m.currentStock ?? 0), 0),
    [filteredMaterials],
  )

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500" role="status" aria-live="polite">
        Loading materials...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600" role="alert">
        {error}
      </div>
    )
  }

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Raw Materials"
      description="Manage fabric, trims, accessories, and raw input stock used to make articles."
      backTo={{ to: '/inventory/purchases', label: 'Back to Purchases' }}
      actions={[
        { label: 'Create Material', onClick: () => navigate('/inventory/materials/create') },
        { label: 'View Articles', variant: 'outline', to: '/inventory/finished-goods' },
        { label: 'Manage Categories', variant: 'secondary', to: '/inventory/categories?kind=materials' },
      ]}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <InventorySectionCard
            title="Raw Material Catalog"
            description="Search raw materials used in purchases, production, and article material bills."
          >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid w-full gap-3 md:grid-cols-2">
                <label className="sr-only" htmlFor="material-search">
                  Search materials
                </label>
                <input
                  id="material-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search materials"
                  aria-label="Search materials"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <RawMaterialCategorySelect
                  value={categoryId}
                  onChange={setCategoryId}
                  label="Filter by category"
                  allowAllOption
                  allLabel="All categories"
                />
              </div>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No materials found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {filteredMaterials.map((m) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    onEdit={(material) => navigate(`/inventory/materials/${material.id}?edit=1`)}
                  />
                ))}
              </div>
            )}
          </InventorySectionCard>
        </div>

        <div className="space-y-8 lg:col-span-1">
          <InventoryStatGrid
            stats={[
              { label: 'Total materials', value: materials.length },
              { label: 'Low stock items', value: lowStockMaterials.length, tone: 'warning' },
              { label: 'Total stock', value: totalStock },
            ]}
          />

          <InventorySectionCard title="Low Stock" description="Materials below reorder levels.">
            <div className="space-y-3">
              {lowStockMaterials.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-slate-500">Reorder {m.reorderLevel ?? 'N/A'}</div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/materials/${m.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
              {lowStockMaterials.length === 0 && <div className="text-sm text-slate-500">No low-stock materials.</div>}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/materials/create')}>
                New Material
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/finished-goods')}>
                View Articles
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/suppliers')}>
                Suppliers
              </Button>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="CSV Tools" description="Import or export the raw material catalog.">
            <MaterialCsvActions
              title="material catalog"
              filters={{ search, categoryId }}
              onSuccess={() => window.location.reload()}
            />
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
