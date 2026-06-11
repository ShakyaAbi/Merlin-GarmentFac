import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { request } from '../../services/apiClient'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'

type StockEntry = {
  rawMaterialId: string
  change: number
  unit: string
  reason: string
  referenceId: string
}

export default function MaterialEntryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [materials, setMaterials] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [entry, setEntry] = useState<StockEntry>({
    rawMaterialId: '',
    change: 0,
    unit: 'unit',
    reason: 'adjustment',
    referenceId: '',
  })

  useEffect(() => {
    let alive = true
    request<any[]>('/inventory/materials')
      .then((data) => {
        if (!alive) return
        setMaterials(Array.isArray(data) ? data : [])
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

  useEffect(() => {
    const materialId = searchParams.get('material') || ''
    if (materialId) {
      setSelectedMaterialId(materialId)
    }
  }, [searchParams])

  useEffect(() => {
    if (!selectedMaterialId) return
    const material = materials.find((item) => item.id === selectedMaterialId)
    if (!material) return
    setEntry((prev) => ({
      ...prev,
      rawMaterialId: material.id,
      unit: prev.unit || material.defaultUnit || 'unit',
    }))
  }, [materials, selectedMaterialId])

  useEffect(() => {
    if (!loading && !selectedMaterialId && materials.length > 0) {
      setSelectedMaterialId(materials[0].id)
    }
  }, [loading, materials, selectedMaterialId])

  useEffect(() => {
    if (!selectedMaterialId) {
      setTransactions([])
      return
    }

    let alive = true
    setLoadingTransactions(true)
    request<any[]>(`/inventory/materials/${selectedMaterialId}/transactions`)
      .then((data) => {
        if (!alive) return
        setTransactions(Array.isArray(data) ? data : [])
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || 'Failed to load material history.')
      })
      .finally(() => {
        if (alive) setLoadingTransactions(false)
      })

    return () => {
      alive = false
    }
  }, [selectedMaterialId])

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) =>
      [m.name, m.sku, m.defaultUnit, m.type, m.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [materials, search])

  const selectedMaterial = materials.find((item) => item.id === selectedMaterialId) || null
  const lowStockCount = useMemo(
    () => materials.filter((m) => m.reorderLevel != null && Number(m.currentStock ?? 0) <= Number(m.reorderLevel)).length,
    [materials],
  )

  const refreshMaterials = async (materialId: string) => {
    const [materialData, txData] = await Promise.all([
      request<any[]>('/inventory/materials'),
      request<any[]>(`/inventory/materials/${materialId}/transactions`),
    ])
    setMaterials(Array.isArray(materialData) ? materialData : [])
    setTransactions(Array.isArray(txData) ? txData : [])
  }

  const submit = async () => {
    if (!selectedMaterialId) return
    if (!entry.change || Number.isNaN(Number(entry.change))) return
    setSubmitting(true)
    setError(null)
    try {
      await request(`/inventory/materials/${selectedMaterialId}/adjust-stock`, {
        method: 'POST',
        body: {
          change: Number(entry.change),
          unit: entry.unit,
          reason: entry.reason,
          referenceId: entry.referenceId || undefined,
        },
      })
      await refreshMaterials(selectedMaterialId)
      setEntry((prev) => ({
        ...prev,
        change: 0,
        reason: 'adjustment',
        referenceId: '',
      }))
    } catch (err: any) {
      setError(err?.message || 'Failed to record material entry.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500" role="status" aria-live="polite">
        Loading material entry...
      </div>
    )
  }

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Material Entry"
      description="Select a material and record an adjustment or stock receipt."
      backTo={{ to: '/inventory/materials', label: 'Back to Materials' }}
      actions={[
        { label: 'Materials', variant: 'outline', to: '/inventory/materials' },
        { label: 'Create Material', to: '/inventory/materials/create' },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid
        stats={[
          { label: 'Materials', value: materials.length },
          { label: 'Low stock', value: lowStockCount, tone: 'warning' },
          { label: 'Selected stock', value: selectedMaterial?.currentStock ?? '—', tone: 'success' },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <InventorySectionCard title="Pick a material" description="Search, select, and open a material for entry.">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="sr-only" htmlFor="material-entry-search">
                Search materials
              </label>
              <input
                id="material-entry-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search materials"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-72"
              />
              {selectedMaterial ? (
                <Link
                  to={`/inventory/materials/${selectedMaterial.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Open Detail
                </Link>
              ) : null}
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No materials found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {filteredMaterials.map((material) => {
                  const selected = material.id === selectedMaterialId
                  const stock = Number(material.currentStock ?? 0)
                  const reorderLevel = material.reorderLevel ?? null
                  const lowStock = reorderLevel != null && stock <= Number(reorderLevel)
                  return (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => {
                        setSelectedMaterialId(material.id)
                        setEntry((prev) => ({
                          ...prev,
                          rawMaterialId: material.id,
                          unit: material.defaultUnit || prev.unit || 'unit',
                        }))
                      }}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{material.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {material.sku || 'N/A'} · {material.defaultUnit || 'N/A'}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${lowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {lowStock ? 'Low' : 'OK'}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Current stock</span>
                        <span className="font-semibold text-slate-900">{stock}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Reorder</span>
                        <span className="font-semibold text-slate-900">{reorderLevel ?? 'N/A'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </InventorySectionCard>
        </div>

        <div className="space-y-8 lg:col-span-1">
          <InventorySectionCard title="Entry Form" description="Record a stock change for the selected material.">
            {selectedMaterial ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{selectedMaterial.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {selectedMaterial.sku || 'N/A'} · {selectedMaterial.defaultUnit || 'N/A'}
                  </div>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Change</span>
                  <input
                    type="number"
                    value={entry.change}
                    onChange={(e) => setEntry((prev) => ({ ...prev, change: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                  <div className="mt-1 text-xs text-slate-500">Use a negative number to reduce stock.</div>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Unit</span>
                  <input
                    value={entry.unit}
                    onChange={(e) => setEntry((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Reason</span>
                  <input
                    value={entry.reason}
                    onChange={(e) => setEntry((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Reference ID</span>
                  <input
                    value={entry.referenceId}
                    onChange={(e) => setEntry((prev) => ({ ...prev, referenceId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="Optional reference"
                  />
                </label>

                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">Select a material to start data entry.</div>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Recent Transactions" description="Latest stock movements for the selected material.">
            {loadingTransactions ? (
              <div className="py-6 text-center text-sm text-slate-500">Loading history...</div>
            ) : transactions.length === 0 ? (
              <div className="text-sm text-slate-500">No transactions yet.</div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 6).map((t: any) => (
                  <div key={t.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{t.transactionType || 'Adjustment'}</div>
                      <div className={`font-bold ${Number(t.change) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {Number(t.change) >= 0 ? '+' : ''}
                        {t.change}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t.remarks || 'No reason provided.'} · {t.unit || 'unit'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
