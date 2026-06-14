import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, RefreshCw, Search } from 'lucide-react'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { salesInvoiceApi, SalesInvoice, SalesPaymentStatus } from '../../services/salesInvoiceApi'

type PaymentRow = {
  id: string
  invoiceId: string
  invoiceNumber?: string | null
  customerName: string
  amount: number | string
  paymentDate?: string | null
  paymentMethod?: string | null
  note?: string | null
  invoiceStatus?: string | null
  paymentStatus?: string | null
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesPaymentStatus | 'ALL'>('ALL')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await salesInvoiceApi.list()
      setInvoices(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const payments = useMemo<PaymentRow[]>(() => {
    const rows: PaymentRow[] = []
    for (const invoice of invoices) {
      for (const payment of invoice.payments || []) {
        rows.push({
          id: payment.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer?.customerName || invoice.customerName || 'Walk-in customer',
          amount: payment.amount,
          paymentDate: payment.paymentDate || payment.createdAt || null,
          paymentMethod: payment.paymentMethod || payment.method || null,
          note: payment.note || payment.notes || null,
          invoiceStatus: invoice.invoiceStatus || null,
          paymentStatus: invoice.paymentStatus || null,
        })
      }
    }
    return rows
  }, [invoices])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return payments.filter((payment) => {
      const haystack = [payment.invoiceNumber, payment.customerName, payment.paymentMethod, payment.note].filter(Boolean).join(' ').toLowerCase()
      const matchesStatus = statusFilter === 'ALL' ? true : payment.paymentStatus === statusFilter
      return matchesStatus && (query ? haystack.includes(query) : true)
    })
  }, [payments, search, statusFilter])

  const stats = useMemo(() => {
    const total = filtered.length
    const collected = filtered.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const invoicesPaid = invoices.filter((invoice) => invoice.paymentStatus === 'PAID').length
    return [
      { label: 'Payments shown', value: total },
      { label: 'Collected', value: money(collected), tone: 'success' as const },
      { label: 'Paid invoices', value: invoicesPaid, tone: 'success' as const },
      { label: 'Outstanding invoices', value: invoices.filter((invoice) => Number(invoice.dueAmount ?? 0) > 0).length, tone: 'warning' as const },
    ]
  }, [filtered, invoices])

  return (
    <InventoryPageShell
      eyebrow="Finance"
      title="Payments"
      description="A register of invoice payments recorded through the sales-invoice workflow."
      actions={[{ label: 'Refresh', variant: 'outline', onClick: load }]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <InventoryStatGrid stats={stats} />

      <InventorySectionCard title="Payment Register" description="Search payments by invoice, customer, method, or note.">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search payments" />
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SalesPaymentStatus | 'ALL')} className="bg-transparent outline-none">
              {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map((option) => (
                <option key={option} value={option}>{option === 'ALL' ? 'All payment states' : option}</option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
            No payments match the current filters.
          </div>
        ) : (
          <InventoryDataTable
            caption="Payment register"
            columns={[{ label: 'Invoice' }, { label: 'Customer' }, { label: 'Date' }, { label: 'Amount' }, { label: 'Method' }, { label: 'Actions' }]}
          >
            {filtered.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                <td className="px-3 py-4 align-top font-semibold text-slate-900">{payment.invoiceNumber || payment.invoiceId}</td>
                <td className="px-3 py-4 align-top text-slate-700">{payment.customerName}</td>
                <td className="px-3 py-4 align-top text-slate-600">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(payment.amount)}</td>
                <td className="px-3 py-4 align-top text-slate-700">{payment.paymentMethod || '-'}</td>
                <td className="px-3 py-4 align-top">
                  <Link to={`/sales-invoices/${payment.invoiceId}`} className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    View Invoice
                  </Link>
                </td>
              </tr>
            ))}
          </InventoryDataTable>
        )}
      </InventorySectionCard>
    </InventoryPageShell>
  )
}
