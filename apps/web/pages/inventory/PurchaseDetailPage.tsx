import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { InvoicePaperDocument } from '../../components/invoices/InvoicePaperDocument'
import { buildPurchaseInvoicePaperDocumentProps } from '../../components/invoices/invoicePaperDocumentHelpers'
import { calculateInvoiceTotals } from '../../components/invoices/invoiceTotals'

const money = (value: number | string | null | undefined, currency = 'NPR') =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: currency || 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-')

export default function PurchaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [purchase, setPurchase] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setPurchase(await api.get(`/inventory/purchases/${id}`))
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const summary = useMemo(() => {
    const items = purchase?.items || []
    return calculateInvoiceTotals({
      lines: items.map((item: any) => ({
        id: item.id,
        quantity: Number(item.quantity ?? 0),
        rate: Number(item.unitPrice ?? 0),
        amount: Number(item.lineTotal ?? Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)),
      })),
    })
  }, [purchase])

  const paperDocument = useMemo(() => buildPurchaseInvoicePaperDocumentProps(purchase), [purchase])

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title={purchase?.invoiceNumber || purchase?.id || 'Purchase Invoice'}
      description="Purchase invoice, supplier link, and raw-material stock receipt."
      backTo={{ to: '/inventory/purchases', label: 'Back to purchases' }}
      actions={[
        { label: 'Repeat Purchase', variant: 'outline', onClick: () => navigate(`/inventory/purchases/create?material=${purchase?.items?.[0]?.rawMaterialId || ''}`) },
        { label: 'Register', variant: 'secondary', to: '/inventory/purchases' },
      ]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading purchase...</div>
      ) : purchase ? (
        <div className="space-y-6">
          <InventorySectionCard title="Paper Invoice" description="Shared paper-style invoice layout for purchase documents.">
            {paperDocument ? <InvoicePaperDocument {...paperDocument} /> : null}
          </InventorySectionCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <InventorySectionCard title="Purchase Summary" description="Core purchase document fields.">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Supplier</div><div className="font-semibold text-slate-900">{purchase.supplier?.name || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Invoice Number</div><div className="font-semibold text-slate-900">{purchase.invoiceNumber || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Invoice Date</div><div className="font-semibold text-slate-900">{formatDate(purchase.invoiceDate)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="font-semibold text-slate-900">{purchase.status || '-'}</div></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Totals" description="Document amount and currency.">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Currency</div><div className="font-semibold text-slate-900">{purchase.currency || 'NPR'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Debit</div><div className="font-semibold text-rose-700">{money(summary.grandTotal, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Credit</div><div className="font-semibold text-emerald-700">{money(0, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Grand Total</div><div className="font-semibold text-slate-900">{money(summary.grandTotal, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">VAT 13%</div><div className="font-semibold text-slate-900">{money(summary.taxAmount, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Created At</div><div className="font-semibold text-slate-900">{formatDate(purchase.createdAt)}</div></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Notes" description="Document remarks and receiving context.">
              <div className="text-sm text-slate-700">{purchase.notes || 'No notes provided.'}</div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Purchase Items" description="Raw materials received on this document.">
            <InventoryDataTable
              caption="Purchase items"
              columns={[{ label: 'Material' }, { label: 'Qty' }, { label: 'Unit' }, { label: 'Unit Price' }, { label: 'Line Total' }]}
            >
              {purchase.items?.map((item: any) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4">
                    <div className="font-semibold text-slate-900">{item.rawMaterial?.name || item.rawMaterialId}</div>
                    <div className="text-xs text-slate-500">{item.rawMaterial?.sku || item.rawMaterial?.defaultUnit || '-'}</div>
                  </td>
                  <td className="px-3 py-4 text-slate-700">{Number(item.quantity ?? 0)}</td>
                  <td className="px-3 py-4 text-slate-700">{item.unit || '-'}</td>
                  <td className="px-3 py-4 text-slate-700">{money(item.unitPrice, purchase.currency || 'NPR')}</td>
                  <td className="px-3 py-4 text-slate-700">{money(item.lineTotal, purchase.currency || 'NPR')}</td>
                </tr>
              ))}
            </InventoryDataTable>
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Purchase not found.</div>
      )}
    </InventoryPageShell>
  )
}
