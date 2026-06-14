import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'

export default function ProductionOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [finishedGoods, setFinishedGoods] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ finishedGoodId: '', quantityPlanned: '1', notes: '' })

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
      setError(err?.message || 'Failed to load production orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((order) =>
      [order.orderNumber, order.finishedGoodName, order.status, order.notes].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [orders, search])

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
      setError(err?.message || 'Failed to create production order.')
    } finally {
      setSaving(false)
    }
  }

  const issueOrder = async (id: string) => {
    try {
      await api.post(`/production/${id}/issue`, { issueReason: 'manual-issue' })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to issue production order.')
    }
  }

  const completeOrder = async (id: string, quantityProduced: number) => {
    try {
      await api.post(`/production/${id}/complete`, { quantityProduced, completionNote: 'manual-complete' })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to complete production order.')
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Production"
      title="Production Orders"
      description="Issue raw materials when production starts and add articles only on completion."
      actions={[{ label: 'Materials', variant: 'outline', to: '/inventory/materials' }]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <InventorySectionCard title="New Production Order" description="Single article output per order.">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Article</span>
              <select value={form.finishedGoodId} onChange={(e) => setForm({ ...form, finishedGoodId: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                <option value="">Select article</option>
                {finishedGoods.map((fg) => <option key={fg.id} value={fg.id}>{fg.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Planned Quantity</span>
              <input type="number" min="1" value={form.quantityPlanned} onChange={(e) => setForm({ ...form, quantityPlanned: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <Button type="button" onClick={createOrder} isLoading={saving}>Create Production Order</Button>
          </div>
        </InventorySectionCard>

        <InventorySectionCard title="Production Register" description="Issue material first, then complete to add articles.">
          <div className="mb-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search production orders" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:w-72" />
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading production orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No production orders yet.</div>
          ) : (
          <InventoryDataTable caption="Production orders" columns={[{ label: 'Order' }, { label: 'Article' }, { label: 'Qty' }, { label: 'Status' }, { label: 'Actions' }]}>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4 font-semibold text-slate-900">
                    <button type="button" className="text-left hover:text-blue-700" onClick={() => navigate(`/inventory/production/${order.id}`)}>
                      {order.orderNumber || order.id}
                    </button>
                  </td>
                  <td className="px-3 py-4 text-slate-700">{order.finishedGoodName}</td>
                  <td className="px-3 py-4 text-slate-700">{Number(order.quantityPlanned ?? 0)}</td>
                  <td className="px-3 py-4 text-slate-700">{order.status}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => issueOrder(order.id)}>Issue</Button>
                      <Button type="button" size="sm" onClick={() => completeOrder(order.id, Number(order.quantityPlanned ?? 0))}>Complete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </InventoryDataTable>
          )}
        </InventorySectionCard>
      </div>
    </InventoryPageShell>
  )
}
