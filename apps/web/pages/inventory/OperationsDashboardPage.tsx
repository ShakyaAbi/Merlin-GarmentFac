import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { formatNepaliDate } from '../../utils/nepaliDate'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => formatNepaliDate(value)

type DashboardFilters = {
  from?: string
  to?: string
}

export default function OperationsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<any | null>(null)
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
      setError(err?.message || 'Failed to load the operations dashboard.')
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
      { label: 'Raw materials', value: counts.materials || 0 },
      { label: 'Articles', value: counts.finishedGoods || 0, tone: 'success' as const },
      { label: 'Suppliers', value: counts.suppliers || 0 },
      { label: 'Customers', value: counts.customers || 0 },
      { label: 'Low stock materials', value: counts.lowStockMaterials || 0, tone: 'warning' as const },
      { label: 'Low stock articles', value: counts.lowStockFinishedGoods || 0, tone: 'warning' as const },
      { label: 'Sales value', value: money(moneyData.salesTotal) },
      { label: 'Open balance', value: money(moneyData.dueTotal), tone: 'warning' as const },
      { label: 'Purchase value', value: money(moneyData.purchaseValue) },
      { label: 'Expense value', value: money(moneyData.expenseTotal), tone: 'warning' as const },
      { label: 'Absorbed overhead', value: money(moneyData.absorbedOverhead), tone: 'warning' as const },
      { label: 'Production cost', value: money(moneyData.productionMaterialCost), tone: 'warning' as const },
      { label: 'Work in progress', value: money(moneyData.workInProgressCost), tone: 'warning' as const },
      { label: 'Gross margin', value: money(moneyData.grossMargin), tone: Number(moneyData.grossMargin || 0) >= 0 ? 'success' as const : 'warning' as const },
      { label: 'Open invoices', value: counts.openInvoices || 0, tone: 'warning' as const },
    ]
  }, [summary])

  const lowStockMaterials = useMemo(() => (summary?.lists?.lowStockMaterials || []).slice(0, 5), [summary])
  const lowStockFinishedGoods = useMemo(() => (summary?.lists?.lowStockFinishedGoods || []).slice(0, 5), [summary])
  const recentInvoices = useMemo(() => (summary?.recent?.invoices || []).slice(0, 8), [summary])
  const recentPurchases = useMemo(() => (summary?.recent?.purchases || []).slice(0, 8), [summary])
  const productionBatches = useMemo(() => (summary?.recent?.productionOrders || []).slice(0, 8), [summary])

  return (
    <InventoryPageShell
      eyebrow="Reports"
      title="Operations Dashboard"
      description="A Merlin-native summary of inventory, sales, and procurement using existing backend data."
      actions={[{ label: 'Refresh', variant: 'outline', onClick: () => loadDashboard('refresh'), size: 'sm' }, { label: 'Sales Invoices', to: '/sales-invoices' }]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid stats={stats} />

      <InventorySectionCard title="Reporting Period" description="Filter the operations report by date range.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>To</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={applyReportingPeriod}
                disabled={refreshing}
              >
              Apply
              </Button>
            </div>
        </div>
      </InventorySectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <InventorySectionCard title="Recent Sales Invoices" description="Issue state, payments, and balances from the sales flow.">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading dashboard...</div>
            ) : recentInvoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No invoices yet.</div>
            ) : (
              <InventoryDataTable
                caption="Recent invoices"
                columns={[
                  { label: 'Invoice' },
                  { label: 'Customer' },
                  { label: 'Date' },
                  { label: 'Total' },
                  { label: 'Due' },
                  { label: 'Status' },
                ]}
              >
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{invoice.invoiceNumber || invoice.id}</td>
                    <td className="px-3 py-4 text-slate-700">{invoice.customer?.customerName || invoice.customerName || '-'}</td>
                    <td className="px-3 py-4 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(invoice.grandTotal)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(invoice.dueAmount)}</td>
                    <td className="px-3 py-4 text-slate-700">{invoice.invoiceStatus || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Recent Purchases" description="Purchase activity feeding raw-material stock.">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading dashboard...</div>
            ) : recentPurchases.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No purchase history yet.</div>
            ) : (
              <InventoryDataTable
                caption="Recent purchases"
                columns={[
                  { label: 'Material' },
                  { label: 'Supplier' },
                  { label: 'Date' },
                  { label: 'Total' },
                ]}
              >
                {recentPurchases.map((purchase: any, index: number) => (
                  <tr key={`${purchase.id || index}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{purchase.materialName || purchase.rawMaterial?.name || '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{purchase.supplierName || purchase.supplier?.name || '-'}</td>
                    <td className="px-3 py-4 text-slate-600">{formatDate(purchase.invoiceDate || purchase.createdAt)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(purchase.totalAmount)}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Recent Production Batches" description="Planned and completed article batches visible from BOM-driven production.">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading dashboard...</div>
            ) : productionBatches.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No production batches yet.</div>
            ) : (
              <InventoryDataTable
                caption="Recent production batches"
                columns={[
                  { label: 'Batch' },
                  { label: 'Article' },
                  { label: 'Planned Qty' },
                  { label: 'Status' },
                ]}
              >
                {productionBatches.slice(0, 8).map((order: any, index: number) => (
                  <tr key={`${order.id || index}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{order.orderNumber || order.id}</td>
                    <td className="px-3 py-4 text-slate-700">{order.finishedGoodName || order.finishedGood?.name || '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{Number(order.quantityPlanned ?? 0)}</td>
                    <td className="px-3 py-4 text-slate-700">{order.status || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>
        </div>

        <div className="space-y-6">
          <InventorySectionCard title="Low Stock Raw Materials" description="Items at or below reorder point.">
            <div className="space-y-3">
              {lowStockMaterials.map((material) => (
                <div key={material.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <div className="font-medium text-slate-900">{material.name}</div>
                  <div className="text-slate-500">Stock {Number(material.currentStock ?? 0)} | Reorder {material.reorderLevel ?? 'N/A'}</div>
                </div>
              ))}
              {lowStockMaterials.length === 0 ? <div className="text-sm text-slate-500">No low-stock raw materials.</div> : null}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Low Stock Articles" description="Products that need replenishment from production.">
            <div className="space-y-3">
              {lowStockFinishedGoods.map((item) => (
                <div key={item.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-slate-500">Stock {Number(item.currentStock ?? 0)} | Reorder {item.reorderLevel ?? 'N/A'}</div>
                </div>
              ))}
              {lowStockFinishedGoods.length === 0 ? <div className="text-sm text-slate-500">No low-stock articles.</div> : null}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Overhead Allocation" description="Expense buckets used to absorb manufacturing overhead.">
            <div className="space-y-3">
              {(summary?.lists?.overheadAllocations || []).length === 0 ? (
                <div className="text-sm text-slate-500">No overhead buckets detected.</div>
              ) : (
                (summary?.lists?.overheadAllocations || []).map((bucket: any) => (
                  <div key={bucket.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">{bucket.label}</span>
                    <span className="text-slate-700">{money(bucket.value)}</span>
                  </div>
                ))
              )}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Absorbed Production Cost" description="Overhead allocated across production batches by base manufacturing cost.">
            <div className="space-y-3">
              {(summary?.lists?.productionOrderAllocations || []).length === 0 ? (
                <div className="text-sm text-slate-500">No production batches available for allocation.</div>
              ) : (
                (summary?.lists?.productionOrderAllocations || []).map((order: any) => (
                  <div key={order.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{order.orderNumber}</span>
                      <span className="text-slate-700">{money(order.fullyAbsorbedCost)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-slate-500">
                      <span>{order.finishedGoodName}</span>
                      <span>{order.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => window.location.hash = '#/inventory/materials'}>
                Materials
              </Button>
              <Button type="button" variant="outline" onClick={() => window.location.hash = '#/inventory/finished-goods'}>
                Articles
              </Button>
              <Button type="button" variant="outline" onClick={() => window.location.hash = '#/inventory/purchases'}>
                Purchases
              </Button>
              <Button type="button" variant="outline" onClick={() => window.location.hash = '#/sales-invoices'}>
                Sales Invoices
              </Button>
              <Button type="button" variant="outline" onClick={() => window.location.hash = '#/expenses'}>
                Expenses
              </Button>
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
