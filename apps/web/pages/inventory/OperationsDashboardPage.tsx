import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import { formatNepaliDate } from '../../utils/nepaliDate'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => formatNepaliDate(value)

type DashboardFilters = {
  from?: string
  to?: string
}

type TransactionRow = {
  id: string
  entryDate: string
  transactionType: string
  transactionKey: string
  name: string
  totalAmount: number
  recPaidAmount: number | null
  balanceAmount: number | null
  note?: string | null
  href?: string
  tone: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan'
}

function darkToneClass(tone: TransactionRow['tone']) {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
    case 'amber':
      return 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
    case 'rose':
      return 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20'
    case 'cyan':
      return 'bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20'
    default:
      return 'bg-white/5 text-zinc-200 ring-1 ring-white/10'
  }
}

function Panel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h2>
            {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

function StatCard({
  label,
  value,
  tone = 'slate',
  hint,
}: {
  label: string
  value: React.ReactNode
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan'
  hint?: React.ReactNode
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : tone === 'rose'
          ? 'text-rose-300'
          : tone === 'cyan'
            ? 'text-cyan-300'
            : 'text-zinc-100'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-2 text-xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  )
}

export default function OperationsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [partySearch, setPartySearch] = useState('')
  const [transactionType, setTransactionType] = useState('ALL')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFromDate, setAppliedFromDate] = useState('')
  const [appliedToDate, setAppliedToDate] = useState('')

  const loadDashboard = async (mode: 'initial' | 'refresh' = 'initial', filters?: DashboardFilters) => {
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const from = filters?.from ?? appliedFromDate
      const to = filters?.to ?? appliedToDate
      const query = new URLSearchParams()
      if (from) query.set('from', from)
      if (to) query.set('to', to)
      const data = await api.get(`/operations/summary${query.toString() ? `?${query.toString()}` : ''}`)
      setSummary(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load the reports page.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadDashboard('initial')
  }, [])

  const applyReportingPeriod = () => {
    setAppliedFromDate(fromDate)
    setAppliedToDate(toDate)
    void loadDashboard('refresh', { from: fromDate, to: toDate })
  }

  const stats = useMemo(() => {
    const counts = summary?.counts || {}
    const moneyData = summary?.money || {}
    return [
      { label: 'Raw materials', value: counts.materials || 0, tone: 'cyan' as const },
      { label: 'Articles', value: counts.finishedGoods || 0, tone: 'emerald' as const },
      { label: 'Suppliers', value: counts.suppliers || 0, tone: 'slate' as const },
      { label: 'Customers', value: counts.customers || 0, tone: 'slate' as const },
      { label: 'Sales value', value: money(moneyData.salesTotal), tone: 'emerald' as const },
      { label: 'Open balance', value: money(moneyData.dueTotal), tone: 'amber' as const },
      { label: 'Purchase value', value: money(moneyData.purchaseValue), tone: 'cyan' as const },
      { label: 'Expense value', value: money(moneyData.expenseTotal), tone: 'rose' as const },
      { label: 'Gross margin', value: money(moneyData.grossMargin), tone: Number(moneyData.grossMargin || 0) >= 0 ? 'emerald' as const : 'rose' as const },
      { label: 'Open invoices', value: counts.openInvoices || 0, tone: 'amber' as const },
      { label: 'Low stock materials', value: counts.lowStockMaterials || 0, tone: 'amber' as const },
      { label: 'Low stock articles', value: counts.lowStockFinishedGoods || 0, tone: 'amber' as const },
    ]
  }, [summary])

  const transactions = useMemo(() => {
    const rows: TransactionRow[] = []
    const invoices = Array.isArray(summary?.recent?.invoices) ? summary.recent.invoices : []
    const purchases = Array.isArray(summary?.recent?.purchases) ? summary.recent.purchases : []
    const expenses = Array.isArray(summary?.lists?.expenses) ? summary.lists.expenses : []
    const productionOrders = Array.isArray(summary?.recent?.productionOrders) ? summary.recent.productionOrders : []

    for (const invoice of invoices) {
      rows.push({
        id: `invoice-${invoice.id}`,
        entryDate: invoice.invoiceDate || invoice.createdAt || new Date().toISOString(),
        transactionType: 'Sales Invoice',
        transactionKey: 'SALES_INVOICE',
        name: invoice.customer?.customerName || invoice.customerName || invoice.invoiceNumber || invoice.id,
        totalAmount: Number(invoice.grandTotal ?? 0),
        recPaidAmount: Number(invoice.paidAmount ?? 0),
        balanceAmount: Number(invoice.dueAmount ?? 0),
        note: invoice.invoiceNumber || null,
        href: `/sales-invoices/${invoice.id}`,
        tone: 'emerald',
      })
    }

    for (const purchase of purchases) {
      rows.push({
        id: `purchase-${purchase.id}`,
        entryDate: purchase.invoiceDate || purchase.createdAt || new Date().toISOString(),
        transactionType: 'Purchase',
        transactionKey: 'PURCHASE',
        name: purchase.supplierName || purchase.supplier?.name || purchase.invoiceNumber || purchase.id,
        totalAmount: Number(purchase.totalAmount ?? 0),
        recPaidAmount: Number(purchase.paidAmount ?? 0) || null,
        balanceAmount: Number(purchase.balanceAmount ?? purchase.dueAmount ?? purchase.totalAmount ?? 0),
        note: purchase.invoiceNumber || null,
        href: purchase.id ? `/inventory/purchases/${purchase.id}` : undefined,
        tone: 'cyan',
      })
    }

    for (const expense of expenses) {
      rows.push({
        id: `expense-${expense.id}`,
        entryDate: expense.expenseDate || expense.createdAt || new Date().toISOString(),
        transactionType: 'Expense',
        transactionKey: 'EXPENSE',
        name: expense.description || expense.category || expense.vendor || expense.id,
        totalAmount: Number(expense.amount ?? 0),
        recPaidAmount: Number(expense.amount ?? 0),
        balanceAmount: null,
        note: expense.vendor || null,
        href: expense.id ? `/expenses/${expense.id}` : undefined,
        tone: 'rose',
      })
    }

    for (const order of productionOrders) {
      rows.push({
        id: `production-${order.id}`,
        entryDate: order.createdAt || new Date().toISOString(),
        transactionType: 'Production Batch',
        transactionKey: 'PRODUCTION',
        name: order.finishedGoodName || order.finishedGood?.name || order.orderNumber || order.id,
        totalAmount: Number(order.fullyAbsorbedCost ?? order.baseCost ?? 0),
        recPaidAmount: null,
        balanceAmount: null,
        note: order.status || null,
        href: order.id ? `/inventory/production/${order.id}` : undefined,
        tone: 'amber',
      })
    }

    const q = `${search} ${partySearch}`.trim().toLowerCase()
    const filtered = rows.filter((row) => {
      const typeMatch = transactionType === 'ALL' || row.transactionKey === transactionType
      const textMatch =
        !q ||
        [row.transactionType, row.name, row.note, formatDate(row.entryDate)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      return typeMatch && textMatch
    })

    filtered.sort((a, b) => {
      const diff = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })
    return filtered
  }, [search, partySearch, summary, sortOrder, transactionType])

  const lowStockMaterials = useMemo(() => (summary?.lists?.lowStockMaterials || []).slice(0, 5), [summary])
  const lowStockFinishedGoods = useMemo(() => (summary?.lists?.lowStockFinishedGoods || []).slice(0, 5), [summary])
  const recentInvoices = useMemo(() => (summary?.recent?.invoices || []).slice(0, 5), [summary])
  const recentPurchases = useMemo(() => (summary?.recent?.purchases || []).slice(0, 5), [summary])
  const productionBatches = useMemo(() => (summary?.recent?.productionOrders || []).slice(0, 5), [summary])

  return (
    <div className="-m-4 min-h-[calc(100vh-2rem)] bg-[#0b0b0d] text-zinc-100 lg:-m-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(74,222,128,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
            {error}
          </div>
        ) : null}

        <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Reports
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">All Transactions Report</h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                A Merlin-native summary of inventory, sales, purchasing, production, and expenses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Print PDF
            </button>
            <Link
              to="/exports"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              Download Excel
            </Link>
            <button
              type="button"
              onClick={() => loadDashboard('refresh')}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] lg:grid-cols-[1.4fr_220px_260px_220px_160px]">
          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-0 transition focus:border-cyan-400/50"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">Transaction Type</span>
            <select
              value={transactionType}
              onChange={(event) => setTransactionType(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-4 text-sm text-zinc-100 outline-none transition focus:border-cyan-400/50"
            >
              <option value="ALL">All Transactions</option>
              <option value="SALES_INVOICE">Sales Invoices</option>
              <option value="PURCHASE">Purchases</option>
              <option value="EXPENSE">Expenses</option>
              <option value="PRODUCTION">Production Batches</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">Party / Name</span>
            <input
              value={partySearch}
              onChange={(event) => setPartySearch(event.target.value)}
              placeholder="Search party"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-cyan-400/50"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">Sort By</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-4 text-sm text-zinc-100 outline-none transition focus:border-cyan-400/50"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setPartySearch('')
                setTransactionType('ALL')
                setSortOrder('newest')
                setFromDate('')
                setToDate('')
                setAppliedFromDate('')
                setAppliedToDate('')
                void loadDashboard('refresh', { from: '', to: '' })
              }}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.slice(0, 4).map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.slice(4, 8).map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <div className="space-y-6">
            <Panel
              title="Transactions"
              description={loading ? 'Loading dashboard...' : `${filteredTransactions.length} rows in the current report view.`}
              action={<span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{appliedFromDate || appliedToDate ? 'Filtered' : 'All time'}</span>}
            >
              {loading ? (
                <div className="py-14 text-center text-sm text-zinc-400">Loading dashboard...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-14 text-center text-sm text-zinc-400">No transactions match the current filters.</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full text-left text-sm">
                      <thead className="bg-white/[0.04] text-zinc-400">
                        <tr>
                          <th className="px-5 py-4 font-medium">Date</th>
                          <th className="px-5 py-4 font-medium">Transaction Type</th>
                          <th className="px-5 py-4 font-medium">Name</th>
                          <th className="px-5 py-4 font-medium">Total Amount</th>
                          <th className="px-5 py-4 font-medium">Rec/Paid Amount</th>
                          <th className="px-5 py-4 font-medium">Balance Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-[#101114]">
                        {filteredTransactions.map((row) => (
                          <tr key={row.id} className="transition hover:bg-white/[0.03]">
                            <td className="px-5 py-4 whitespace-nowrap text-zinc-300">{formatDate(row.entryDate)}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${darkToneClass(row.tone)}`}>
                                {row.transactionType}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {row.href ? (
                                <Link to={row.href} className="font-medium text-zinc-100 hover:text-cyan-300 hover:underline">
                                  {row.name}
                                </Link>
                              ) : (
                                <div className="font-medium text-zinc-100">{row.name}</div>
                              )}
                              {row.note ? <div className="mt-1 text-xs text-zinc-500">{row.note}</div> : null}
                            </td>
                            <td className="px-5 py-4 font-medium text-zinc-100">{money(row.totalAmount)}</td>
                            <td className="px-5 py-4 font-medium text-zinc-300">{row.recPaidAmount == null ? '--' : money(row.recPaidAmount)}</td>
                            <td className="px-5 py-4 font-medium text-zinc-300">{row.balanceAmount == null ? '--' : money(row.balanceAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Panel>

            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title="Recent Sales" description="Latest issued invoices from the sales flow.">
                <div className="space-y-3">
                  {recentInvoices.length === 0 ? (
                    <div className="text-sm text-zinc-400">No invoices yet.</div>
                  ) : (
                    recentInvoices.map((invoice: any) => (
                      <div key={invoice.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-zinc-100">{invoice.invoiceNumber || invoice.id}</div>
                          <div className="text-sm text-emerald-300">{money(invoice.grandTotal)}</div>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">{invoice.customer?.customerName || invoice.customerName || '-'}</div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Recent Purchases" description="Most recent purchase activity.">
                <div className="space-y-3">
                  {recentPurchases.length === 0 ? (
                    <div className="text-sm text-zinc-400">No purchase history yet.</div>
                  ) : (
                    recentPurchases.map((purchase: any) => (
                      <div key={purchase.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-zinc-100">{purchase.supplierName || purchase.supplier?.name || purchase.invoiceNumber || purchase.id}</div>
                          <div className="text-sm text-cyan-300">{money(purchase.totalAmount)}</div>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">{formatDate(purchase.invoiceDate || purchase.createdAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Recent Production" description="Latest article batches from the floor.">
                <div className="space-y-3">
                  {productionBatches.length === 0 ? (
                    <div className="text-sm text-zinc-400">No production batches yet.</div>
                  ) : (
                    productionBatches.map((order: any) => (
                      <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-zinc-100">{order.orderNumber || order.id}</div>
                          <div className="text-sm text-amber-300">{money(order.fullyAbsorbedCost)}</div>
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">{order.finishedGoodName || order.finishedGood?.name || '-'}</div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-6">
            <Panel title="Reporting Period" description="Filter the dashboard by date range.">
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-2 block text-zinc-400">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-4 text-sm text-zinc-100 outline-none transition focus:border-cyan-400/50"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block text-zinc-400">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-4 text-sm text-zinc-100 outline-none transition focus:border-cyan-400/50"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyReportingPeriod}
                  disabled={refreshing}
                  className="h-11 w-full rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </Panel>

            <Panel title="Low Stock Raw Materials" description="Items at or below reorder point.">
              <div className="space-y-3">
                {lowStockMaterials.map((material: any) => (
                  <div key={material.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                    <div className="font-medium text-zinc-100">{material.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">Stock {Number(material.currentStock ?? 0)} | Reorder {material.reorderLevel ?? 'N/A'}</div>
                  </div>
                ))}
                {lowStockMaterials.length === 0 ? <div className="text-sm text-zinc-400">No low-stock raw materials.</div> : null}
              </div>
            </Panel>

            <Panel title="Low Stock Articles" description="Articles that need replenishment.">
              <div className="space-y-3">
                {lowStockFinishedGoods.map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                    <div className="font-medium text-zinc-100">{item.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">Stock {Number(item.currentStock ?? 0)} | Reorder {item.reorderLevel ?? 'N/A'}</div>
                  </div>
                ))}
                {lowStockFinishedGoods.length === 0 ? <div className="text-sm text-zinc-400">No low-stock articles.</div> : null}
              </div>
            </Panel>

            <Panel title="Quick Actions" description="Jump to common work areas.">
              <div className="grid gap-2">
                <Link to="/inventory/materials" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
                  Materials
                </Link>
                <Link to="/inventory/finished-goods" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
                  Articles
                </Link>
                <Link to="/inventory/purchases" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
                  Purchases
                </Link>
                <Link to="/sales-invoices" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
                  Sales Invoices
                </Link>
                <Link to="/expenses" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
                  Expenses
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
