import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import { rawMaterialApi } from '../../services/rawMaterialApi'
import { FinishedGoodCsvActions } from '../../components/inventory/FinishedGoodCsvActions'
import { ArticleCategoryCreateInline } from '../../components/inventory/ArticleCategoryCreateInline'
import { ArticleCategorySelect } from '../../components/inventory/ArticleCategorySelect'
import { Modal } from '../../components/ui/Modal'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { formatNepaliDate, formatNepaliDateTime } from '../../utils/nepaliDate'
import { useCurrentUser } from '../../components/auth/CurrentUserContext'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

const formatChange = (value: number | string) => {
  const numeric = Number(value ?? 0)
  return `${numeric >= 0 ? '+' : ''}${numeric}`
}

const changeTone = (value: number | string) =>
  Number(value ?? 0) >= 0
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : 'bg-red-50 text-red-600 ring-1 ring-red-100'

export default function FinishedGoodDetailPage() {
  const { id } = useParams()
  const { canEdit } = useCurrentUser()
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
  const canEditArticle = canEdit && !article?.deletedAt
  const reorderLevel = article?.reorderLevel ?? null
  const hasTarget = reorderLevel != null && Number.isFinite(Number(reorderLevel)) && Number(reorderLevel) > 0
  const isLowStock = hasTarget && currentStock <= Number(reorderLevel)
  const articlePrice = Number(article?.sellingPrice ?? 0)
  const stockValue = articlePrice * currentStock
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

  const pagedTransactions = transactions
  const totalRows = transactions.length

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
          ...(canEditArticle ? [
            { label: 'Adjust Stock', onClick: () => setShowAdjust(true) },
            { label: 'Edit Article', variant: 'outline' as const, onClick: () => setShowEdit(true) },
          ] : []),
          { label: 'Production Batches', variant: 'secondary', to: '/inventory/production' },
        ]}
      >
        <InventoryStatGrid
          stats={[
            { label: 'Current stock', value: currentStock },
            { label: 'Reorder level', value: hasTarget ? reorderLevel : 'Not set', tone: 'warning' },
            { label: 'Price per article', value: money(articlePrice), tone: 'slate' },
            { label: 'Stock value', value: money(stockValue), tone: 'success' },
          ]}
        />

        {isLowStock ? (
          <InventorySectionCard title="Low Stock Warning" description="This article is at or below its reorder level.">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">Reorder attention needed</div>
              <div className="mt-1">
                Stock is {currentStock} {article.unit || 'units'} and the reorder level is {reorderLevel}. This article will remain flagged until replenished.
              </div>
            </div>
          </InventorySectionCard>
        ) : null}

        <InventorySectionCard title="Article Overview" description="Master data, status, and primary actions for this finished good.">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
                <div className="flex h-full min-h-56 items-center justify-center">
                  {article.imageUrl ? (
                    <img src={article.imageUrl} alt={article.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="px-4 text-center">
                      <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-slate-200" />
                      <div className="text-sm font-medium text-slate-700">No article image</div>
                      <div className="mt-1 text-xs text-slate-500">Add an image from Edit Article.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${article.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    {article.active ? 'Active article' : 'Inactive article'}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {currentStock} {article.unit || 'units'} on hand
                  </span>
                  {hasTarget ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Reorder level {reorderLevel}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{article.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {article.description || 'No description has been added for this article yet.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Article Number</div>
                    <div className="mt-1 font-semibold text-slate-900">{article.productCode || article.sku || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Category</div>
                    <div className="mt-1 font-semibold text-slate-900">{article.articleCategory?.name || article.category || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Unit</div>
                    <div className="mt-1 font-semibold text-slate-900">{article.unit || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Created</div>
                    <div className="mt-1 font-semibold text-slate-900">{formatNepaliDate(article.createdAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Quick Actions</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{canEdit ? 'Adjust stock or update the article record without leaving this page.' : 'Read-only article details and stock history.'}</p>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span>Current stock</span>
                  <span className="font-semibold text-slate-900">{currentStock}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span>Price per article</span>
                  <span className="font-semibold text-slate-900">{money(articlePrice)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span>Stock value</span>
                  <span className="font-semibold text-slate-900">{money(stockValue)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span>Material lines</span>
                  <span className="font-semibold text-slate-900">{bomItems.length}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2">
                {canEditArticle ? (
                  <>
                    <button
                      type="button"
                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      onClick={() => setShowAdjust(true)}
                    >
                      Adjust Stock
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setShowEdit(true)}
                    >
                      Edit Article
                    </button>
                  </>
                ) : null}
                <Link
                  to="/inventory/production"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Production Batches
                </Link>
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                Stock updates affect invoice validation and low-stock checks immediately.
              </div>
            </div>
          </div>
        </InventorySectionCard>

        <InventorySectionCard title="CSV Tools" description="Import or export this article or the broader article catalog.">
          <div className="space-y-3">
            {canEdit ? <FinishedGoodCsvActions title="article" filters={{ ids: [article.id] }} onSuccess={() => void load()} /> : <div className="text-sm text-slate-500">Article import is restricted to managers and administrators.</div>}
            <div className="text-xs leading-5 text-slate-500">
              Export the current article record or download the template for bulk article updates.
            </div>
          </div>
        </InventorySectionCard>

        <InventorySectionCard title="Stock Trend" description="Running stock changes over time.">
          {stockSeries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No stock history yet.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="articleStockFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatNepaliDate(String(value))}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    minTickGap={24}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} width={40} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const point = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
                          <div className="text-xs text-slate-500">{formatNepaliDateTime(String(label))}</div>
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

        <InventorySectionCard
          title="Stock History"
          description="Every manual adjustment and production movement for the article."
          action={<span className="text-xs font-semibold text-slate-500">{totalRows} entries</span>}
        >
          <div className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
            Use the primary actions above for master-record edits and stock corrections. Stock history below is read-only unless you need to inspect a specific movement.
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <caption className="sr-only">Article stock history</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
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
                      <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={5}>
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    pagedTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <th className="px-6 py-4 font-medium whitespace-nowrap text-slate-900" scope="row">
                          {formatNepaliDate(tx.createdAt)}
                        </th>
                        <td className="px-6 py-4 font-mono text-slate-700">
                          <div className="flex items-center gap-1">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${changeTone(tx.change)}`}>
                              {formatChange(tx.change)}
                            </span>
                            <span className="text-xs text-slate-400">{tx.unit || article.unit || 'unit'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(tx.change) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {Number(tx.change) >= 0 ? 'Stock In' : 'Stock Out'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500">
                            {tx.reason || tx.transactionType || 'Adjustment'}
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
                              </div>
                            </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                const materialLabel = item.rawMaterialName || item.rawMaterial?.name || item.rawMaterialId || '-'
                return (
                  <tr key={`${item.rawMaterialId || index}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold">
                      {item.rawMaterialId ? (
                        <Link
                          to={`/inventory/materials/${item.rawMaterialId}`}
                          className="text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {materialLabel}
                        </Link>
                      ) : (
                        <span className="text-slate-900">{materialLabel}</span>
                      )}
                    </td>
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

      <Modal isOpen={showEdit && canEditArticle} onClose={() => setShowEdit(false)} title={`Edit ${article.name}`} size="xl">
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(article.imageUrl || null)
  const [form, setForm] = useState({
    name: article.name,
    sku: article.sku || '',
    productCode: article.productCode || '',
    articleCategoryId: article.articleCategoryId || '',
    category: article.category || '',
    unit: article.unit || 'pcs',
    sellingPrice: article.sellingPrice || '',
    costPrice: article.costPrice || '',
    reorderLevel: article.reorderLevel || '',
    description: article.description || '',
    notes: article.notes || '',
  })

  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])
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

  useEffect(() => {
    if (materials.length === 0) return
    setBomItems((current) =>
      current.map((item) => {
        const material = materials.find((row) => row.id === item.rawMaterialId)
        if (!material) return item
        const materialCost = String(Number(material.costPrice ?? material.averageUnitCost ?? 0))
        return {
          ...item,
          rawMaterialName: material.name || item.rawMaterialName,
          unit: material.defaultUnit || item.unit,
          rate: materialCost,
        }
      }),
    )
  }, [materials])

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

  const materialCost = bomItems.reduce(
    (sum, item) => sum + Number(item.consumption || 0) * Number(item.rate || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr]">
        <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {imagePreview ? <img src={imagePreview} alt={article.name} className="h-full w-full object-cover" /> : <div className="px-3 text-center text-xs text-slate-500">No image</div>}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Article image</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="w-full rounded-xl border px-3 py-2"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          <div className="mt-1 text-xs text-slate-500">Upload or replace the article image.</div>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Name</span><input className="w-full rounded-xl border px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Unit</span><input className="w-full rounded-xl border px-3 py-2" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">SKU</span><input className="w-full rounded-xl border px-3 py-2" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Product Code</span><input className="w-full rounded-xl border px-3 py-2" value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} /></label>
        <div className="block text-sm">
          <span className="mb-1 block text-slate-600">Category</span>
          <ArticleCategorySelect value={form.articleCategoryId} onChange={(articleCategoryId) => setForm({ ...form, articleCategoryId })} />
          <ArticleCategoryCreateInline onCreated={(created) => setForm((current) => ({ ...current, articleCategoryId: created.id }))} />
          <input className="mt-3 w-full rounded-xl border px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Legacy fallback label" />
        </div>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Reorder Level</span><input className="w-full rounded-xl border px-3 py-2" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Selling Price</span><input className="w-full rounded-xl border px-3 py-2" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Material cost</span><input className="w-full rounded-xl border bg-slate-50 px-3 py-2" value={materialCost.toFixed(2)} readOnly /></label>
      </div>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Description</span><textarea className="min-h-24 w-full rounded-xl border px-3 py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Notes</span><textarea className="min-h-24 w-full rounded-xl border px-3 py-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Material Bill</div>
            <div className="text-xs text-slate-500">Manage article materials and quantities. Material cost is pulled from the raw material record.</div>
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
                        rate: String(Number(material?.costPrice ?? material?.averageUnitCost ?? 0)),
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
                  <span className="mb-1 block text-slate-600">Material cost</span>
                  <input className="w-full rounded-xl border bg-slate-50 px-3 py-2" type="number" value={item.rate} readOnly />
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
          onClick={async () => {
            const updated = await onSave({
              name: form.name,
              sku: form.sku || undefined,
              productCode: form.productCode || undefined,
              category: form.category || undefined,
              articleCategoryId: form.articleCategoryId || undefined,
              unit: form.unit || undefined,
              sellingPrice: Number(form.sellingPrice || 0),
              costPrice: materialCost,
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
            if (imageFile) {
              const formData = new FormData()
              formData.append('image', imageFile)
              await api.post(`/inventory/finished-goods/${article.id}/image`, formData)
            }
            return updated
          }}
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
