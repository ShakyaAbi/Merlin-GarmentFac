import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { salesOrderApi, SalesOrder } from '../../services/salesOrderApi'
import { formatNepaliDate } from '../../utils/nepaliDate'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'FULFILLED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export default function SalesOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setOrder(await salesOrderApi.get(id))
    } catch (err: any) {
      setError(err?.message || 'Failed to load sales order.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrder()
  }, [id])

  const runAction = async (action: 'confirm' | 'fulfill' | 'invoice' | 'cancel') => {
    if (!id) return
    setBusy(action)
    setError(null)
    try {
      if (action === 'confirm') await salesOrderApi.confirm(id)
      if (action === 'fulfill') await salesOrderApi.fulfill(id)
      if (action === 'invoice') await salesOrderApi.invoice(id)
      if (action === 'cancel') await salesOrderApi.cancel(id, 'Cancelled from Merlin')
      await loadOrder()
    } catch (err: any) {
      setError(err?.message || 'Action failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Sales"
      title={order?.orderNumber || 'Sales Order'}
      description="Review the sales order, confirm it, or convert it to an invoice."
      backTo={{ to: '/sales-orders', label: 'Back to sales orders' }}
      actions={[
        { label: 'Invoice', variant: 'outline', onClick: () => void runAction('invoice') },
        { label: 'Confirm', variant: 'secondary', onClick: () => void runAction('confirm') },
        { label: 'Fulfill', onClick: () => void runAction('fulfill') },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading sales order...</div>
      ) : order ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{order.status}</span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {order.customer?.customerName || 'Unknown customer'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <InventorySectionCard title="Order Summary" description="Core values and customer context.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Order date</div>
                  <div className="font-medium text-slate-900">{formatNepaliDate(order.orderDate)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Required by</div>
                  <div className="font-medium text-slate-900">{formatNepaliDate(order.requiredBy)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Subtotal</div>
                  <div className="font-medium text-slate-900">{money(order.subtotal)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Grand total</div>
                  <div className="font-medium text-slate-900">{money(order.grandTotal)}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
                  <div className="font-medium text-slate-900">{order.notes || 'No notes'}</div>
                </div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Customer" description="The selected buyer for this order.">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{order.customer?.customerName || 'Unknown customer'}</div>
                <div>{order.customer?.phone || 'No phone'}</div>
                <div>{order.customer?.email || 'No email'}</div>
                <div>{order.customer?.customerType || 'No type'}</div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Button type="button" variant="outline" onClick={() => void runAction('cancel')} isLoading={busy === 'cancel'}>
                  Cancel
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/sales-invoices/create')}>
                  Create Invoice Screen
                </Button>
              </div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Line Items" description="Finished goods only.">
            <InventoryDataTable
              caption="Sales order lines"
              columns={[
                { label: 'Product' },
                { label: 'Qty' },
                { label: 'Unit Price' },
                { label: 'Line Total' },
              ]}
            >
              {order.items?.map((item) => (
                <tr key={item.id || item.productId} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4 align-top">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="text-xs text-slate-500">{item.productCode || item.productId}</div>
                  </td>
                  <td className="px-3 py-4 align-top text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-4 align-top text-slate-700">{money(item.unitPrice)}</td>
                  <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(item.lineTotal)}</td>
                </tr>
              ))}
            </InventoryDataTable>
          </InventorySectionCard>

          <InventorySectionCard title="Sales Impact" description="Sales orders do not move stock until they are invoiced.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Reserved value</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{money(order.grandTotal)}</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-500">Confirmed</div>
                <div className="mt-1 text-lg font-semibold text-emerald-700">{order.status === 'CONFIRMED' ? 'Yes' : 'No'}</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <div className="text-xs uppercase tracking-wide text-amber-500">Fulfilled</div>
                <div className="mt-1 text-lg font-semibold text-amber-700">{order.status === 'FULFILLED' ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
          Sales order not found.
        </div>
      )}
    </InventoryPageShell>
  )
}
