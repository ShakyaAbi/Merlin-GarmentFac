import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BarChart3,
  Clock3,
  FileText,
  FolderKanban,
  Layers,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { api } from '../services/api'
import { formatNepaliDate } from '../utils/nepaliDate'
import { InventoryPageShell } from '../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../components/inventory/InventoryStatGrid'

type SummaryPayload = {
  period?: {
    label?: string
    from?: string | null
    to?: string | null
    granularity?: string
  }
  counts?: {
    openInvoices?: number
    lowStockMaterials?: number
    lowStockFinishedGoods?: number
  }
  money?: {
    salesTotal?: number
    purchaseValue?: number
    expenseTotal?: number
    estimatedProfit?: number
  }
  recent?: {
    invoices?: Array<{
      id: string
      invoiceNumber?: string | null
      invoiceDate?: string | null
      customerName?: string | null
      grandTotal?: number | null
    }>
    purchases?: Array<{
      id: string
      invoiceNumber?: string | null
      invoiceDate?: string | null
      supplierName?: string | null
      totalAmount?: number | null
    }>
    productionOrders?: Array<{
      id: string
      orderNumber?: string | null
      createdAt?: string | null
      finishedGoodName?: string | null
      fullyAbsorbedCost?: number | null
      baseCost?: number | null
    }>
  }
  lists?: {
    lowStockMaterials?: Array<{
      id: string
      name?: string | null
      currentStock?: number | null
      reorderLevel?: number | null
    }>
    lowStockFinishedGoods?: Array<{
      id: string
      name?: string | null
      currentStock?: number | null
      reorderLevel?: number | null
    }>
  }
}

const shortcutGroups = [
  {
    title: 'Core Work',
    items: [
      { label: 'Projects', to: '/projects/list', icon: FolderKanban },
      { label: 'Materials', to: '/inventory/materials', icon: Package },
      { label: 'Purchases', to: '/inventory/purchases', icon: ShoppingCart },
      { label: 'Production', to: '/inventory/production', icon: Layers },
    ],
  },
  {
    title: 'Reference Data',
    items: [
      { label: 'Sales Invoices', to: '/sales-invoices', icon: FileText },
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Suppliers', to: '/inventory/suppliers', icon: Truck },
      { label: 'Customers', to: '/inventory/customers', icon: Users },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

function formatTime(value?: string | null) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  return new Intl.DateTimeFormat('en-NP', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function HomePage() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)

  const loadHomeSummary = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const result = await api.get<SummaryPayload>('/operations/summary?period=month&granularity=month')
      setSummary(result)
      setLastRefreshedAt(new Date().toISOString())
    } catch (err: any) {
      setError(err?.message || 'Failed to load the home dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadHomeSummary('initial')
  }, [])

  const stats = useMemo(() => {
    const counts = summary?.counts || {}
    const moneyData = summary?.money || {}
    return [
      {
        label: 'Sales this month',
        value: money(moneyData.salesTotal),
        tone: 'emerald' as const,
        hint: 'Current period sales invoices',
      },
      {
        label: 'Purchases this month',
        value: money(moneyData.purchaseValue),
        tone: 'slate' as const,
        hint: 'Purchasing activity in the same period',
      },
      {
        label: 'Open invoices',
        value: counts.openInvoices ?? 0,
        tone: 'amber' as const,
        hint: 'Invoices still carrying a balance',
      },
      {
        label: 'Stock alerts',
        value: (counts.lowStockMaterials ?? 0) + (counts.lowStockFinishedGoods ?? 0),
        tone: 'rose' as const,
        hint: 'Raw materials and finished goods below reorder',
      },
    ]
  }, [summary])

  const recentInvoices = summary?.recent?.invoices || []
  const recentPurchases = summary?.recent?.purchases || []
  const recentProduction = summary?.recent?.productionOrders || []
  const lowStockMaterials = summary?.lists?.lowStockMaterials || []
  const lowStockFinishedGoods = summary?.lists?.lowStockFinishedGoods || []
  const periodLabel = summary?.period?.label || 'This month'
  const urgentItems = [
    {
      label: 'Open invoices',
      value: summary?.counts?.openInvoices ?? 0,
      tone: 'amber',
      text: 'Review balances and follow up on overdue accounts.',
      to: '/sales-invoices',
    },
    {
      label: 'Low stock materials',
      value: lowStockMaterials.length,
      tone: 'rose',
      text: 'Raw material reorder points need attention.',
      to: '/inventory/materials',
    },
    {
      label: 'Low stock articles',
      value: lowStockFinishedGoods.length,
      tone: 'rose',
      text: 'Finished goods below target stock levels.',
      to: '/inventory/finished-goods',
    },
  ] as const

  return (
    <InventoryPageShell
      eyebrow="Operations"
      title="Home"
      description="A quick dashboard for sales, inventory, and reporting."
      actions={[
        { label: 'Refresh', variant: 'outline', onClick: () => loadHomeSummary('refresh') },
        { label: 'Open Reports', variant: 'primary', to: '/reports' },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">{periodLabel}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{summary?.period?.granularity || 'month'} granularity</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{loading ? 'loading...' : lastRefreshedAt ? `updated ${formatTime(lastRefreshedAt)}` : 'just now'}</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Operations at a glance</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
              <Link to="/sales-invoices" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sales</div>
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                  Invoices
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
              <Link to="/inventory/purchases" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supply</div>
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                  Purchases
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
              <Link to="/inventory/production" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Floor</div>
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                  Production
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
              <Link to="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Insight</div>
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                  Reports
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
          <div className="space-y-6">
            <InventorySectionCard title="Current performance" description="The numbers you need before you start the day.">
              <InventoryStatGrid
                stats={stats}
                layoutClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              />
            </InventorySectionCard>

            <div className="grid gap-6 lg:grid-cols-3">
              {urgentItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{item.value}</div>
                    </div>
                    <AlertTriangle className={`h-5 w-5 ${item.tone === 'amber' ? 'text-amber-500' : 'text-rose-500'}`} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                </Link>
              ))}
            </div>

            <InventorySectionCard title="Recent activity" description="The latest documents created in the system.">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Sales invoices
                  </div>
                  {recentInvoices.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent invoices yet.</div>
                  ) : (
                    recentInvoices.slice(0, 4).map((invoice) => (
                      <Link
                        key={invoice.id}
                        to={`/sales-invoices/${invoice.id}/edit`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{invoice.invoiceNumber || invoice.id}</div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{invoice.customerName || '-'}</span><span className="font-semibold text-blue-700">Edit</span></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">{money(invoice.grandTotal)}</div>
                            <div className="text-xs text-slate-500">{formatNepaliDate(invoice.invoiceDate || '')}</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShoppingCart className="h-4 w-4 text-slate-400" />
                    Purchases
                  </div>
                  {recentPurchases.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent purchases yet.</div>
                  ) : (
                    recentPurchases.slice(0, 4).map((purchase) => (
                      <Link
                        key={purchase.id}
                        to={`/inventory/purchases/${purchase.id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{purchase.invoiceNumber || purchase.supplierName || purchase.id}</div>
                            <div className="mt-1 text-xs text-slate-500">{purchase.supplierName || '-'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">{money(purchase.totalAmount)}</div>
                            <div className="text-xs text-slate-500">{formatNepaliDate(purchase.invoiceDate || '')}</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    Production
                  </div>
                  {recentProduction.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No recent production yet.</div>
                  ) : (
                    recentProduction.slice(0, 4).map((order) => (
                      <Link
                        key={order.id}
                        to={`/inventory/production/${order.id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{order.orderNumber || order.id}</div>
                            <div className="mt-1 text-xs text-slate-500">{order.finishedGoodName || '-'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">{money(order.fullyAbsorbedCost ?? order.baseCost)}</div>
                            <div className="text-xs text-slate-500">{formatNepaliDate(order.createdAt || '')}</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </InventorySectionCard>
          </div>

          <div className="space-y-6">
            <InventorySectionCard title="Quick launch" description="Move straight into the areas people use most.">
              <div className="space-y-4">
                {shortcutGroups.map((group) => (
                  <div key={group.title}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                        >
                          <item.icon className="h-4 w-4 text-slate-400" />
                          <span className="flex-1">{item.label}</span>
                          <ArrowUpRight className="h-4 w-4 text-slate-300" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Inventory pressure" description="Items that likely need action soon.">
              <div className="space-y-3">
                {lowStockMaterials.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to={`/inventory/materials/${item.id}`}
                    className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">{item.name || 'Material'}</div>
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

                {lowStockFinishedGoods.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to={`/inventory/finished-goods/${item.id}`}
                    className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">{item.name || 'Article'}</div>
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

                {lowStockMaterials.length === 0 && lowStockFinishedGoods.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No inventory pressure right now.
                  </div>
                ) : null}
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="System shortcuts" description="Secondary navigation for reference screens.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link to="/reports" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                  Reports
                </Link>
                <Link to="/inventory/customers" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                  Customers
                </Link>
                <Link to="/inventory/suppliers" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                  Suppliers
                </Link>
                <Link to="/settings" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                  Settings
                </Link>
              </div>
            </InventorySectionCard>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  )
}
