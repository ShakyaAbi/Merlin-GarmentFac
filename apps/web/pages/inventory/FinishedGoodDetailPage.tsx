import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import { rawMaterialApi } from '../../services/rawMaterialApi'
import { Modal } from '../../components/ui/Modal'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function FinishedGoodDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [article, setArticle] = useState<any | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [articleData, transactionData] = await Promise.all([
        api.get(`/inventory/finished-goods/${id}`),
        api.get(`/inventory/finished-goods/${id}/transactions`),
      ])
      setArticle(articleData)
      setTransactions(Array.isArray(transactionData) ? transactionData : Array.isArray(transactionData?.items) ? transactionData.items : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load article details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('edit') === '1') setShowEdit(true)
  }, [location.search])

  const currentStock = Number(article?.currentStock ?? 0)
  const reorderLevel = article?.reorderLevel ?? null
  const hasTarget = reorderLevel != null && Number.isFinite(Number(reorderLevel)) && Number(reorderLevel) > 0
  const stockValue = Number(article?.sellingPrice ?? 0) * currentStock
  const bomItems = Array.isArray(article?.bomData?.items) ? article.bomData.items : []
  const stockSeries = useMemo(() => {
    const sorted = [...transactions]
      .map((tx: any) => ({
        id: tx.id,
        date: tx.createdAt || new Date().toISOString(),
        change: Number(tx.change ?? 0),
        reason: tx.reason || tx.transactionType || 'Adjustment',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let running = currentStock
    return sorted.map((tx) => {
      running -= tx.change
      return { ...tx, stock: Math.max(running, 0) }
    })
  }, [transactions, currentStock])

  const handleAdjust = async (payload: any) => {
    try {
      const tx = await api.patch(`/inventory/finished-goods/${article.id}/adjust-stock`, payload)
      setTransactions([tx, ...transactions])
      const refreshed = await api.get(`/inventory/finished-goods/${article.id}`)
      setArticle(refreshed)
      setShowAdjust(false)
    } catch (err: any) {
      alert(`Adjust failed: ${err.message}`)
    }
  }

  const handleSaveEdit = async (payload: any) => {
    try {
      const updated = await api.put(`/inventory/finished-goods/${article.id}`, payload)
      setArticle(updated)
      setShowEdit(false)
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    }
  }

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (loading || !article) return <div className="p-8 text-center text-slate-500">Loading article...</div>

  return (
    <>
      <InventoryPageShell
        eyebrow="Inventory"
        title={article.name}
        description="Article stock, transaction history, manual adjustments, and low-stock tracking."
        backTo={{ to: '/inventory/finished-goods', label: 'Back to Articles' }}
        actions={[
          { label: 'Adjust Stock', onClick: () => setShowAdjust(true) },
          { label: 'Edit Article', variant: 'outline', onClick: () => setShowEdit(true) },
          { label: 'Production Orders', variant: 'secondary', to: '/inventory/production' },
        ]}
      >
        <InventoryStatGrid
          stats={[
            { label: 'Current stock', value: currentStock },
            { label: 'Reorder level', value: hasTarget ? reorderLevel : 'Not set', tone: 'warning' },
            { label: 'Stock value', value: money(stockValue), tone: 'success' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <InventorySectionCard title="Article Details" description="Master data for the article stock item.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Article Number</div><div className="font-medium text-slate-900">{article.productCode || article.sku || '-'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Product Code</div><div className="font-medium text-slate-900">{article.productCode || '-'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">SKU</div><div className="font-medium text-slate-900">{article.sku || '-'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Category</div><div className="font-medium text-slate-900">{article.category || '-'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Unit</div><div className="font-medium text-slate-900">{article.unit || '-'}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Selling Price</div><div className="font-medium text-slate-900">{money(article.sellingPrice)}</div></div>
              <div><div className="text-xs uppercase tracking-wide text-slate-500">Cost Price</div><div className="font-medium text-slate-900">{money(article.costPrice)}</div></div>
              <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Description</div><div className="font-medium text-slate-900">{article.description || '-'}</div></div>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions" description="Adjust stock or update the article master record.">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Status</span><span className="font-medium text-slate-900">{article.active ? 'Active' : 'Inactive'}</span></div>
              <div className="flex items-center justify-between"><span>Material lines</span><span className="font-medium text-slate-900">{bomItems.length}</span></div>
              <div className="flex items-center justify-between"><span>Created</span><span className="font-medium text-slate-900">{article.createdAt ? new Date(article.createdAt).toLocaleDateString() : '-'}</span></div>
              <button type="button" className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAdjust(true)}>
                Adjust Stock
              </button>
              <button type="button" className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setShowEdit(true)}>
                Edit Article
              </button>
            </div>
          </InventorySectionCard>
        </div>

        <InventorySectionCard title="Stock Trend" description="Running stock changes over time.">
          {stockSeries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No stock history yet.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockSeries}>
                  <defs>
                    <linearGradient id="articleStockFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const point = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
                          <div className="text-xs text-slate-500">{new Date(String(label)).toLocaleString()}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {point.stock} {article.unit || 'units'}
                          </div>
                          <div className="text-xs text-slate-600">{point.reason}</div>
                        </div>
                      )
                    }}
                  />
                  <Area type="monotone" dataKey="stock" stroke="#2563eb" strokeWidth={2.5} fill="url(#articleStockFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </InventorySectionCard>

        <InventorySectionCard title="Stock History" description="Every manual adjustment and production movement for the article.">
          <InventoryDataTable
            caption="Article stock history"
            columns={[{ label: 'Date' }, { label: 'Change' }, { label: 'Balance After' }, { label: 'Type' }, { label: 'Reason' }]}
          >
            {transactions.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={5}>
                  No transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx: any) => (
                <tr key={tx.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4 text-slate-600">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}</td>
                  <td className={`px-3 py-4 font-semibold ${Number(tx.change) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {Number(tx.change) >= 0 ? '+' : ''}
                    {Number(tx.change)}
                  </td>
                  <td className="px-3 py-4 text-slate-700">{Number(tx.balanceAfter ?? 0)}</td>
                  <td className="px-3 py-4 text-slate-700">{String(tx.transactionType || '').replaceAll('_', ' ')}</td>
                  <td className="px-3 py-4 text-slate-600">{tx.reason || '-'}</td>
                </tr>
              ))
            )}
          </InventoryDataTable>
        </InventorySectionCard>

        <InventorySectionCard title="Article Materials" description="The material bill attached to this article.">
          {bomItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No material bill has been attached yet.</div>
          ) : (
            <InventoryDataTable
              caption="Article material bill"
              columns={[{ label: 'Raw Material' }, { label: 'Qty' }, { label: 'Unit' }, { label: 'Rate (NPR)' }, { label: 'Amount (NPR)' }]}
            >
              {bomItems.map((item: any, index: number) => {
                const amount = Number(item.consumption ?? 0) * Number(item.rate ?? 0)
                return (
                  <tr key={`${item.rawMaterialId || index}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{item.rawMaterialName || item.rawMaterial?.name || item.rawMaterialId || '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{Number(item.consumption ?? 0)}</td>
                    <td className="px-3 py-4 text-slate-700">{item.unit || '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{money(item.rate ?? 0)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(amount)}</td>
                  </tr>
                )
              })}
            </InventoryDataTable>
          )}
        </InventorySectionCard>
      </InventoryPageShell>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={`Edit ${article.name}`} size="xl">
        <EditArticleForm article={article} onCancel={() => setShowEdit(false)} onSave={handleSaveEdit} />
      </Modal>

      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title={`Adjust stock - ${article.name}`} size="md">
        <AdjustArticleStockForm article={article} onCancel={() => setShowAdjust(false)} onSave={handleAdjust} />
      </Modal>
    </>
  )
}

function EditArticleForm({ article, onCancel, onSave }: any) {
  const [materials, setMaterials] = useState<any[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [form, setForm] = useState({
    name: article.name,
    sku: article.sku || '',
    productCode: article.productCode || '',
    category: article.category || '',
    unit: article.unit || 'pcs',
    sellingPrice: article.sellingPrice || '',
    costPrice: article.costPrice || '',
    reorderLevel: article.reorderLevel || '',
    description: article.description || '',
    notes: article.notes || '',
  })
  const [bomItems, setBomItems] = useState<any[]>(
    Array.isArray(article?.bomData?.items) && article.bomData.items.length > 0
      ? article.bomData.items.map((item: any) => ({
          rawMaterialId: item.rawMaterialId || '',
          rawMaterialName: item.rawMaterialName || item.rawMaterial?.name || '',
          consumption: String(item.consumption ?? 1),
          unit: item.unit || '',
          rate: String(item.rate ?? 0),
          yield: item.yield === undefined || item.yield === null ? '' : String(item.yield),
        }))
      : [{ rawMaterialId: '', rawMaterialName: '', consumption: '1', unit: '', rate: '0', yield: '' }],
  )

  useEffect(() => {
    let alive = true
    rawMaterialApi.list({ page: 1, pageSize: 500 }).then((data: any) => {
      if (!alive) return
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      setMaterials(rows)
    }).finally(() => {
      if (alive) setLoadingMaterials(false)
    })
    return () => { alive = false }
  }, [])

  const updateBomItem = (idx: number, patch: Partial<any>) => {
    setBomItems((current) => {
      const next = [...current]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const addBomRow = () => {
    setBomItems((current) => [...current, { rawMaterialId: '', rawMaterialName: '', consumption: '1', unit: '', rate: '0', yield: '' }])
  }

  const removeBomRow = (idx: number) => {
    setBomItems((current) => current.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Name</span><input className="w-full rounded-xl border px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Unit</span><input className="w-full rounded-xl border px-3 py-2" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">SKU</span><input className="w-full rounded-xl border px-3 py-2" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Product Code</span><input className="w-full rounded-xl border px-3 py-2" value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Category</span><input className="w-full rounded-xl border px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Reorder Level</span><input className="w-full rounded-xl border px-3 py-2" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Selling Price</span><input className="w-full rounded-xl border px-3 py-2" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Cost Price</span><input className="w-full rounded-xl border px-3 py-2" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></label>
      </div>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Description</span><textarea className="min-h-24 w-full rounded-xl border px-3 py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Notes</span><textarea className="min-h-24 w-full rounded-xl border px-3 py-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Material Bill</div>
            <div className="text-xs text-slate-500">Manage article materials, quantities, and rates here.</div>
          </div>
          <button type="button" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" onClick={addBomRow}>
            Add Row
          </button>
        </div>

        {loadingMaterials ? (
          <div className="py-6 text-sm text-slate-500">Loading material options...</div>
        ) : (
          <div className="space-y-3">
            {bomItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,2fr)_120px_110px_110px_96px]">
                <label className="block text-sm md:col-span-1">
                  <span className="mb-1 block text-slate-600">Raw material</span>
                  <select
                    className="w-full rounded-xl border px-3 py-2"
                    value={item.rawMaterialId}
                    onChange={(e) => {
                      const material = materials.find((m) => m.id === e.target.value)
                      updateBomItem(idx, {
                        rawMaterialId: e.target.value,
                        rawMaterialName: material?.name || '',
                        unit: material?.defaultUnit || item.unit,
                      })
                    }}
                  >
                    <option value="">Select material</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                        {material.sku ? ` - ${material.sku}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Qty</span>
                  <input className="w-full rounded-xl border px-3 py-2" type="number" min="0" step="0.01" value={item.consumption} onChange={(e) => updateBomItem(idx, { consumption: e.target.value })} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Unit</span>
                  <input className="w-full rounded-xl border px-3 py-2" value={item.unit} onChange={(e) => updateBomItem(idx, { unit: e.target.value })} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Rate</span>
                  <input className="w-full rounded-xl border px-3 py-2" type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateBomItem(idx, { rate: e.target.value })} />
                </label>
                <div className="flex items-end">
                  <button type="button" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={() => removeBomRow(idx)} disabled={bomItems.length === 1}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-3 py-2">Cancel</button>
        <button
          type="button"
          onClick={() =>
            onSave({
              name: form.name,
              sku: form.sku || undefined,
              productCode: form.productCode || undefined,
              category: form.category || undefined,
              unit: form.unit || undefined,
              sellingPrice: Number(form.sellingPrice || 0),
              costPrice: Number(form.costPrice || 0),
              reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
              description: form.description || undefined,
              notes: form.notes || undefined,
              bomData: {
                name: form.name,
                garmentStyle: form.category || form.name,
                items: bomItems
                  .filter((item) => item.rawMaterialId && Number(item.consumption || 0) > 0)
                  .map((item) => ({
                    rawMaterialId: item.rawMaterialId,
                    rawMaterialName: item.rawMaterialName || undefined,
                    consumption: Number(item.consumption || 0),
                    unit: item.unit || '',
                    rate: Number(item.rate || 0),
                    yield: item.yield === '' ? undefined : Number(item.yield),
                  })),
              },
            })
          }
          className="rounded-xl bg-blue-600 px-4 py-2 text-white"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function AdjustArticleStockForm({ article, onCancel, onSave }: any) {
  const [change, setChange] = useState(0)
  const [unit, setUnit] = useState(article.unit || 'pcs')
  const [reason, setReason] = useState('adjustment')

  return (
    <div className="space-y-4">
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Change (negative to reduce)</span><input type="number" className="w-full rounded-xl border px-3 py-2" value={change} onChange={(e) => setChange(Number(e.target.value))} /></label>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Unit</span><input className="w-full rounded-xl border px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Reason</span><input className="w-full rounded-xl border px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-3 py-2">Cancel</button>
        <button type="button" onClick={() => onSave({ change, unit, reason })} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Apply</button>
      </div>
    </div>
  )
}
