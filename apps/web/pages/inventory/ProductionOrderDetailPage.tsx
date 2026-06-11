import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function ProductionOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setOrder(await api.get(`/production/${id}`))
    } catch (err: any) {
      setError(err?.message || 'Failed to load production order.')
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
      setError(err?.message || 'Failed to issue production order.')
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
      setError(err?.message || 'Failed to complete production order.')
    } finally {
      setSaving(null)
    }
  }

  const estimatedMaterialCost = Array.isArray(order?.bom?.items)
    ? order.bom.items.reduce((sum: number, item: any) => {
        const unitCost = Number(item.rawMaterial?.costPrice ?? item.rawMaterial?.averageUnitCost ?? 0)
        const consumption = Number(item.consumption ?? 0)
        return sum + unitCost * consumption * Number(order.quantityPlanned ?? 0)
      }, 0)
    : 0

  return (
    <InventoryPageShell
      eyebrow="Production"
      title={order?.orderNumber || 'Production Order'}
      description="Review the bill of materials, material issues, and finished-good completions for this order."
      backTo={{ to: '/inventory/production', label: 'Back to production register' }}
      actions={[
        { label: 'Issue Materials', variant: 'outline', onClick: issue },
        { label: 'Complete Order', onClick: complete },
        { label: 'Register', variant: 'secondary', to: '/inventory/production' },
      ]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading production order...</div>
      ) : order ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <InventorySectionCard title="Order Summary" description="The operational record for this production run.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="font-medium text-slate-900">{order.status}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Planned quantity</div><div className="font-medium text-slate-900">{Number(order.quantityPlanned ?? 0)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Produced quantity</div><div className="font-medium text-slate-900">{Number(order.quantityProduced ?? 0)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Finished good</div><div className="font-medium text-slate-900">{order.finishedGoodName || order.finishedGood?.name || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Notes</div><div className="font-medium text-slate-900">{order.notes || '-'}</div></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="BOM" description="Consumed materials are derived from the bill of materials.">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{order.bom?.garmentStyle || order.bom?.name || 'Unknown BOM'}</div>
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
              columns={[{ label: 'Finished Good' }, { label: 'Qty' }, { label: 'Unit' }]}
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
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Production order not found.</div>
      )}
    </InventoryPageShell>
  )
}
