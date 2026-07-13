import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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

type TrendRow = {
  period: string
  sales: number
  purchases: number
  expenses: number
  grossProfit: number
  netProfit: number
  previousGrossProfit?: number
  previousNetProfit?: number
  previousSales?: number
  previousPurchases?: number
  previousExpenses?: number
}

type SummaryPayload = {
  period?: {
    key?: ReportingPeriod
    label?: string
    from?: string | null
    to?: string | null
    granularity?: ReportingGranularity
  }
  counts?: Record<string, number>
  money?: Record<string, number>
  trend?: Array<Record<string, any>>
  transactions?: TransactionRow[]
  recent?: {
    invoices?: any[]
    purchases?: any[]
    productionOrders?: any[]
  }
  lists?: {
    lowStockMaterials?: any[]
    lowStockFinishedGoods?: any[]
    materials?: any[]
    finishedGoods?: any[]
    suppliers?: any[]
    customers?: any[]
    expenses?: any[]
    overheadAllocations?: Array<{ label: string; value: number }>
    productionOrderAllocations?: any[]
  }
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

const revenueTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'expenses', label: 'Expenses' },
] as const

const profitTabs = [
  { key: 'compare', label: 'Compare' },
  { key: 'gross', label: 'Gross profit' },
  { key: 'net', label: 'Net profit' },
] as const

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

function percentChange(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function comparisonLabel(current: number, previous: number, kind: 'currency' | 'count' = 'currency') {
  if (!Number.isFinite(previous)) return 'No previous period'

  const delta = current - previous
  if (previous === 0) {
    if (current === 0) return 'No change vs previous period'
    return `New ${kind === 'currency' ? 'activity' : 'items'} vs previous period`
  }

  const pct = percentChange(current, previous)
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
  const absDelta = kind === 'currency' ? money(Math.abs(delta)) : new Intl.NumberFormat('en-NP').format(Math.abs(delta))
  const absPct = pct == null ? null : `${pct > 0 ? '+' : pct < 0 ? '-' : ''}${Math.abs(pct).toFixed(1)}%`

  return absPct ? `${sign}${absDelta} (${absPct}) vs previous period` : `${sign}${absDelta} vs previous period`
}

function relativeChangeTone(current: number, previous: number) {
  if (!Number.isFinite(previous)) return 'slate'
  if (previous === 0) return current === 0 ? 'slate' : 'emerald'
  const pct = percentChange(current, previous)
  if (pct == null || pct === 0) return 'slate'
  return pct > 0 ? 'emerald' : 'rose'
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  return new Intl.DateTimeFormat('en-NP', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getComparisonWindow(from?: string | null, to?: string | null) {
  if (!from || !to) return null
  const currentFrom = new Date(from)
  const currentTo = new Date(to)
  if (Number.isNaN(currentFrom.getTime()) || Number.isNaN(currentTo.getTime()) || currentTo.getTime() <= currentFrom.getTime()) {
    return null
  }

  const duration = currentTo.getTime() - currentFrom.getTime()
  const previousTo = new Date(currentFrom.getTime() - 1)
  const previousFrom = new Date(previousTo.getTime() - duration)
  return {
    from: previousFrom.toISOString(),
    to: previousTo.toISOString(),
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

function ChartTooltip({ active, payload, label, dark = false }: any) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null

  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur ${
        dark ? 'border-white/10 bg-slate-950/95' : 'border-slate-200 bg-white/95'
      }`}
    >
      <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
      <div className="mt-3 space-y-2">
        {payload
          .filter((entry: any) => entry?.value != null)
          .map((entry: any) => (
            <div key={entry.dataKey || entry.name} className="flex items-center justify-between gap-6 text-sm">
              <span className={`flex items-center gap-2 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || '#94a3b8' }} />
                {entry.name}
              </span>
              <span className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{money(entry.value)}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function OperationsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [comparisonSummary, setComparisonSummary] = useState<SummaryPayload | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [transactionType, setTransactionType] = useState<'ALL' | 'SALES_INVOICE' | 'PURCHASE' | 'EXPENSE' | 'PRODUCTION'>('ALL')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>('month')
  const [selectedGranularity, setSelectedGranularity] = useState<ReportingGranularity>('month')
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  const [appliedFromDate, setAppliedFromDate] = useState('')
  const [appliedToDate, setAppliedToDate] = useState('')
  const [revenueTab, setRevenueTab] = useState<'overview' | 'sales' | 'purchases' | 'expenses'>('overview')
  const [profitTab, setProfitTab] = useState<'compare' | 'gross' | 'net'>('compare')

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
      setComparisonSummary(null)
      const currentSummary = await api.get<SummaryPayload>(`/operations/summary?${query.toString()}`)
      setSummary(currentSummary)
      setLastRefreshedAt(new Date().toISOString())

      const comparisonWindow = getComparisonWindow(currentSummary?.period?.from, currentSummary?.period?.to)
      if (!comparisonWindow) {
        setComparisonSummary(null)
        return
      }

      const comparisonQuery = new URLSearchParams()
      comparisonQuery.set('period', 'custom')
      comparisonQuery.set('granularity', currentSummary.period?.granularity || selectedGranularity)
      comparisonQuery.set('from', comparisonWindow.from)
      comparisonQuery.set('to', comparisonWindow.to)
      try {
        const previousSummary = await api.get<SummaryPayload>(`/operations/summary?${comparisonQuery.toString()}`)
        setComparisonSummary(previousSummary)
      } catch {
        setComparisonSummary(null)
      }
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
    const previousCounts = comparisonSummary?.counts || {}
    const previousMoney = comparisonSummary?.money || {}
    const grossProfit = Number(moneyData.grossMargin ?? moneyData.manufacturingMargin ?? 0)
    const netProfit = Number(moneyData.estimatedProfit ?? 0)

    return [
      { label: 'Sales', value: money(moneyData.salesTotal), tone: 'emerald' as const, note: comparisonLabel(Number(moneyData.salesTotal ?? 0), Number(previousMoney.salesTotal ?? 0)) },
      { label: 'Purchases', value: money(moneyData.purchaseValue), tone: 'slate' as const, note: comparisonLabel(Number(moneyData.purchaseValue ?? 0), Number(previousMoney.purchaseValue ?? 0)) },
      { label: 'Expenses', value: money(moneyData.expenseTotal), tone: 'rose' as const, note: comparisonLabel(Number(moneyData.expenseTotal ?? 0), Number(previousMoney.expenseTotal ?? 0)) },
      { label: 'Gross profit / loss', value: money(grossProfit), tone: grossProfit >= 0 ? ('emerald' as const) : ('rose' as const), note: comparisonLabel(grossProfit, Number(previousMoney.grossMargin ?? previousMoney.manufacturingMargin ?? 0)) },
      { label: 'Net profit / loss', value: money(netProfit), tone: netProfit >= 0 ? ('emerald' as const) : ('rose' as const), note: comparisonLabel(netProfit, Number(previousMoney.estimatedProfit ?? 0)) },
      { label: 'Outstanding invoices', value: counts.openInvoices || 0, tone: 'amber' as const, note: comparisonLabel(Number(counts.openInvoices ?? 0), Number(previousCounts.openInvoices ?? 0), 'count') },
      { label: 'Raw material stock alerts', value: counts.lowStockMaterials || 0, tone: 'amber' as const, note: comparisonLabel(Number(counts.lowStockMaterials ?? 0), Number(previousCounts.lowStockMaterials ?? 0), 'count') },
      { label: 'Article stock alerts', value: counts.lowStockFinishedGoods || 0, tone: 'amber' as const, note: comparisonLabel(Number(counts.lowStockFinishedGoods ?? 0), Number(previousCounts.lowStockFinishedGoods ?? 0), 'count') },
    ]
  }, [comparisonSummary, summary])

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

  const filteredTransactionTotals = useMemo(() => {
    return transactions.reduce(
      (totals, row) => {
        totals.totalAmount += Number(row.totalAmount ?? 0)
        totals.recPaidAmount += Number(row.recPaidAmount ?? 0)
        totals.balanceAmount += Number(row.balanceAmount ?? 0)
        return totals
      },
      { totalAmount: 0, recPaidAmount: 0, balanceAmount: 0 },
    )
  }, [transactions])

  const trendData = useMemo(() => Array.isArray(summary?.trend) ? summary.trend : [], [summary])
  const comparisonTrendData = useMemo<TrendRow[]>(() => {
    const currentTrend = Array.isArray(summary?.trend) ? (summary.trend as TrendRow[]) : []
    const previousTrend = Array.isArray(comparisonSummary?.trend) ? (comparisonSummary.trend as TrendRow[]) : []

    if (currentTrend.length === 0) return []
    if (previousTrend.length === 0) return currentTrend

    return currentTrend.map((point, index) => {
      const previousIndex = Math.min(previousTrend.length - 1, Math.max(0, previousTrend.length - currentTrend.length + index))
      const previousPoint = previousTrend[previousIndex] || {}
      return {
        ...point,
        previousSales: Number(previousPoint.sales ?? 0),
        previousPurchases: Number(previousPoint.purchases ?? 0),
        previousExpenses: Number(previousPoint.expenses ?? 0),
        previousGrossProfit: Number(previousPoint.grossProfit ?? 0),
        previousNetProfit: Number(previousPoint.netProfit ?? 0),
      }
    })
  }, [comparisonSummary, summary])
  const lowStockMaterials = useMemo(() => (summary?.lists?.lowStockMaterials || []).slice(0, 5), [summary])
  const lowStockFinishedGoods = useMemo(() => (summary?.lists?.lowStockFinishedGoods || []).slice(0, 5), [summary])
  const recentInvoices = useMemo(() => (summary?.recent?.invoices || []).slice(0, 5), [summary])
  const recentPurchases = useMemo(() => (summary?.recent?.purchases || []).slice(0, 5), [summary])
  const productionBatches = useMemo(() => (summary?.recent?.productionOrders || []).slice(0, 5), [summary])
  const topOverheadBucket = useMemo(() => {
    const allocations = summary?.lists?.overheadAllocations || []
    return allocations.length > 0 ? allocations[0] : null
  }, [summary])
  const totalAlerts = Number(summary?.counts?.lowStockMaterials || 0) + Number(summary?.counts?.lowStockFinishedGoods || 0) + Number(summary?.counts?.openInvoices || 0)

  const periodLabel = summary?.period?.label || 'Loading'
  const granularityLabel = summary?.period?.granularity || selectedGranularity
  const dateRangeLabel =
    selectedPeriod === 'custom'
      ? `${appliedFromDate || 'Any start'} to ${appliedToDate || 'Any end'}`
      : periodLabel

  const reportContextLabel = [
    dateRangeLabel,
    `${granularityLabel} granularity`,
    lastRefreshedAt ? `refreshed ${formatRelativeTime(lastRefreshedAt)}` : 'refreshing on load',
  ].join(' | ')

  const insightCards = [
    {
      label: 'Profit direction',
      tone: relativeChangeTone(Number(summary?.money?.estimatedProfit ?? 0), Number(comparisonSummary?.money?.estimatedProfit ?? 0)),
      text:
        comparisonSummary && Number.isFinite(Number(comparisonSummary.money?.estimatedProfit))
          ? comparisonLabel(Number(summary?.money?.estimatedProfit ?? 0), Number(comparisonSummary.money?.estimatedProfit ?? 0))
          : 'Compare to a previous range to see profit direction.',
    },
    {
      label: 'Sales momentum',
      tone: relativeChangeTone(Number(summary?.money?.salesTotal ?? 0), Number(comparisonSummary?.money?.salesTotal ?? 0)),
      text:
        comparisonSummary && Number.isFinite(Number(comparisonSummary.money?.salesTotal))
          ? comparisonLabel(Number(summary?.money?.salesTotal ?? 0), Number(comparisonSummary.money?.salesTotal ?? 0))
          : 'Sales momentum appears once a comparable range is available.',
    },
    {
      label: 'Biggest overhead bucket',
      tone: topOverheadBucket ? 'amber' : 'slate',
      text: topOverheadBucket ? `${topOverheadBucket.label} leads overhead with ${money(topOverheadBucket.value)}` : 'No overhead allocation data yet.',
    },
    {
      label: 'Attention needed',
      tone: totalAlerts > 0 ? 'rose' : 'emerald',
      text:
        totalAlerts > 0
          ? `${totalAlerts} open issues across invoices and stock`
          : 'No outstanding invoice or stock pressure detected.',
    },
  ] as const

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

      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Report context</div>
            <div className="mt-1 text-sm text-slate-700">{reportContextLabel}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{summary?.period?.label || 'Loading period'}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{granularityLabel}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{transactionTypeOptions.find((option) => option.value === transactionType)?.label || 'All types'}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <InventoryStatGrid stats={stats} layoutClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" />
      </div>

      <div className="mb-6">
        <Panel
          title="Report insights"
          description="A short read on what changed in this reporting window."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {insightCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                <div className={`mt-3 text-sm font-medium ${card.tone === 'emerald' ? 'text-emerald-700' : card.tone === 'rose' ? 'text-rose-700' : card.tone === 'amber' ? 'text-amber-700' : 'text-slate-700'}`}>
                  {card.text}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Revenue vs Spend"
              description="Sales, purchases, and expenses for the selected period."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Current period</span>
                  {comparisonSummary ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Previous period comparison</span> : null}
                </div>
              }
            >
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs font-medium text-slate-500">Sales</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{money(summary?.money?.salesTotal)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs font-medium text-slate-500">Purchases</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{money(summary?.money?.purchaseValue)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs font-medium text-slate-500">Expenses</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{money(summary?.money?.expenseTotal)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {revenueTabs.map((tab) => {
                    const active = revenueTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setRevenueTab(tab.key)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={revenueTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="mt-4 h-72"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          width={64}
                          tickFormatter={(value) => money(value as number)}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <defs>
                          <linearGradient id="revenueSalesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.34} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        {(revenueTab === 'overview' || revenueTab === 'sales') && (
                          <Area
                            type="monotone"
                            dataKey="sales"
                            name="Sales"
                            stroke="#f43f5e"
                            strokeWidth={3}
                            fill="url(#revenueSalesFill)"
                            activeDot={{ r: 4 }}
                          />
                        )}
                        {(revenueTab === 'overview' || revenueTab === 'purchases') && (
                          <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#14b8a6" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                        )}
                        {(revenueTab === 'overview' || revenueTab === 'expenses') && (
                          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </motion.div>
                </AnimatePresence>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Switch tabs to inspect one series at a time. The combined overview stays available when you need the full picture.
                </p>
              </div>
            </Panel>

            <Panel
              title="Profit / Loss Over Time"
              description="Gross and net movement based on the selected reporting window."
              action={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Compare against the previous period</span>}
            >
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-center gap-2">
                  {profitTabs.map((tab) => {
                    const active = profitTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setProfitTab(tab.key)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={profitTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="mt-4 h-72"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={comparisonTrendData.length > 0 ? comparisonTrendData : trendData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="grossProfitFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="netProfitFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          width={64}
                          tickFormatter={(value) => money(value as number)}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        {(profitTab === 'compare' || profitTab === 'gross') && (
                          <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#3b82f6" strokeWidth={3} fill="url(#grossProfitFill)" activeDot={{ r: 4 }} />
                        )}
                        {(profitTab === 'compare' || profitTab === 'net') && (
                          <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" strokeWidth={3} fill="url(#netProfitFill)" activeDot={{ r: 4 }} />
                        )}
                        {comparisonSummary && (profitTab === 'compare' || profitTab === 'gross') ? (
                          <Line type="monotone" dataKey="previousGrossProfit" name="Prev. Gross Profit" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                        ) : null}
                        {comparisonSummary && (profitTab === 'compare' || profitTab === 'net') ? (
                          <Line type="monotone" dataKey="previousNetProfit" name="Prev. Net Profit" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 6" dot={false} />
                        ) : null}
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                </AnimatePresence>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Use Compare to see period-over-period change. Gross profit and net profit can be viewed separately when you want a cleaner read.
                </p>
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
                    <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
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
                      <tfoot className="border-t border-slate-200 bg-slate-50">
                        <tr>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-700" colSpan={3}>
                            Filtered total
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{money(filteredTransactionTotals.totalAmount)}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{money(filteredTransactionTotals.recPaidAmount)}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{money(filteredTransactionTotals.balanceAmount)}</td>
                        </tr>
                      </tfoot>
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
                    <Link key={invoice.id} to={`/sales-invoices/${invoice.id}/edit`} className="group block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900 group-hover:text-blue-700">{invoice.invoiceNumber || invoice.id}</div>
                        <div className="text-sm text-emerald-700">{money(invoice.grandTotal)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{invoice.customer?.customerName || invoice.customerName || '-'}</span><span className="font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">Edit invoice →</span></div>
                    </Link>
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
                    <Link key={purchase.id} to={`/inventory/purchases/${purchase.id}`} className="group block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900 group-hover:text-blue-700">{purchase.supplierName || purchase.supplier?.name || purchase.invoiceNumber || purchase.id}</div>
                        <div className="text-sm text-slate-700">{money(purchase.totalAmount)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{formatDate(purchase.invoiceDate || purchase.createdAt)}</span><span className="font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">Open purchase →</span></div>
                    </Link>
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
                    <Link key={order.id} to={`/inventory/production/${order.id}`} className="group block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900 group-hover:text-blue-700">{order.orderNumber || order.id}</div>
                        <div className="text-sm text-slate-700">{money(order.fullyAbsorbedCost ?? order.baseCost)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{order.finishedGoodName || order.finishedGood?.name || '-'}</span><span className="font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">Edit batch →</span></div>
                    </Link>
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
