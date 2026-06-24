import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Filter, Plus, RefreshCw, Search } from 'lucide-react'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { salesOrderApi, SalesOrder, SalesOrderCustomer, SalesOrderPayload, SalesOrderProduct, SalesOrderStatus } from '../../services/salesOrderApi'
import { formatNepaliDate } from '../../utils/nepaliDate'

const today = new Date().toISOString().slice(0, 10)

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `line_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'FULFILLED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

type DraftLine = {
  id: string
  productId: string
  quantity: string
  unitPrice: string
}

export default function SalesOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<SalesOrderCustomer[]>([])
  const [products, setProducts] = useState<SalesOrderProduct[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatus | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [orderDate, setOrderDate] = useState(today)
  const [requiredBy, setRequiredBy] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([{ id: createId(), productId: '', quantity: '1', unitPrice: '0' }])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [orderData, customerData, productData] = await Promise.all([
        salesOrderApi.list(),
        salesOrderApi.listCustomers(),
        salesOrderApi.listProducts(),
      ])
      setOrders(Array.isArray(orderData) ? orderData : [])
      setCustomers(Array.isArray(customerData) ? customerData : [])
      setProducts(Array.isArray(productData) ? productData : [])
      if (!customerId && customerData?.[0]?.id) setCustomerId(customerData[0].id)
    } catch (err: any) {
      setError(err?.message || 'Failed to load sales orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      const customerName = order.customer?.customerName || ''
      const haystack = [order.orderNumber, customerName, order.notes, order.items?.map((item) => item.productName).join(' ')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesStatus = statusFilter === 'ALL' ? true : order.status === statusFilter
      return matchesStatus && (query ? haystack.includes(query) : true)
    })
  }, [orders, search, statusFilter])

  const stats = useMemo(() => {
    const total = filteredOrders.length
    const draft = filteredOrders.filter((order) => order.status === 'DRAFT').length
    const confirmed = filteredOrders.filter((order) => order.status === 'CONFIRMED').length
    const totalValue = filteredOrders.reduce((sum, order) => sum + Number(order.grandTotal ?? 0), 0)
    return [
      { label: 'Orders shown', value: total },
      { label: 'Draft orders', value: draft, tone: 'warning' as const },
      { label: 'Confirmed orders', value: confirmed, tone: 'success' as const },
      { label: 'Order value', value: money(totalValue) },
    ]
  }, [filteredOrders])

  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const selectedLinesTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity || 0)
        const rate = Number(line.unitPrice || 0)
        return sum + qty * rate
      }, 0),
    [lines],
  )

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const addLine = () => {
    setLines((current) => [...current, { id: createId(), productId: '', quantity: '1', unitPrice: '0' }])
  }

  const removeLine = (id: string) => {
    setLines((current) => current.filter((line) => line.id !== id))
  }

  const buildPayload = (): SalesOrderPayload => ({
    customerId,
    orderDate,
    requiredBy: requiredBy || undefined,
    notes: notes || undefined,
    items: lines
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
      })),
  })

  const validate = () => {
    if (!customerId) return 'Select a customer.'
    if (!lines.some((line) => line.productId)) return 'Add at least one article item.'
    if (lines.some((line) => line.productId && Number(line.quantity || 0) <= 0)) return 'Order quantities must be greater than zero.'
    return null
  }

  const saveOrder = async () => {
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await salesOrderApi.create(buildPayload())
      navigate('/sales-orders')
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to save sales order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Sales"
      title="Sales Orders"
      description="Capture customer demand before invoicing and keep article sales separate from inventory consumption."
      actions={[
        { label: 'Refresh', variant: 'outline', onClick: loadData },
        { label: 'New Order', onClick: () => document.getElementById('sales-order-form')?.scrollIntoView({ behavior: 'smooth' }) },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <InventorySectionCard title="Order Register" description="Search customer orders and open them for review or invoicing.">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search order number, customer, note, or item"
                />
              </label>

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as SalesOrderStatus | 'ALL')}
                  className="bg-transparent outline-none"
                >
                  {['ALL', 'DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED'].map((option) => (
                    <option key={option} value={option}>
                      {option === 'ALL' ? 'All statuses' : option.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="button" variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading sales orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
                No sales orders match the current filters.
              </div>
            ) : (
              <InventoryDataTable
                caption="Sales order register"
                columns={[
                  { label: 'Order' },
                  { label: 'Customer' },
                  { label: 'Date' },
                  { label: 'Total' },
                  { label: 'Status' },
                  { label: 'Actions' },
                ]}
              >
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-3 py-4 align-top">
                      <div className="font-semibold text-slate-900">{order.orderNumber || order.id}</div>
                      <div className="text-xs text-slate-500">{order.items?.length || 0} line(s)</div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="font-medium text-slate-900">{order.customer?.customerName || 'Unknown customer'}</div>
                      <div className="text-xs text-slate-500">{order.notes || 'No notes'}</div>
                    </td>
                    <td className="px-3 py-4 align-top text-slate-600">{formatNepaliDate(order.orderDate)}</td>
                    <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(order.grandTotal)}</td>
                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/sales-orders/${order.id}`)}>
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <div id="sales-order-form">
          <InventorySectionCard
            title="New Sales Order"
            description="Build a sales order from articles. Inventory only changes later when the invoice is issued."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-slate-600">Customer</span>
                <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Order date</span>
                <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Required by</span>
                <input type="date" value={requiredBy} onChange={(event) => setRequiredBy(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>

              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-slate-600">Notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Optional order notes" />
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Order lines</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add line
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => {
                  const selectedProduct = products.find((product) => product.id === line.productId)
                  const lineQuantity = Number(line.quantity || 0)
                  const lineRequiredMaterials = selectedProduct?.materialRequirements?.map((requirement) => ({
                    ...requirement,
                    requiredQuantity: requirement.quantityPerUnit * lineQuantity,
                  })) ?? []

                  return (
                    <div key={line.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,2fr)_120px_140px_96px]">
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-600">Finished good</span>
                        <select value={line.productId} onChange={(event) => {
                          const productId = event.target.value
                          const product = products.find((item) => item.id === productId)
                          updateLine(line.id, { productId, unitPrice: String(product?.sellingPrice ?? 0) })
                        }} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} {product.productCode || product.sku ? ` - ${product.productCode || product.sku}` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-600">Qty</span>
                        <input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-600">Unit price</span>
                        <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                      </label>
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                          Remove
                        </Button>
                      </div>
                      <div className="md:col-span-4 text-xs text-slate-500">
                        Line {index + 1} is billed from articles only. Line amount: {money(lineQuantity * Number(line.unitPrice || 0))}
                      </div>
                      {lineRequiredMaterials.length > 0 ? (
                        <div className="md:col-span-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <div className="font-semibold">Required materials</div>
                          <div className="mt-2 grid gap-1 sm:grid-cols-2">
                            {lineRequiredMaterials.map((material) => (
                              <div key={material.materialId || material.materialName} className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate">
                                  {material.materialName}{material.sku ? ` (${material.sku})` : ''}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {material.requiredQuantity.toLocaleString()} {material.unit || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Estimated order total: <span className="font-semibold text-slate-900">{money(selectedLinesTotal)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveOrder} isLoading={saving}>
                  Save Sales Order
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/sales-invoices/create')}>
                  Create Invoice Instead
                </Button>
              </div>
            </div>
          </InventorySectionCard>
          </div>
        </div>

        <div className="space-y-6">
          <InventorySectionCard title="Customer Snapshot" description="The customer currently selected for the new order.">
            {selectedCustomer ? (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{selectedCustomer.customerName}</div>
                <div>{selectedCustomer.phone || 'No phone'}</div>
                <div>{selectedCustomer.email || 'No email'}</div>
                <div>{selectedCustomer.customerType || 'No customer type'}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a customer to preview details.</div>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Articles Catalog" description="Pick items from the ready-to-sell catalog.">
            <div className="space-y-2">
              {products.map((product) => (
                <button key={product.id} type="button" onClick={() => setLines((current) => [...current, { id: createId(), productId: product.id, quantity: '1', unitPrice: String(product.sellingPrice ?? 0) }])} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.productCode || product.sku || product.id}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{money(product.sellingPrice)}</div>
                  </div>
                </button>
              ))}
              {products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No articles found.
                </div>
              ) : null}
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
