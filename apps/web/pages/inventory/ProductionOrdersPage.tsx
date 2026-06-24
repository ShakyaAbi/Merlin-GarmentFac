import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatNepaliDate } from '../../utils/nepaliDate'

type BatchStatus = 'ALL' | 'DRAFT' | 'MATERIAL_ISSUED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type QuickFilter = 'ALL' | 'READY_TO_ISSUE' | 'READY_TO_COMPLETE'

const statusLabel = (status?: string | null) => String(status || 'DRAFT').replaceAll('_', ' ')

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'COMPLETED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'IN_PROGRESS':
    case 'MATERIAL_ISSUED':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'CANCELLED':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
  }
}

const nextActionForBatch = (order: any) => {
  if (order.status === 'DRAFT') return 'Issue Materials'
  if (order.status === 'IN_PROGRESS' || order.status === 'MATERIAL_ISSUED') return 'Complete Batch'
  if (order.status === 'COMPLETED') return 'Completed'
  return 'Open'
}

const compactBatchActionLabel = (action: string) => {
  if (action === 'Issue Materials') return 'Issue'
  if (action === 'Complete Batch') return 'Complete'
  return action
}

export default function ProductionOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [finishedGoods, setFinishedGoods] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BatchStatus>('ALL')
  const [articleFilter, setArticleFilter] = useState('ALL')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionSaving, setActionSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ finishedGoodId: '', quantityPlanned: '1', notes: '' })
  const [editBatch, setEditBatch] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ finishedGoodId: '', quantityPlanned: '1', notes: '' })
  const [completionBatch, setCompletionBatch] = useState<any | null>(null)
  const [completionForm, setCompletionForm] = useState({ quantityProduced: '1', completionNote: '' })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [orderData, fgData] = await Promise.all([
        api.get('/production'),
        api.get('/inventory/finished-goods'),
      ])
      setOrders(Array.isArray(orderData) ? orderData : [])
      setFinishedGoods(Array.isArray((fgData as any)?.items) ? (fgData as any).items : Array.isArray(fgData) ? fgData : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load production batches.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const batchStats = useMemo(() => {
    const inProgress = orders.filter((order) => order.status === 'IN_PROGRESS' || order.status === 'MATERIAL_ISSUED').length
    return [
      { label: 'Total Batches', value: orders.length },
      { label: 'Draft', value: orders.filter((order) => order.status === 'DRAFT').length, tone: 'warning' as const },
      { label: 'In Progress', value: inProgress, tone: 'warning' as const },
      { label: 'Completed', value: orders.filter((order) => order.status === 'COMPLETED').length, tone: 'success' as const },
      { label: 'Ready to issue', value: orders.filter((order) => order.status === 'DRAFT').length },
      { label: 'Ready to complete', value: inProgress },
    ]
  }, [orders])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = q
        ? [order.orderNumber, order.finishedGoodName, order.status, order.notes]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        : true
      const matchesStatus = statusFilter === 'ALL' ? true : order.status === statusFilter
      const matchesArticle = articleFilter === 'ALL' ? true : order.finishedGoodId === articleFilter
      const matchesQuick =
        quickFilter === 'READY_TO_ISSUE'
          ? order.status === 'DRAFT'
          : quickFilter === 'READY_TO_COMPLETE'
            ? order.status === 'IN_PROGRESS' || order.status === 'MATERIAL_ISSUED'
            : true
      return matchesSearch && matchesStatus && matchesArticle && matchesQuick
    })
  }, [articleFilter, orders, quickFilter, search, statusFilter])

  const createOrder = async () => {
    if (!form.finishedGoodId) {
      setError('Article is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.post('/production', {
        finishedGoodId: form.finishedGoodId,
        quantityPlanned: Number(form.quantityPlanned || 1),
        notes: form.notes || undefined,
      })
      setForm({ finishedGoodId: '', quantityPlanned: '1', notes: '' })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to create production batch.')
    } finally {
      setSaving(false)
    }
  }

  const issueOrder = async (id: string) => {
    setActionSaving(`issue:${id}`)
    setError(null)
    try {
      await api.post(`/production/${id}/issue`, { issueReason: 'materials-issued-from-batch-register' })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to issue production batch. Check raw-material stock for this article.')
    } finally {
      setActionSaving(null)
    }
  }

  const openEditBatch = (order: any) => {
    setEditBatch(order)
    setEditForm({
      finishedGoodId: order.finishedGoodId || order.finishedGood?.id || '',
      quantityPlanned: String(order.quantityPlanned ?? 1),
      notes: order.notes || '',
    })
  }

  const saveEditBatch = async () => {
    if (!editBatch) return
    setActionSaving(`edit:${editBatch.id}`)
    setError(null)
    try {
      await api.put(`/production/${editBatch.id}`, {
        finishedGoodId: editForm.finishedGoodId,
        quantityPlanned: Number(editForm.quantityPlanned || 1),
        notes: editForm.notes || undefined,
      })
      setEditBatch(null)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to edit production batch.')
    } finally {
      setActionSaving(null)
    }
  }

  const deleteBatch = async (order: any) => {
    if (!window.confirm(`Delete draft batch ${order.orderNumber || order.id}?`)) return
    setActionSaving(`delete:${order.id}`)
    setError(null)
    try {
      await api.delete(`/production/${order.id}`)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete production batch.')
    } finally {
      setActionSaving(null)
    }
  }

  const openCompletion = (order: any) => {
    const remaining = Math.max(Number(order.quantityPlanned ?? 0) - Number(order.quantityProduced ?? 0), 1)
    setCompletionBatch(order)
    setCompletionForm({ quantityProduced: String(remaining), completionNote: '' })
  }

  const completeOrder = async () => {
    if (!completionBatch) return
    setActionSaving(`complete:${completionBatch.id}`)
    setError(null)
    try {
      await api.post(`/production/${completionBatch.id}/complete`, {
        quantityProduced: Number(completionForm.quantityProduced || 0),
        completionNote: completionForm.completionNote || 'completed-from-batch-register',
      })
      setCompletionBatch(null)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to complete production batch.')
    } finally {
      setActionSaving(null)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Production"
      title="Production Batches"
      description="Make articles in planned batches, issue raw materials when cutting starts, and add finished article stock on completion."
      actions={[
        { label: 'Materials', variant: 'outline', to: '/inventory/materials' },
        { label: 'Articles', variant: 'secondary', to: '/inventory/finished-goods' },
      ]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <InventoryStatGrid stats={batchStats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <InventorySectionCard title="Create Batch" description="Plan a stock batch for one sellable article.">
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Article</span>
              <select value={form.finishedGoodId} onChange={(event) => setForm({ ...form, finishedGoodId: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="">Select article</option>
                {finishedGoods.map((fg) => <option key={fg.id} value={fg.id}>{fg.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Planned quantity</span>
              <input type="number" min="1" value={form.quantityPlanned} onChange={(event) => setForm({ ...form, quantityPlanned: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Batch notes</span>
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Cutting lot, size run, color, or operator notes" />
            </label>
            <Button type="button" onClick={createOrder} isLoading={saving}>
              Create Batch
            </Button>
          </div>
        </InventorySectionCard>

        <InventorySectionCard title="Batch Register" description="Filter batches by status, article, or next factory action.">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_160px_180px]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, article, notes" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BatchStatus)} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
              {['ALL', 'DRAFT', 'IN_PROGRESS', 'MATERIAL_ISSUED', 'COMPLETED', 'CANCELLED'].map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'All statuses' : statusLabel(status)}</option>
              ))}
            </select>
            <select value={articleFilter} onChange={(event) => setArticleFilter(event.target.value)} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
              <option value="ALL">All articles</option>
              {finishedGoods.map((fg) => <option key={fg.id} value={fg.id}>{fg.name}</option>)}
            </select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setQuickFilter('ALL')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${quickFilter === 'ALL' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
              All batches
            </button>
            <button type="button" onClick={() => setQuickFilter('READY_TO_ISSUE')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${quickFilter === 'READY_TO_ISSUE' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
              Ready to issue
            </button>
            <button type="button" onClick={() => setQuickFilter('READY_TO_COMPLETE')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${quickFilter === 'READY_TO_COMPLETE' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
              Ready to complete
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading production batches...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">No production batches match the current filters.</div>
          ) : (
            <div className="min-w-[720px]">
            <InventoryDataTable
              caption="Production batches"
              columns={[
                { label: 'Batch & article', className: 'min-w-[260px] px-3' },
                { label: 'Plan / done', className: 'w-28 px-3 text-center' },
                { label: 'Status', className: 'w-36 px-3' },
                { label: 'Created', className: 'w-36 px-3' },
                { label: 'Action', className: 'w-56 px-3 text-right' },
              ]}
            >
              {filteredOrders.map((order) => {
                const nextAction = nextActionForBatch(order)
                const articleName = order.finishedGoodName || order.finishedGood?.name || '-'
                const createdDate = formatNepaliDate(order.createdAt)
                return (
                  <tr key={order.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="px-3 py-3 align-middle">
                      <button type="button" className="max-w-[220px] truncate font-semibold text-slate-900 hover:text-blue-700" onClick={() => navigate(`/inventory/production/${order.id}`)} title={order.orderNumber || order.id}>
                        {order.orderNumber || order.id}
                      </button>
                      <div className="mt-1 max-w-[260px] truncate font-medium text-slate-700" title={articleName}>{articleName}</div>
                      {order.notes ? <div className="mt-1 max-w-[260px] truncate text-xs text-slate-500" title={order.notes}>{order.notes}</div> : null}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="font-semibold text-slate-900">{Number(order.quantityPlanned ?? 0)}</div>
                      <div className="text-xs text-slate-500">{Number(order.quantityProduced ?? 0)} done</div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-middle text-slate-600">{createdDate}</td>
                    <td className="px-3 py-3 align-middle">
                      {nextAction === 'Issue Materials' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" className="min-w-16" onClick={() => openEditBatch(order)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="min-w-16" onClick={() => deleteBatch(order)} isLoading={actionSaving === `delete:${order.id}`}>
                            Delete
                          </Button>
                          <Button type="button" size="sm" className="min-w-16" onClick={() => issueOrder(order.id)} isLoading={actionSaving === `issue:${order.id}`}>
                            {compactBatchActionLabel(nextAction)}
                          </Button>
                        </div>
                      ) : nextAction === 'Complete Batch' ? (
                        <div className="flex justify-end">
                        <Button type="button" size="sm" className="min-w-24" onClick={() => openCompletion(order)}>
                          {compactBatchActionLabel(nextAction)}
                        </Button>
                        </div>
                      ) : nextAction === 'Completed' ? (
                        <div className="flex justify-end">
                          <span className="inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Completed</span>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/production/${order.id}`)}>
                            {compactBatchActionLabel(nextAction)}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </InventoryDataTable>
            </div>
          )}
        </InventorySectionCard>
      </div>

      <Modal isOpen={Boolean(editBatch)} onClose={() => setEditBatch(null)} title="Edit Batch" size="md">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Article</span>
            <select value={editForm.finishedGoodId} onChange={(event) => setEditForm({ ...editForm, finishedGoodId: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="">Select article</option>
              {finishedGoods.map((fg) => <option key={fg.id} value={fg.id}>{fg.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Planned quantity</span>
            <input type="number" min="1" value={editForm.quantityPlanned} onChange={(event) => setEditForm({ ...editForm, quantityPlanned: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Batch notes</span>
            <textarea value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditBatch(null)}>Cancel</Button>
            <Button type="button" onClick={saveEditBatch} isLoading={actionSaving === `edit:${editBatch?.id}`}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(completionBatch)} onClose={() => setCompletionBatch(null)} title="Complete Batch" size="md">
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{completionBatch?.finishedGoodName || completionBatch?.finishedGood?.name || 'Article'}</div>
            <div>Planned quantity: {Number(completionBatch?.quantityPlanned ?? 0)}</div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Produced quantity</span>
            <input
              type="number"
              min="1"
              max={Number(completionBatch?.quantityPlanned ?? 0) || undefined}
              value={completionForm.quantityProduced}
              onChange={(event) => setCompletionForm({ ...completionForm, quantityProduced: event.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Completion note</span>
            <textarea value={completionForm.completionNote} onChange={(event) => setCompletionForm({ ...completionForm, completionNote: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Optional completion note" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCompletionBatch(null)}>Cancel</Button>
            <Button type="button" onClick={completeOrder} isLoading={actionSaving === `complete:${completionBatch?.id}`}>
              Complete Batch
            </Button>
          </div>
        </div>
      </Modal>
    </InventoryPageShell>
  )
}
