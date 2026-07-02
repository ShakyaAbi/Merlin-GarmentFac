import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { formatNepaliDate } from '../../utils/nepaliDate'

type ReportingPeriod = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
type ReportingGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

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
  tone: 'slate' | 'emerald' | 'amber' | 'rose'
}

const periodOptions: Array<{ value: ReportingPeriod; label: string; hint: string }> = [
  { value: 'all', label: 'All time', hint: 'Everything in the database' },
  { value: 'today', label: 'Today', hint: 'Current day activity' },
  { value: 'week', label: 'This week', hint: 'Rolling 7-day view' },
  { value: 'month', label: 'This month', hint: 'Current month to date' },
  { value: 'quarter', label: 'This quarter', hint: 'Current quarter to date' },
  { value: 'year', label: 'This year', hint: 'Current year to date' },
  { value: 'custom', label: 'Custom', hint: 'Pick your own range' },
]

const granularityOptions: Array<{ value: ReportingGranularity; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => formatNepaliDate(value)

function toneClass(tone: TransactionRow['tone']) {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    case 'amber':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    case 'rose':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
  }
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
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
  note,
}: {
  label: string
  value: React.ReactNode
  tone?: 'slate' | 'emerald' | 'amber' | 'rose'
  note?: string
}) {
  const valueClass =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : tone === 'rose'
          ? 'text-rose-700'
          : 'text-slate-900'

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</div>
      {note ? <div className="mt-2 text-xs text-slate-500">{note}</div> : null}
    </div>
  )
}

export default function OperationsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [transactionType, setTransactionType] = useState<'ALL' | 'SALES_INVOICE' | 'PURCHASE' | 'EXPENSE' | 'PRODUCTION'>('ALL')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>('month')
  const [selectedGranularity, setSelectedGranularity] = useState<ReportingGranularity>('month')
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  const [appliedFromDate, setAppliedFromDate] = useState('')
  const [appliedToDate, setAppliedToDate] = useState('')

  const loadSummary = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams()
      query.set('period', selectedPeriod)
      query.set('granularity', selectedGranularity)
      if (selectedPeriod === 'custom') {
        if (appliedFromDate) query.set('from', appliedFromDate)
        if (appliedToDate) query.set('to', appliedToDate)
      }
      setSummary(await api.get(`/operations/summary?${query.toString()}`))
    } catch (err: any) {
      setError(err?.message || 'Failed to load the reports page.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (selectedPeriod === 'custom' && !appliedFromDate && !appliedToDate) {
      return
    }
    void loadSummary()
    // The function is intentionally recreated with the latest form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedGranularity, appliedFromDate, appliedToDate])

  const applyCustomPeriod = () => {
    setSelectedPeriod('custom')
    setAppliedFromDate(customFromDate)
    setAppliedToDate(customToDate)
  }

  const stats = useMemo(() => {
    const counts = summary?.counts || {}
    const moneyData = summary?.money || {}
    const grossProfit = Number(moneyData.grossMargin ?? moneyData.manufacturingMargin ?? 0)
    const netProfit = Number(moneyData.estimatedProfit ?? 0)

    return [
      { label: 'Sales', value: money(moneyData.salesTotal), tone: 'emerald' as const, note: 'Invoice total, not payment timing' },
      { label: 'Purchases', value: money(moneyData.purchaseValue), tone: 'slate' as const, note: 'Purchase invoice total' },
      { label: 'Expenses', value: money(moneyData.expenseTotal), tone: 'rose' as const, note: 'All expense entries' },
      { label: 'Gross profit / loss', value: money(grossProfit), tone: grossProfit >= 0 ? ('emerald' as const) : ('rose' as const), note: 'Sales less purchase cost' },
      { label: 'Net profit / loss', value: money(netProfit), tone: netProfit >= 0 ? ('emerald' as const) : ('rose' as const), note: 'Accrual-based view' },
      { label: 'Outstanding invoices', value: counts.openInvoices || 0, tone: 'amber' as const, note: 'Due against issued invoices' },
      { label: 'Raw material stock alerts', value: counts.lowStockMaterials || 0, tone: 'amber' as const, note: 'At or below reorder level' },
      { label: 'Article stock alerts', value: counts.lowStockFinishedGoods || 0, tone: 'amber' as const, note: 'At or below reorder level' },
    ]
  }, [summary])

  const transactions = useMemo(() => {
    const rows: TransactionRow[] = Array.isArray(summary?.transactions) ? summary.transactions : []
    const q = search.trim().toLowerCase()

    return rows
      .filter((row) => {
        if (transactionType !== 'ALL' && row.transactionKey !== transactionType) return false
        if (!q) return true
        return [row.transactionType, row.name, row.note, formatDate(row.entryDate)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      })
      .sort((a, b) => {
        const left = new Date(a.entryDate).getTime()
        const right = new Date(b.entryDate).getTime()
        return sortOrder === 'newest' ? right - left : left - right
      })
  }, [search, sortOrder, summary, transactionType])

  const trendData = useMemo(() => Array.isArray(summary?.trend) ? summary.trend : [], [summary])
  const lowStockMaterials = useMemo(() => (summary?.lists?.lowStockMaterials || []).slice(0, 5), [summary])
  const lowStockFinishedGoods = useMemo(() => (summary?.lists?.lowStockFinishedGoods || []).slice(0, 5), [summary])
  const recentInvoices = useMemo(() => (summary?.recent?.invoices || []).slice(0, 5), [summary])
  const recentPurchases = useMemo(() => (summary?.recent?.purchases || []).slice(0, 5), [summary])
  const productionBatches = useMemo(() => (summary?.recent?.productionOrders || []).slice(0, 5), [summary])

  const periodLabel = summary?.period?.label || 'Loading'
  const dateRangeLabel =
    selectedPeriod === 'custom'
      ? `${appliedFromDate || 'Any start'} to ${appliedToDate || 'Any end'}`
      : periodLabel

  const transactionTypeOptions = [
    { value: 'ALL' as const, label: 'All types' },
    { value: 'SALES_INVOICE' as const, label: 'Sales invoices' },
    { value: 'PURCHASE' as const, label: 'Purchases' },
    { value: 'EXPENSE' as const, label: 'Expenses' },
    { value: 'PRODUCTION' as const, label: 'Production batches' },
  ]

  return (
    <InventoryPageShell
      eyebrow="Reports"
      title="All Transactions Report"
      description="Selectable period reporting with full transactions and accrual-based profit / loss over time."
      backTo={{ to: '/', label: 'Back to Home' }}
      actions={[
        { label: 'Print PDF', variant: 'outline', onClick: () => window.print() },
        { label: 'Download Excel', variant: 'primary', to: '/exports' },
        { label: refreshing ? 'Refreshing...' : 'Refresh', variant: 'outline', onClick: () => loadSummary('refresh') },
      ]}
    >
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mb-6">
        <InventoryStatGrid stats={stats} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Revenue vs Spend"
              description="Sales, purchases, and expenses for the selected period."
              action={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{dateRangeLabel}</span>}
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} width={48} />
                    <Tooltip formatter={(value: any) => money(value)} />
                    <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases" fill="#64748b" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#e11d48" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Profit / Loss Over Time" description="Gross and net movement based on the selected reporting window.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grossProfitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="netProfitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} width={48} />
                    <Tooltip formatter={(value: any) => money(value)} />
                    <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#2563eb" strokeWidth={2.5} fill="url(#grossProfitFill)" />
                    <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#16a34a" strokeWidth={2.5} fill="url(#netProfitFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel
            title="Transactions"
            description={loading ? 'Loading report data...' : `${transactions.length} rows in the current report view.`}
            action={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{summary?.period?.granularity || 'month'}</span>}
          >
            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_180px]">
              <label className="block text-sm">
                <span className="mb-2 block text-slate-500">Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transactions, names, dates..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block text-slate-500">Type</span>
                <select
                  value={transactionType}
                  onChange={(event) => setTransactionType(event.target.value as typeof transactionType)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                >
                  {transactionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-2 block text-slate-500">Sort</span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="py-14 text-center text-sm text-slate-500">Loading report data...</div>
            ) : transactions.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-500">No transactions match the current filters.</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[1040px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-4 font-medium">Date</th>
                        <th className="px-5 py-4 font-medium">Transaction Type</th>
                        <th className="px-5 py-4 font-medium">Name</th>
                        <th className="px-5 py-4 font-medium">Total Amount</th>
                        <th className="px-5 py-4 font-medium">Rec/Paid Amount</th>
                        <th className="px-5 py-4 font-medium">Balance Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {transactions.map((row) => (
                        <tr key={row.id} className="transition hover:bg-slate-50">
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(row.entryDate)}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass(row.tone)}`}>{row.transactionType}</span>
                          </td>
                          <td className="px-5 py-4">
                            {row.href ? (
                              <Link to={row.href} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
                                {row.name}
                              </Link>
                            ) : (
                              <div className="font-medium text-slate-900">{row.name}</div>
                            )}
                            {row.note ? <div className="mt-1 text-xs text-slate-500">{row.note}</div> : null}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-900">{money(row.totalAmount)}</td>
                          <td className="px-5 py-4 font-medium text-slate-700">{row.recPaidAmount == null ? '--' : money(row.recPaidAmount)}</td>
                          <td className="px-5 py-4 font-medium text-slate-700">{row.balanceAmount == null ? '--' : money(row.balanceAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Recent Sales" description="Latest issued invoices in the current data set.">
              <div className="space-y-3">
                {recentInvoices.length === 0 ? (
                  <div className="text-sm text-slate-500">No invoices yet.</div>
                ) : (
                  recentInvoices.map((invoice: any) => (
                    <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{invoice.invoiceNumber || invoice.id}</div>
                        <div className="text-sm text-emerald-700">{money(invoice.grandTotal)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{invoice.customer?.customerName || invoice.customerName || '-'}</div>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Recent Purchases" description="Most recent purchase activity.">
              <div className="space-y-3">
                {recentPurchases.length === 0 ? (
                  <div className="text-sm text-slate-500">No purchase history yet.</div>
                ) : (
                  recentPurchases.map((purchase: any) => (
                    <div key={purchase.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{purchase.supplierName || purchase.supplier?.name || purchase.invoiceNumber || purchase.id}</div>
                        <div className="text-sm text-slate-700">{money(purchase.totalAmount)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{formatDate(purchase.invoiceDate || purchase.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Recent Production" description="Latest article batches from the floor.">
              <div className="space-y-3">
                {productionBatches.length === 0 ? (
                  <div className="text-sm text-slate-500">No production batches yet.</div>
                ) : (
                  productionBatches.map((order: any) => (
                    <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{order.orderNumber || order.id}</div>
                        <div className="text-sm text-slate-700">{money(order.fullyAbsorbedCost ?? order.baseCost)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{order.finishedGoodName || order.finishedGood?.name || '-'}</div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <InventorySectionCard title="Reporting Period" description="Select a preset or apply a custom range.">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {periodOptions.map((option) => {
                  const active = selectedPeriod === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedPeriod(option.value)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{option.hint}</div>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">Granularity</div>
                <div className="flex flex-wrap gap-2">
                  {granularityOptions.map((option) => {
                    const active = selectedGranularity === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedGranularity(option.value)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-2 block text-slate-500">From</span>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block text-slate-500">To</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
              </label>

              <button
                type="button"
                onClick={applyCustomPeriod}
                disabled={refreshing}
                className="h-11 w-full rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? 'Applying...' : 'Apply custom range'}
              </button>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Low Stock Raw Materials" description="Items at or below reorder point.">
            <div className="space-y-3">
              {lowStockMaterials.map((material: any) => (
                <Link
                  key={material.id}
                  to={`/inventory/materials/${material.id}`}
                  className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{material.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Stock {Number(material.currentStock ?? 0)} | Reorder {material.reorderLevel ?? 'N/A'}
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                      Open
                    </span>
                  </div>
                </Link>
              ))}
              {lowStockMaterials.length === 0 ? <div className="text-sm text-slate-500">No low-stock raw materials.</div> : null}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Low Stock Articles" description="Articles that need replenishment.">
            <div className="space-y-3">
              {lowStockFinishedGoods.map((item: any) => (
                <Link
                  key={item.id}
                  to={`/inventory/finished-goods/${item.id}`}
                  className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Stock {Number(item.currentStock ?? 0)} | Reorder {item.reorderLevel ?? 'N/A'}
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                      Open
                    </span>
                  </div>
                </Link>
              ))}
              {lowStockFinishedGoods.length === 0 ? <div className="text-sm text-slate-500">No low-stock articles.</div> : null}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions" description="Jump to common work areas.">
            <div className="grid gap-2">
              <Link to="/inventory/materials" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Materials
              </Link>
              <Link to="/inventory/finished-goods" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Articles
              </Link>
              <Link to="/inventory/purchases" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Purchases
              </Link>
              <Link to="/sales-invoices" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Sales Invoices
              </Link>
              <Link to="/payments" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Payments
              </Link>
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
