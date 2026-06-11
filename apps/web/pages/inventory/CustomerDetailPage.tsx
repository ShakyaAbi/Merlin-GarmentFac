import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    api.get(`/customers/${id}`)
      .then(setCustomer)
      .catch((err: any) => setError(err?.message || 'Failed to load customer.'))
      .finally(() => setLoading(false))
  }, [id])

  const invoices = useMemo(() => (Array.isArray(customer?.salesInvoices) ? customer.salesInvoices : []), [customer])
  const totalSales = useMemo(() => invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.grandTotal ?? 0), 0), [invoices])
  const openBalance = useMemo(() => invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.dueAmount ?? 0), 0), [invoices])

  return (
    <InventoryPageShell
      eyebrow="Sales Master"
      title={customer?.customerName || 'Customer'}
      description="Customer profile, invoice history, and account exposure."
      backTo={{ to: '/inventory/customers', label: 'Back to customers' }}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading customer...</div>
      ) : customer ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Invoices</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{invoices.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total sales</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(totalSales)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Open balance</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(openBalance)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <InventorySectionCard title="Customer Details" description="Core customer master data used in sales documents.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Phone</div><div className="font-medium text-slate-900">{customer.phone || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Email</div><div className="font-medium text-slate-900">{customer.email || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Type</div><div className="font-medium text-slate-900">{customer.customerType || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">PAN / VAT</div><div className="font-medium text-slate-900">{customer.panVatNumber || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Address</div><div className="font-medium text-slate-900">{customer.address || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Notes</div><div className="font-medium text-slate-900">{customer.notes || '-'}</div></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Account Snapshot" description="How much business and exposure this customer has in Merlin.">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>Invoices</span><span className="font-medium text-slate-900">{invoices.length}</span></div>
                <div className="flex items-center justify-between"><span>Total sales</span><span className="font-medium text-slate-900">{money(totalSales)}</span></div>
                <div className="flex items-center justify-between"><span>Open balance</span><span className="font-medium text-slate-900">{money(openBalance)}</span></div>
              </div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Invoice History" description="Linked sales invoices for this customer.">
            {invoices.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No invoices linked yet.</div>
            ) : (
              <InventoryDataTable
                caption="Customer invoice history"
                columns={[{ label: 'Invoice' }, { label: 'Date' }, { label: 'Total' }, { label: 'Due' }, { label: 'Status' }]}
              >
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{invoice.invoiceNumber || invoice.id}</td>
                    <td className="px-3 py-4 text-slate-600">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{money(invoice.grandTotal)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(invoice.dueAmount)}</td>
                    <td className="px-3 py-4 text-slate-700">{invoice.invoiceStatus || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Customer not found.</div>
      )}
    </InventoryPageShell>
  )
}
