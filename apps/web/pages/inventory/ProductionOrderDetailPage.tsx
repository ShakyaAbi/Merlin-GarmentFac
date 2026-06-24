import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function ProductionOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [finishedGoods, setFinishedGoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ finishedGoodId: '', quantityPlanned: '1', notes: '' })

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [orderData, fgData] = await Promise.all([
        api.get(`/production/${id}`),
        api.get('/inventory/finished-goods'),
      ])
      setOrder(orderData)
      setFinishedGoods(Array.isArray((fgData as any)?.items) ? (fgData as any).items : Array.isArray(fgData) ? fgData : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load production batch.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const issue = async () => {
    if (!id) return
    setSaving('issue')
    setError(null)
    try {
      await api.post(`/production/${id}/issue`, { issueReason: 'manual-issue' })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to issue production batch.')
    } finally {
      setSaving(null)
    }
  }

  const complete = async () => {
    if (!id || !order) return
    setSaving('complete')
    setError(null)
    try {
      await api.post(`/production/${id}/complete`, {
        quantityProduced: Number(order.quantityPlanned ?? 0),
        completionNote: 'manual-complete',
      })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to complete production batch.')
    } finally {
      setSaving(null)
    }
  }

  const openEditBatch = () => {
    if (!order) return
    setEditForm({
      finishedGoodId: order.finishedGoodId || order.finishedGood?.id || '',
      quantityPlanned: String(order.quantityPlanned ?? 1),
      notes: order.notes || '',
    })
    setShowEdit(true)
  }

  const saveEditBatch = async () => {
    if (!id) return
    setSaving('edit')
    setError(null)
    try {
      await api.put(`/production/${id}`, {
        finishedGoodId: editForm.finishedGoodId,
        quantityPlanned: Number(editForm.quantityPlanned || 1),
        notes: editForm.notes || undefined,
      })
      setShowEdit(false)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to edit production batch.')
    } finally {
      setSaving(null)
    }
  }

  const deleteBatch = async () => {
    if (!id || !order) return
    if (!window.confirm(`Delete draft batch ${order.orderNumber || order.id}?`)) return
    setSaving('delete')
    setError(null)
    try {
      await api.delete(`/production/${id}`)
      navigate('/inventory/production')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete production batch.')
    } finally {
      setSaving(null)
    }
  }

  const bomItems = Array.isArray(order?.finishedGood?.bomData?.items) ? order.finishedGood.bomData.items : []
  const estimatedMaterialCost = bomItems.reduce((sum: number, item: any) => {
    const unitCost = Number(item.rawMaterial?.costPrice ?? item.rawMaterial?.averageUnitCost ?? 0)
    const consumption = Number(item.consumption ?? 0)
    return sum + unitCost * consumption * Number(order.quantityPlanned ?? 0)
  }, 0)
  const isDraft = order?.status === 'DRAFT'
  const canComplete = order?.status === 'IN_PROGRESS' || order?.status === 'MATERIAL_ISSUED'
  const pageActions = [
    ...(isDraft ? [
      { label: 'Edit Batch', variant: 'outline' as const, onClick: openEditBatch },
      { label: 'Delete Batch', variant: 'outline' as const, onClick: deleteBatch },
      { label: 'Issue Materials', onClick: issue },
    ] : []),
    ...(canComplete ? [{ label: 'Complete Batch', onClick: complete }] : []),
    { label: 'Register', variant: 'secondary' as const, to: '/inventory/production' },
  ]

  return (
    <>
      <InventoryPageShell
        eyebrow="Production"
        title={order?.orderNumber || 'Production Batch'}
        description="Review the material bill, raw-material issue, and finished article completion for this batch."
        backTo={{ to: '/inventory/production', label: 'Back to batch register' }}
        actions={pageActions}
      >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading production batch...</div>
      ) : order ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <InventorySectionCard title="Batch Summary" description="The operational record for this production run.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="font-medium text-slate-900">{order.status}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Planned quantity</div><div className="font-medium text-slate-900">{Number(order.quantityPlanned ?? 0)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Produced quantity</div><div className="font-medium text-slate-900">{Number(order.quantityProduced ?? 0)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Finished good</div><div className="font-medium text-slate-900">{order.finishedGoodName || order.finishedGood?.name || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Notes</div><div className="font-medium text-slate-900">{order.notes || '-'}</div></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Article Materials" description="Consumed materials are derived from the article's material bill.">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{order.finishedGood?.bomData?.garmentStyle || order.finishedGood?.bomData?.name || 'Unknown article bill'}</div>
                <div>Finished good unit: {order.finishedGood?.unit || 'pcs'}</div>
                <div>Finished good cost: {money(order.finishedGood?.costPrice)}</div>
                <div>Estimated material cost: {money(estimatedMaterialCost)}</div>
              </div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Material Issue Lines" description="Raw materials are only deducted when the order is issued.">
            <InventoryDataTable
              caption="Material issue lines"
              columns={[{ label: 'Material' }, { label: 'Qty' }, { label: 'Unit' }, { label: 'Consumption' }]}
            >
              {order.issueLines?.map((line: any) => (
                <tr key={line.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4 font-semibold text-slate-900">{line.rawMaterial?.name || line.rawMaterialId}</td>
                  <td className="px-3 py-4 text-slate-700">{Number(line.quantity ?? 0)}</td>
                  <td className="px-3 py-4 text-slate-700">{line.unit || '-'}</td>
                  <td className="px-3 py-4 text-slate-700">{Number(line.bomConsumption ?? 0)}</td>
                </tr>
              ))}
            </InventoryDataTable>
          </InventorySectionCard>

          <InventorySectionCard title="Completion Lines" description="Finished goods are recorded only on completion.">
            <InventoryDataTable
              caption="Completion lines"
              columns={[{ label: 'Article' }, { label: 'Qty' }, { label: 'Unit' }]}
            >
              {order.completionLines?.map((line: any) => (
                <tr key={line.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4 font-semibold text-slate-900">{line.finishedGood?.name || line.finishedGoodId}</td>
                  <td className="px-3 py-4 text-slate-700">{Number(line.quantity ?? 0)}</td>
                  <td className="px-3 py-4 text-slate-700">{line.unit || '-'}</td>
                </tr>
              ))}
            </InventoryDataTable>
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Production batch not found.</div>
      )}
      </InventoryPageShell>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Batch" size="md">
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
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="button" onClick={saveEditBatch} isLoading={saving === 'edit'}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
