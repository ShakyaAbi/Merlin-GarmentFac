import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, ShoppingCart, Plus } from 'lucide-react'
import { salesInvoiceApi, SalesInvoiceCustomer, SalesInvoiceProduct, SalesInvoicePayload } from '../../services/salesInvoiceApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { Button } from '../../components/ui/Button'
import { InvoiceItemTable, InvoiceDraftItem } from '../../components/sales/InvoiceItemTable'
import { InvoiceTotalsCard } from '../../components/sales/InvoiceTotalsCard'
import { showErrorToast } from '../../services/toast'

const today = new Date().toISOString().slice(0, 10)
const VAT_RATE = 0.13

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `line_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0)

const toMoneyString = (value: number) => value.toFixed(2)

const calculateLineTax = (item: Pick<InvoiceDraftItem, 'quantity' | 'unitPrice' | 'discountAmount'>) => {
  const subtotal = toNumber(item.quantity) * toNumber(item.unitPrice)
  const taxable = Math.max(subtotal - toNumber(item.discountAmount), 0)
  return taxable * VAT_RATE
}

const normalizeItem = (item: InvoiceDraftItem): InvoiceDraftItem => ({
  ...item,
  taxAmount: toMoneyString(calculateLineTax(item)),
})

const calculateSummary = (items: InvoiceDraftItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice), 0)
  const discountAmount = items.reduce((sum, item) => sum + toNumber(item.discountAmount), 0)
  const taxableAmount = Math.max(subtotal - discountAmount, 0)
  const taxAmount = taxableAmount * VAT_RATE
  const grandTotal = Math.max(taxableAmount + taxAmount, 0)

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    nonTaxableAmount: 0,
    taxAmount,
    grandTotal,
    paidAmount: 0,
    dueAmount: grandTotal,
    invoiceStatus: 'DRAFT' as const,
    paymentStatus: 'UNPAID' as const,
    printedCount: 0,
    lineCount: items.length,
  }
}

const formatCustomer = (customer: SalesInvoiceCustomer) => {
  const parts = [customer.phone, customer.panVatNumber].filter(Boolean)
  return parts.length > 0 ? parts.join(' | ') : customer.customerType || 'Customer'
}

const formatProductPrice = (product: SalesInvoiceProduct) => money(product.sellingPrice ?? product.costPrice ?? 0)
type SalesInvoiceDetail = Awaited<ReturnType<typeof salesInvoiceApi.get>>

export default function SalesInvoiceCreatePage() {
  const navigate = useNavigate()
  const { id: invoiceId } = useParams<{ id?: string }>()
  const isEditing = Boolean(invoiceId)
  const [customers, setCustomers] = useState<SalesInvoiceCustomer[]>([])
  const [products, setProducts] = useState<SalesInvoiceProduct[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState<InvoiceDraftItem[]>([
    {
      id: createId(),
      productId: '',
      productCode: '',
      productName: '',
      quantity: '1',
      unitPrice: '0',
      discountAmount: '0',
      taxAmount: '0',
      warehouseId: '',
    },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedInvoice, setLoadedInvoice] = useState<SalesInvoiceDetail | null>(null)

  useEffect(() => {
    let alive = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [customerData, productData, invoiceData] = await Promise.all([
          salesInvoiceApi.listCustomers(),
          salesInvoiceApi.listProducts(),
          invoiceId ? salesInvoiceApi.get(invoiceId) : Promise.resolve(null),
        ])

        if (!alive) return

        setCustomers(Array.isArray(customerData) ? customerData : [])
        setProducts(Array.isArray(productData) ? productData : [])

        if (invoiceData) {
          const invoiceDateValue = invoiceData.invoiceDate ? invoiceData.invoiceDate.slice(0, 10) : today
          const invoiceNumberValue =
            invoiceData.invoiceNumber ||
            (await salesInvoiceApi.previewNextInvoiceNumber(invoiceDateValue))

          setLoadedInvoice(invoiceData)
          setInvoiceNumber(invoiceNumberValue)
          setCustomerId(invoiceData.customerId || '')
          setInvoiceDate(invoiceDateValue)
          setDueDate(invoiceData.dueDate ? invoiceData.dueDate.slice(0, 10) : '')
          setRemarks(invoiceData.remarks || '')
          setItems(
            (invoiceData.items || []).map((item) => ({
              id: item.id,
              productId: item.productId || '',
              productCode: item.productCode || '',
              productName: item.productName || '',
              quantity: String(item.quantity ?? 0),
              unitPrice: String(item.unitPrice ?? 0),
              discountAmount: String(item.discountAmount ?? 0),
              taxAmount: String(item.taxAmount ?? 0),
              warehouseId: item.warehouseId || '',
            })),
          )
          if (invoiceData.invoiceStatus && !['DRAFT', 'PENDING_APPROVAL'].includes(String(invoiceData.invoiceStatus))) {
            setError('This invoice is no longer editable. Duplicate it instead.')
          }
        } else {
          setLoadedInvoice(null)
          if (customerId) return
          if (customerData?.[0]?.id) {
            setCustomerId(customerData[0].id)
          }
          const nextInvoiceNumber = await salesInvoiceApi.previewNextInvoiceNumber(today)
          if (!invoiceNumber) {
            setInvoiceNumber(nextInvoiceNumber)
          }
        }
      } catch (err: any) {
        if (!alive) return
        setError(err?.message || 'Failed to load customers and articles.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadData()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId])

  useEffect(() => {
    if (isEditing) return
    let alive = true
    void (async () => {
      try {
        const nextInvoiceNumber = await salesInvoiceApi.previewNextInvoiceNumber(invoiceDate)
        if (alive) setInvoiceNumber(nextInvoiceNumber)
      } catch {
        if (alive) {
          const year = new Date(invoiceDate).getFullYear()
          setInvoiceNumber(`SI-${year}-00001`)
        }
      }
    })()

    return () => {
      alive = false
    }
  }, [invoiceDate, isEditing])

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) =>
      [customer.customerName, customer.phone, customer.panVatNumber, customer.customerType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [customerSearch, customers])

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) =>
      [product.name, product.productCode, product.sku, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [productSearch, products])

  const summary = useMemo(() => calculateSummary(items), [items])

  const updateItem = (id: string, patch: Partial<InvoiceDraftItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        const next = normalizeItem({ ...item, ...patch })
        return next
      }),
    )
  }

  const addBlankItem = () => {
    setItems((current) => [
      ...current,
      {
        id: createId(),
        productId: '',
        productCode: '',
        productName: '',
        quantity: '1',
        unitPrice: '0',
        discountAmount: '0',
        taxAmount: toMoneyString(0),
        warehouseId: '',
      },
    ])
  }

  const addProductLine = (product: SalesInvoiceProduct) => {
    const existingCode = product.productCode || product.sku || product.id
    const unitPrice = String(product.sellingPrice ?? 0)
    setItems((current) => [
      ...current,
      {
        id: createId(),
        productId: product.id,
        productCode: existingCode,
        productName: product.name,
        quantity: '1',
        unitPrice,
        discountAmount: '0',
        taxAmount: toMoneyString(calculateLineTax({ quantity: '1', unitPrice, discountAmount: '0' })),
        warehouseId: product.category || 'Articles',
      },
    ])
  }

  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id))

  const buildPayload = (): SalesInvoicePayload => ({
    invoiceNumber: invoiceNumber.trim(),
    customerId,
    invoiceDate,
    dueDate: dueDate || undefined,
    remarks: remarks || undefined,
    taxAmount: summary.taxAmount,
    items: items.map((item) => ({
      productId: item.productId || undefined,
      productCode: item.productCode || undefined,
      productName: item.productName.trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      discountAmount: Number(item.discountAmount || 0),
      taxAmount: calculateLineTax(item),
      lineTotal: Math.max(Number(item.quantity || 0) * Number(item.unitPrice || 0) - Number(item.discountAmount || 0) + calculateLineTax(item), 0),
      warehouseId: item.warehouseId || undefined,
    })),
    invoiceStatus: 'DRAFT',
    paymentStatus: 'UNPAID',
  })

  const validate = () => {
    if (!customerId) return 'Select a customer.'
    if (!invoiceNumber.trim()) return 'Invoice number is required.'
    if (items.length === 0) return 'Add at least one article line.'
    for (const item of items) {
      if (!item.productId && !item.productName.trim()) return 'Every line needs an article product.'
      if (Number(item.quantity || 0) <= 0) return 'Each line must have a positive quantity.'
      if (Number(item.unitPrice || 0) < 0) return 'Unit prices cannot be negative.'
    }
    return null
  }

  const saveInvoice = async (nextSteps: Array<'submit' | 'issue'> = []) => {
    const validationMessage = validate()
    if (validationMessage) {
      setError(validationMessage)
      showErrorToast('Cannot save invoice', validationMessage)
      return
    }

    setSaving(nextSteps.join('+') || (isEditing ? 'update' : 'draft'))
    setError(null)
    try {
      let invoice = isEditing && invoiceId
        ? await salesInvoiceApi.update(invoiceId, buildPayload())
        : await salesInvoiceApi.create(buildPayload())
      for (const step of nextSteps) {
        invoice = step === 'submit' ? await salesInvoiceApi.submit(invoice.id) : await salesInvoiceApi.issue(invoice.id)
      }
      navigate(`/sales-invoices/${invoice.id}`)
    } catch (err: any) {
      const message = err?.message || 'Failed to save invoice.'
      setError(message)
    } finally {
      setSaving(null)
    }
  }

  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const pageTitle = isEditing ? 'Edit Sales Invoice' : 'New Sales Invoice'
  const pageDescription = isEditing
    ? 'Update a draft or pending-approval invoice before it is issued.'
    : 'Build invoices around articles and let Merlin manage the sales workflow.'
  const saveLabel = isEditing ? 'Save Changes' : 'Save Draft'
  const currentInvoiceStatus = String(loadedInvoice?.invoiceStatus || '')
  const isPendingApproval = currentInvoiceStatus === 'PENDING_APPROVAL'
  const submitLabel = isEditing ? 'Save & Submit' : 'Submit'
  const issueLabel = isEditing ? 'Save & Issue' : 'Save & Issue'
  const editLocked = Boolean(loadedInvoice && !['DRAFT', 'PENDING_APPROVAL'].includes(String(loadedInvoice.invoiceStatus || '')))

  return (
    <InventoryPageShell
      eyebrow="Sales"
      title={pageTitle}
      description={pageDescription}
      backTo={{ to: isEditing && invoiceId ? `/sales-invoices/${invoiceId}` : '/sales-invoices', label: isEditing ? 'Back to invoice' : 'Back to invoices' }}
      actions={[
        { label: 'Invoices', variant: 'outline', to: '/sales-invoices' },
        { label: 'New Line', variant: 'secondary', onClick: addBlankItem },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid
        stats={[
          { label: 'Customer selected', value: selectedCustomer?.customerName || 'Choose one' },
          { label: 'Lines', value: items.length },
          { label: 'Grand total', value: money(summary.grandTotal) },
          { label: 'Due amount', value: money(summary.dueAmount), tone: 'warning' },
        ]}
      />

      {editLocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          This invoice is already {String(loadedInvoice?.invoiceStatus || '').toLowerCase()} and should be duplicated instead of edited in place.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
      <InventorySectionCard title="Invoice Header" description="Choose the customer and invoice dates before adding article lines.">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500" role="status" aria-live="polite">
                Loading customers and articles...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block text-slate-600">Customer search</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search customer name, phone, PAN/VAT, or type"
                    />
                  </div>
                </label>

                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block text-slate-600">Customer</span>
                  <select
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Select customer</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Invoice Number</span>
                  <input
                    value={invoiceNumber}
                    readOnly
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
                    placeholder="SI-2026-00001"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Invoice date</span>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Due date (optional)</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block text-slate-600">Remarks</span>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="Optional invoice remarks"
                  />
                </label>
              </div>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Invoice Items" description="Use the catalog on the right to add article lines quickly.">
            <InvoiceItemTable
              items={items}
              products={products}
              taxEditable={false}
              showWarehouse={false}
              onAddItem={addBlankItem}
              onRemoveItem={removeItem}
              onChangeItem={updateItem}
            />
          </InventorySectionCard>

          <InvoiceTotalsCard
            summary={summary}
            footer={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => saveInvoice()} isLoading={saving === (isEditing ? 'update' : 'draft')} disabled={editLocked}>
                  {saveLabel}
                </Button>
                {isEditing && isPendingApproval ? (
                  <Button type="button" onClick={() => saveInvoice(['issue'])} isLoading={saving === 'issue'} disabled={editLocked}>
                    Issue
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => saveInvoice(['submit'])} isLoading={saving === 'submit'} disabled={editLocked}>
                      {submitLabel}
                    </Button>
                    <Button type="button" onClick={() => saveInvoice(['submit', 'issue'])} isLoading={saving === 'submit+issue'} disabled={editLocked}>
                      {issueLabel}
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>

        <div className="space-y-6">
          <InventorySectionCard
            title="Finished-Goods Catalog"
            description="Pick ready-to-sell products. This replaces the old raw-material purchase mindset."
          >
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <ShoppingCart className="h-4 w-4" />
              Add products from the catalog to build the invoice.
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Search catalog</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by product code, SKU, or name"
                />
              </div>
            </label>

            <div className="mt-4 space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProductLine(product)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500">
                        {product.productCode || product.sku || product.id} | {product.unit || 'pcs'}
                      </div>
                      {product.category ? <div className="mt-1 text-xs text-slate-500">{product.category}</div> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-slate-900">{formatProductPrice(product)}</div>
                      <div className="text-xs text-slate-500">Selling price</div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No articles found.
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={addBlankItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add blank line
              </Button>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Customer Snapshot" description="Who the invoice is being raised for.">
            {selectedCustomer ? (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">{selectedCustomer.customerName}</div>
                <div>{selectedCustomer.phone || 'No phone'} </div>
                <div>{selectedCustomer.email || 'No email'}</div>
                <div>{selectedCustomer.panVatNumber || 'No PAN/VAT'}</div>
                <div>{formatCustomer(selectedCustomer)}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Select a customer to preview their details.</div>
            )}
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
