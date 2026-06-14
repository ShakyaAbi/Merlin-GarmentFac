import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { partyLedgerApi } from '../../services/partyLedgerApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<any | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [ledgerSummary, setLedgerSummary] = useState<any | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([api.get(`/customers/${id}`), partyLedgerApi.getCustomerLedger(id)])
      .then(([customerData, ledgerData]) => {
        setCustomer(customerData)
        setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
        setLedgerSummary(ledgerData?.summary || null)
      })
      .catch((err: any) => setError(err?.message || 'Failed to load customer.'))
      .finally(() => setLoading(false))
  }, [id])

  const invoices = useMemo(() => (Array.isArray(customer?.salesInvoices) ? customer.salesInvoices : []), [customer])
  const filteredInvoices = useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase()
    if (!query) return invoices

    return invoices.filter((invoice: any) => {
      const haystack = [
        invoice.invoiceNumber,
        invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '',
        invoice.invoiceStatus,
        invoice.paymentStatus,
        invoice.grandTotal,
        invoice.dueAmount,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [invoiceSearch, invoices])
  const totalSales = Number(ledgerSummary?.totalInvoiced ?? customer?.summary?.totalInvoiced ?? 0)
  const openBalance = Number(ledgerSummary?.outstandingAmount ?? customer?.summary?.outstandingAmount ?? 0)
  const totalPaid = Number(ledgerSummary?.totalPaid ?? customer?.summary?.totalPaid ?? 0)
  const currentBalance = Number(ledgerSummary?.currentBalance ?? customer?.summary?.currentBalance ?? openBalance)
  const customerNumber = customer?.customerNumber || '-'
  const filteredLedgerEntries = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase()
    if (!q) return ledgerEntries
    return ledgerEntries.filter((entry: any) =>
      [entry.entryType, entry.documentNumber, entry.description, entry.referenceType, entry.referenceId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [ledgerEntries, ledgerSearch])

  return (
    <InventoryPageShell
      eyebrow="Sales Master"
      title={customer?.customerName || 'Customer Ledger'}
      description="Customer profile, sales history, payment history, and running ledger balance."
      backTo={{ to: '/inventory/customers', label: 'Back to customers' }}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading customer...</div>
      ) : customer ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Invoices</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{invoices.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total sales</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(totalSales)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total paid</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{money(totalPaid)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Current balance</div>
              <div className="mt-1 text-2xl font-bold text-amber-700">{money(currentBalance)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <InventorySectionCard title="Customer Details" description="Core customer master data used in sales documents.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Customer Number</div><div className="font-medium text-slate-900">{customerNumber}</div></div>
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
                <div className="flex items-center justify-between"><span>Total paid</span><span className="font-medium text-slate-900">{money(totalPaid)}</span></div>
                <div className="flex items-center justify-between"><span>Outstanding amount</span><span className="font-medium text-slate-900">{money(openBalance)}</span></div>
                <div className="flex items-center justify-between"><span>Running balance</span><span className="font-medium text-slate-900">{money(currentBalance)}</span></div>
                <div className="flex items-center justify-between"><span>Last invoice</span><span className="font-medium text-slate-900">{ledgerSummary?.lastInvoiceDate ? new Date(ledgerSummary.lastInvoiceDate).toLocaleDateString() : '-'}</span></div>
                <div className="flex items-center justify-between"><span>Last payment</span><span className="font-medium text-slate-900">{ledgerSummary?.lastPaymentDate ? new Date(ledgerSummary.lastPaymentDate).toLocaleDateString() : '-'}</span></div>
              </div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Invoice History" description="Linked sales invoices for this customer.">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                Search by invoice number, date, status, payment status, or amount.
              </div>
              <input
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="Search invoices"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
              />
            </div>
            {filteredInvoices.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No invoices linked yet.</div>
            ) : (
              <InventoryDataTable
                caption="Customer invoice history"
                columns={[{ label: 'Invoice' }, { label: 'Date' }, { label: 'Debit' }, { label: 'Credit' }, { label: 'Due' }, { label: 'Status' }]}
              >
                {filteredInvoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{invoice.invoiceNumber || invoice.id}</td>
                    <td className="px-3 py-4 text-slate-600">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}</td>
                    <td className="px-3 py-4 text-rose-700">{money(invoice.grandTotal)}</td>
                    <td className="px-3 py-4 text-emerald-700">{money(0)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(invoice.dueAmount)}</td>
                    <td className="px-3 py-4 text-slate-700">{invoice.invoiceStatus || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Customer Ledger" description="Opening balance, issued sales invoices, payments received, and the running balance.">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">Search the ledger by document, type, or note.</div>
              <input
                value={ledgerSearch}
                onChange={(event) => setLedgerSearch(event.target.value)}
                placeholder="Search ledger"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
              />
            </div>
            {filteredLedgerEntries.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No ledger entries yet.</div>
            ) : (
              <InventoryDataTable
                caption="Customer ledger"
                columns={[{ label: 'Date' }, { label: 'Type' }, { label: 'Document' }, { label: 'Debit' }, { label: 'Credit' }, { label: 'Running Balance' }]}
              >
                {filteredLedgerEntries.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 text-slate-600">{entry.entryDate ? new Date(entry.entryDate).toLocaleDateString() : '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{String(entry.entryType || '').replaceAll('_', ' ')}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{entry.documentNumber || '-'}</td>
                    <td className="px-3 py-4 text-rose-700">{money(entry.debit)}</td>
                    <td className="px-3 py-4 text-emerald-700">{money(entry.credit)}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{money(entry.runningBalance)}</td>
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
