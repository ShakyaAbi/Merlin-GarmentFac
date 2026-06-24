import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileDown, Filter, RefreshCw, Search } from 'lucide-react'
import { salesInvoiceApi, SalesInvoice, SalesInvoiceStatus, SalesPaymentStatus } from '../../services/salesInvoiceApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { formatNepaliDate } from '../../utils/nepaliDate'
import { filterSalesInvoices } from '../../utils/salesInvoiceFilters'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => formatNepaliDate(value)

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'ISSUED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'PARTIAL':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'UNPAID':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export default function SalesInvoiceListPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesInvoiceStatus | 'ALL'>('ALL')
  const [paymentFilter, setPaymentFilter] = useState<SalesPaymentStatus | 'ALL'>('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await salesInvoiceApi.list({ pageSize: 500 })
      setInvoices(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load sales invoices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [])

  const filteredInvoices = useMemo(() => {
    return filterSalesInvoices(invoices, { search, statusFilter, paymentFilter, fromDate, toDate })
  }, [fromDate, invoices, paymentFilter, search, statusFilter, toDate])

  const hasActiveFilters = search.trim() || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || fromDate || toDate

  const applyTodayFilter = () => {
    const today = toDateInputValue(new Date())
    setFromDate(today)
    setToDate(today)
  }

  const applyThisMonthFilter = () => {
    const now = new Date()
    setFromDate(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)))
    setToDate(toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setPaymentFilter('ALL')
    setFromDate('')
    setToDate('')
  }

  const stats = useMemo(() => {
    const total = filteredInvoices.length
    const draft = filteredInvoices.filter((invoice) => invoice.invoiceStatus === 'DRAFT').length
    const issued = filteredInvoices.filter((invoice) => invoice.invoiceStatus === 'ISSUED').length
    const dueInvoices = filteredInvoices.filter((invoice) => Number(invoice.dueAmount ?? 0) > 0).length
    const grandTotal = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal ?? 0), 0)

    return [
      { label: 'Invoices shown', value: total },
      { label: 'Draft invoices', value: draft, tone: 'warning' as const },
      { label: 'Issued invoices', value: issued, tone: 'success' as const },
      { label: 'Open balance', value: money(filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount ?? 0), 0)), tone: 'warning' as const },
      { label: 'Total value', value: money(grandTotal) },
      { label: 'Invoices with balance due', value: dueInvoices, tone: 'warning' as const },
    ]
  }, [filteredInvoices])

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await salesInvoiceApi.export({ search, status: statusFilter, paymentStatus: paymentFilter })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'merlin-sales-invoices.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.message || 'Failed to export invoices.')
    } finally {
      setExporting(false)
    }
  }

  const statusOptions: Array<SalesInvoiceStatus | 'ALL'> = ['ALL', 'DRAFT', 'PENDING_APPROVAL', 'ISSUED', 'CANCELLED']
  const paymentOptions: Array<SalesPaymentStatus | 'ALL'> = ['ALL', 'UNPAID', 'PARTIAL', 'PAID']

  return (
    <InventoryPageShell
      eyebrow="Sales"
      title="Sales Invoices"
      description="Invoice articles, track collections, and keep the sales workflow native to Merlin."
      actions={[
        { label: 'Export', variant: 'outline', onClick: handleExport },
        { label: 'New Invoice', to: '/sales-invoices/create' },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <InventorySectionCard
          title="Invoice Register"
          description="Search by invoice number, customer, remark, or article line item."
        >
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(170px,220px)_minmax(170px,220px)_150px_150px]">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search invoices"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
                <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as SalesInvoiceStatus | 'ALL')}
                  className="w-full bg-transparent outline-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'ALL' ? 'All statuses' : option.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
                <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value as SalesPaymentStatus | 'ALL')}
                  className="w-full bg-transparent outline-none"
                >
                  {paymentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'ALL' ? 'All payment states' : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">From date</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="From date"
                />
              </label>
              <label className="block">
                <span className="sr-only">To date</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="To date"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={applyTodayFilter}>
                Today
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={applyThisMonthFilter}>
                This Month
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={loadInvoices}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              {fromDate || toDate ? (
                <span className="flex items-center text-xs text-slate-500">
                  Date range: {fromDate ? formatDate(fromDate) : 'Any'} to {toDate ? formatDate(toDate) : 'Any'}
                </span>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500" role="status" aria-live="polite">
              Loading sales invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
              {hasActiveFilters ? 'No invoices match the current filters.' : 'No sales invoices yet. Start with a new invoice.'}
            </div>
          ) : (
            <InventoryDataTable
              caption="Sales invoice register"
              columns={[
                { label: 'Invoice', className: 'px-3' },
                { label: 'Customer', className: 'px-3' },
                { label: 'Date', className: 'px-3' },
                { label: 'Grand Total', className: 'px-3' },
                { label: 'Paid', className: 'px-3' },
                { label: 'Due', className: 'px-3' },
                { label: 'Payment', className: 'px-3' },
                { label: 'Status', className: 'px-3' },
                { label: 'Actions', className: 'px-3' },
              ]}
            >
              {filteredInvoices.map((invoice) => {
                const customerName = invoice.customer?.customerName || invoice.customerName || 'Walk-in customer'
                return (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-3 py-4 align-top">
                      <div className="font-semibold text-slate-900">{invoice.invoiceNumber || invoice.id}</div>
                      <div className="text-xs text-slate-500">{invoice.fiscalYear || 'Unassigned fiscal year'}</div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="font-medium text-slate-900">{customerName}</div>
                      <div className="text-xs text-slate-500">{invoice.remarks || 'No remarks'}</div>
                    </td>
                    <td className="px-3 py-4 align-top text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(invoice.grandTotal)}</td>
                    <td className="px-3 py-4 align-top text-slate-700">{money(invoice.paidAmount)}</td>
                    <td className="px-3 py-4 align-top text-slate-700">{money(invoice.dueAmount)}</td>
                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(invoice.invoiceStatus)}`}>
                        {invoice.invoiceStatus || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/sales-invoices/${invoice.id}`}
                          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </InventoryDataTable>
          )}
        </InventorySectionCard>

        <div className="space-y-6">
          <InventorySectionCard title="Workflow" description="The sales invoice flow is centered on articles, not raw material purchases.">
            <div className="space-y-3 text-sm text-slate-600">
              <p>Draft invoices can be created and edited before issue.</p>
              <p>Issued invoices are the point at which article stock is consumed.</p>
              <p>Payments update the payment state without changing the invoice item structure.</p>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => navigate('/sales-invoices/create')}>
                New Invoice
              </Button>
              <Button type="button" variant="outline" onClick={loadInvoices}>
                Refresh Register
              </Button>
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
