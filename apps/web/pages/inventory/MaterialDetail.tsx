import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import { rawMaterialApi } from '../../services/rawMaterialApi'
import { Modal } from '../../components/ui/Modal'
import { MaterialCsvActions } from '../../components/inventory/MaterialCsvActions'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { RawMaterialCategoryField } from '../../components/inventory/RawMaterialCategoryField'
import { formatNepaliDate, formatNepaliDateTime } from '../../utils/nepaliDate'

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [material, setMaterial] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [boms, setBoms] = useState<any[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true

    const load = async () => {
      setError(null)
      try {
        const [materialData, transactionData, purchaseData, priceData, bomData] = await Promise.all([
          api.get(`/inventory/materials/${id}`),
          api.get(`/inventory/materials/${id}/transactions`),
          api.get(`/inventory/materials/${id}/purchases`),
          api.get(`/inventory/materials/${id}/prices`),
          api.get(`/inventory/materials/${id}/boms`),
        ])

        if (!alive) return
        setMaterial(materialData)
        setTransactions(transactionData || [])
        setPurchases(purchaseData || [])
        setPrices(priceData || [])
        setBoms(bomData || [])
      } catch (err: any) {
        if (!alive) return
        const message = err?.message || 'Failed to load material details.'
        if (String(message).toLowerCase().includes('route not found') || String(message).toLowerCase().includes('not found')) {
          if (id?.startsWith('fg_')) {
            navigate(`/inventory/finished-goods/${id}`, { replace: true })
            return
          }
        }
        setError(message)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('edit') === '1') {
      setShowEdit(true)
    }
  }, [location.search])

  const stockSeries = useMemo(() => {
    const sorted = [...transactions]
      .map((tx: any) => ({
        id: tx.id,
        date: tx.createdAt || tx.date || new Date().toISOString(),
        change: Number(tx.change ?? 0),
        reason: tx.reason || tx.remarks || tx.transactionType || 'Adjustment',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let running = Number(material?.currentStock ?? 0)
    return sorted.map((tx) => {
      running -= tx.change
      return {
        ...tx,
        stock: Math.max(running, 0),
      }
    })
  }, [transactions, material?.currentStock])

  const visibleTransactions = useMemo(
    () => (showDeleted ? transactions : transactions.filter((tx: any) => !tx.deletedAt)),
    [transactions, showDeleted],
  )

  const totalRows = visibleTransactions.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const showingFrom = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const showingTo = Math.min(totalRows, safeCurrentPage * pageSize)
  const pagedTransactions = visibleTransactions.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    const start = Math.max(1, Math.min(totalPages - 4, safeCurrentPage - 2))
    return start + index
  }).filter((page) => page <= totalPages)

  if (error) {
    return (
      <div className="p-8 text-center text-red-600" role="alert">
        {error}
      </div>
    )
  }

  if (!material) {
    return (
      <div className="p-8 text-center text-slate-500" role="status" aria-live="polite">
        Loading material...
      </div>
    )
  }

  const handleSaveEdit = async (payload: any) => {
    try {
      const updated = await rawMaterialApi.update(material.id, payload)
      setMaterial(updated)
      setShowEdit(false)
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    }
  }

  const handleAdjust = async (payload: any) => {
    try {
      const tx = await rawMaterialApi.adjustStock(material.id, payload)
      setTransactions([tx, ...transactions])
      const refreshed = await api.get(`/inventory/materials/${material.id}`)
      setMaterial(refreshed)
      setShowAdjust(false)
    } catch (err: any) {
      alert(`Adjust failed: ${err.message}`)
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedRows(new Set())
      return
    }
    setSelectedRows(new Set(pagedTransactions.map((tx: any) => tx.id)))
  }

  const toggleRow = (rowId: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (checked) next.add(rowId)
      else next.delete(rowId)
      return next
    })
  }

  return (
    <>
      <InventoryPageShell
        eyebrow="Inventory"
        title={`${material.name}${material.sku ? ` ${material.sku}` : ''}`}
        description={`Unit: ${material.defaultUnit || 'N/A'} | Cost: ${material.costPrice || 'N/A'}`}
        backTo={{ to: '/inventory/materials', label: 'Back to materials' }}
        actions={[
          {
            label: 'Create Purchase',
            to: `/inventory/purchases/create?material=${material.id}`,
            variant: 'primary',
          },
          { label: 'Adjust Stock', variant: 'outline', onClick: () => setShowAdjust(true) },
          { label: 'Edit Material', variant: 'outline', onClick: () => setShowEdit(true) },
        ]}
      >
        <InventoryStatGrid
          stats={[
            { label: 'Current stock', value: material.currentStock ?? 0 },
            { label: 'Reorder level', value: material.reorderLevel ?? 'Not set', tone: 'warning' },
            { label: 'Linked BOMs', value: boms.length, tone: 'success' },
          ]}
        />

        <InventorySectionCard title="Stock Trend" description="Movement history shown as a running stock line, similar to an indicator trend.">
          {stockSeries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No stock history yet.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="materialStockFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    minTickGap={24}
                    tickFormatter={(value) => formatNepaliDate(String(value))}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const point = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
                          <div className="text-xs text-slate-500">{formatNepaliDateTime(String(label))}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {point.stock} {material.defaultUnit || 'units'}
                          </div>
                          <div className="text-xs text-slate-600">{point.reason}</div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stock"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fill="url(#materialStockFill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </InventorySectionCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InventorySectionCard title="Data History" description="Material stock history in the same interaction style as indicator data tables.">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                  />
                  Show Deleted
                </label>
                <MaterialCsvActions
                  title="material record"
                  filters={{ ids: [material.id] }}
                  onSuccess={() => window.location.reload()}
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Material stock transaction history</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={pagedTransactions.length > 0 && pagedTransactions.every((row: any) => selectedRows.has(row.id))}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                          />
                        </th>
                        <th className="px-6 py-3 font-semibold">Reporting Date</th>
                        <th className="px-6 py-3 font-semibold">Value</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold">Verification</th>
                        <th className="px-6 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                            No transactions yet.
                          </td>
                        </tr>
                      ) : (
                        pagedTransactions.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-4 py-4 align-top">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(t.id)}
                                onChange={(e) => toggleRow(t.id, e.target.checked)}
                              />
                            </td>
                            <th className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap" scope="row">
                              {formatNepaliDate(t.createdAt)}
                            </th>
                            <td className="px-6 py-4 font-mono text-slate-700">
                              <div className="flex items-center gap-1">
                                <span className={`font-semibold ${Number(t.change) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                  {Number(t.change) >= 0 ? '+' : ''}
                                  {t.change}
                                </span>
                                <span className="text-xs text-slate-400">{t.unit || material.defaultUnit || 'unit'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(t.change) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                {Number(t.change) >= 0 ? 'Stock In' : 'Stock Out'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500">
                                {t.remarks || t.reason || 'Adjustment'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700"
                                  onClick={() => setShowAdjust(true)}
                                >
                                  Adjust
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                  onClick={() => setShowEdit(true)}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>
                        Showing <span className="font-semibold">{showingFrom}</span> - <span className="font-semibold">{showingTo}</span> of{' '}
                        <span className="font-semibold">{totalRows}</span> entries
                      </span>
                      <span>
                        Selected: <span className="font-semibold">{selectedRows.size}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-slate-600">Rows</label>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage <= 1}
                      >
                        Prev
                      </button>
                      {pageNumbers.map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${
                            page === safeCurrentPage ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white'
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage >= totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </InventorySectionCard>
          </div>

          <div className="space-y-4">
            <InventorySectionCard title="Summary">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Current stock</span>
                  <span className="font-semibold text-slate-900">{material.currentStock ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Reorder level</span>
                  <span className="font-semibold text-slate-900">{material.reorderLevel ?? 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Default unit</span>
                  <span className="font-semibold text-slate-900">{material.defaultUnit || 'N/A'}</span>
                </div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Price History" description="Latest purchase prices for this material.">
              <ul className="space-y-2 text-sm text-slate-600">
                {prices.map((p: any) => (
                  <li key={p.purchaseId}>
                    {formatNepaliDate(p.date)} - {p.unitPrice} ({p.quantity})
                  </li>
                ))}
                {prices.length === 0 ? <li className="text-slate-500">No price history yet.</li> : null}
              </ul>
            </InventorySectionCard>

            <InventorySectionCard title="Recent Purchases" description="Recent supplier purchases for this material.">
              <ul className="space-y-2 text-sm text-slate-600">
                {purchases.map((p: any) => (
                  <li key={p.id}>
                    {formatNepaliDate(p.createdAt)} - {p.supplier?.name || 'Unknown supplier'} - {p.totalAmount}
                  </li>
                ))}
                {purchases.length === 0 ? <li className="text-slate-500">No purchases yet.</li> : null}
              </ul>
            </InventorySectionCard>

            <InventorySectionCard title="CSV Tools" description="Import or export this material record.">
              <MaterialCsvActions
                title="material record"
                filters={{ ids: [material.id] }}
                onSuccess={() => window.location.reload()}
              />
            </InventorySectionCard>
          </div>
        </div>

        <InventorySectionCard
          title="Used In BOMs"
          description="This shows every bill of materials that references the material."
        >
          {boms.length === 0 ? (
            <div className="text-sm text-slate-600">No BOMs reference this material.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Bills of materials using this material</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Garment</th>
                    <th className="px-6 py-3 font-semibold">Consumption</th>
                    <th className="px-6 py-3 font-semibold">Unit</th>
                    <th className="px-6 py-3 font-semibold">Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {boms.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <th className="px-6 py-4 font-medium text-slate-900" scope="row">
                        {b.finishedGoodId ? (
                          <Link to={`/inventory/finished-goods/${b.finishedGoodId}`} className="text-blue-700 hover:text-blue-800">
                            {b.garmentStyle}
                          </Link>
                        ) : (
                          b.garmentStyle
                        )}
                      </th>
                      <td className="px-6 py-4">{b.consumption}</td>
                      <td className="px-6 py-4">{b.unit}</td>
                      <td className="px-6 py-4">{b.yield ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InventorySectionCard>
      </InventoryPageShell>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit ${material.name}`} size="md">
        <EditMaterialForm material={material} onCancel={() => setShowEdit(false)} onSave={handleSaveEdit} />
      </Modal>

      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title={`Adjust stock - ${material.name}`} size="md">
        <AdjustStockForm material={material} onCancel={() => setShowAdjust(false)} onSave={handleAdjust} />
      </Modal>
    </>
  )
}

function EditMaterialForm({ material, onCancel, onSave }: any) {
  const [form, setForm] = useState({
    name: material.name,
    sku: material.sku || '',
    defaultUnit: material.defaultUnit || '',
    reorderLevel: material.reorderLevel || 0,
    costPrice: material.costPrice || '',
    categoryId: material.categoryId || '',
  })
  const canSave = Boolean(form.name.trim() && form.sku.trim() && form.defaultUnit.trim())

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Name</span>
        <input className="w-full rounded-xl border px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">EXIM CODE</span>
        <input
          className="w-full rounded-xl border px-3 py-2"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          placeholder="Required exim code"
        />
      </label>
      <RawMaterialCategoryField
        value={form.categoryId}
        onChange={(categoryId) => setForm({ ...form, categoryId })}
      />
      <div className="flex gap-2">
        <label className="block flex-1 text-sm">
          <span className="mb-1 block text-slate-600">Default Unit</span>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={form.defaultUnit}
            onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
          />
        </label>
        <label className="block w-32 text-sm">
          <span className="mb-1 block text-slate-600">Reorder</span>
          <input
            type="number"
            className="w-full rounded-xl border px-3 py-2"
            value={form.reorderLevel}
            onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Cost Price</span>
        <input
          className="w-full rounded-xl border px-3 py-2"
          value={form.costPrice}
          onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-3 py-2">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canSave) return
            onSave({ ...form, categoryId: form.categoryId || undefined })
          }}
          disabled={!canSave}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function AdjustStockForm({ material, onCancel, onSave }: any) {
  const [change, setChange] = useState(0)
  const [unit, setUnit] = useState(material.defaultUnit || '')
  const [reason, setReason] = useState('adjustment')

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Change (use negative to reduce)</span>
        <input
          type="number"
          className="w-full rounded-xl border px-3 py-2"
          value={change}
          onChange={(e) => setChange(Number(e.target.value))}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Unit</span>
        <input className="w-full rounded-xl border px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Reason</span>
        <input className="w-full rounded-xl border px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-3 py-2">
          Cancel
        </button>
        <button type="button" onClick={() => onSave({ change, unit, reason })} className="rounded-xl bg-blue-600 px-4 py-2 text-white">
          Apply
        </button>
      </div>
    </div>
  )
}
