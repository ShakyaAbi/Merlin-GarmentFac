import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { request } from '../../services/apiClient'
import { Button } from '../../components/ui/Button'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDocumentShell } from '../../components/inventory/InventoryDocumentShell'
import { calculateInvoiceTotals } from '../../components/invoices/invoiceTotals'

type Item = { rawMaterialId: string; quantity: number; unit: string; unitPrice: string }

type Supplier = { id: string; name: string; phone?: string | null; email?: string | null; address?: string | null }
type Material = { id: string; name: string; sku?: string | null; defaultUnit?: string | null; costPrice?: number | null; averageUnitCost?: number | null }

const today = new Date().toISOString().slice(0, 10)

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

const getMaterialRate = (material?: Material | null) => Number(material?.costPrice ?? material?.averageUnitCost ?? 0)

export default function PurchaseCreate() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([{ rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const selectedMaterial = searchParams.get('material')

  useEffect(() => {
    let alive = true

    Promise.all([request('/inventory/suppliers'), request('/inventory/materials')])
      .then(([supplierData, materialData]) => {
        if (!alive) return
        const supplierRows = Array.isArray(supplierData) ? supplierData : Array.isArray((supplierData as any)?.data) ? (supplierData as any).data : []
        const materialRows = Array.isArray(materialData) ? materialData : Array.isArray((materialData as any)?.data) ? (materialData as any).data : []
        setSuppliers(supplierRows)
        setMaterials(materialRows)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!selectedMaterial) return
    setItems((current) => {
      const selected = materials.find((material) => material.id === selectedMaterial)
      const unitPrice = String(getMaterialRate(selected))
      if (current.length === 0) return [{ rawMaterialId: selectedMaterial, quantity: 1, unit: 'unit', unitPrice: '0' }]
      const next = [...current]
      next[0] = {
        ...next[0],
        rawMaterialId: selectedMaterial,
        unit: selected?.defaultUnit || next[0].unit,
        unitPrice,
      }
      return next
    })
  }, [materials, selectedMaterial])

  const addLine = () => setItems((current) => [...current, { rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const removeLine = (idx: number) => setItems((current) => current.filter((_, i) => i !== idx))
  const updateLine = (idx: number, patch: Partial<Item>) => {
    const copy = [...items]
    copy[idx] = { ...copy[idx], ...patch }
    setItems(copy)
  }

  const totals = useMemo(
    () => {
      const subtotal = Number(
        calculateInvoiceTotals({
          lines: items.map((item) => ({
            id: item.rawMaterialId || `${item.quantity}-${item.unitPrice}`,
            quantity: Number(item.quantity ?? 0),
            rate: Number(item.unitPrice ?? 0),
          })),
          vatRate: 0.13,
        }).subtotal,
      )
      const discount = Math.max(Number(discountAmount || 0), 0)
      const taxableAmount = Math.max(subtotal - discount, 0)
      const taxAmount = Number((taxableAmount * 0.13).toFixed(2))
      const grandTotal = Number((taxableAmount + taxAmount).toFixed(2))

      return { subtotal, discountAmount: discount, taxableAmount, taxAmount, grandTotal }
    },
    [discountAmount, items],
  )
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items])
  const selectedSupplier = useMemo(() => suppliers.find((supplier) => supplier.id === supplierId) || null, [suppliers, supplierId])
  const anyInvalid =
    !supplierId ||
    !invoiceNumber.trim() ||
    !invoiceDate ||
    Number(discountAmount || 0) < 0 ||
    items.some((item) => !item.rawMaterialId || !item.quantity || Number(item.quantity) <= 0 || !item.unitPrice || Number(item.unitPrice) < 0)

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!supplierId) nextErrors.supplier = 'Supplier is required'
    if (!invoiceNumber.trim()) nextErrors.invoiceNumber = 'Invoice number is required'
    if (!invoiceDate) nextErrors.invoiceDate = 'Invoice date is required'
    if (items.length === 0) nextErrors.items = 'At least one item is required'
    items.forEach((item, idx) => {
      if (!item.rawMaterialId) nextErrors[`item.${idx}.material`] = 'Select material'
      if (!item.quantity || Number(item.quantity) <= 0) nextErrors[`item.${idx}.quantity`] = 'Quantity must be greater than zero'
      if (!item.unitPrice || Number(item.unitPrice) < 0) nextErrors[`item.${idx}.unitPrice`] = 'Unit price is required'
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const payload = {
      supplierId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate: dueDate || undefined,
      discountAmount: Number(discountAmount || 0),
      notes: notes.trim() || undefined,
      items: items.map(({ rawMaterialId, quantity, unit, unitPrice }) => ({ rawMaterialId, quantity, unit, unitPrice })),
    }
    try {
      const res = await request('/inventory/purchases', { method: 'POST', body: payload })
      alert(`Purchase created: ${(res as any).id}`)
      navigate('/inventory/purchases')
    } catch (err: any) {
      alert(`Error: ${err?.message || 'failed'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const leftRail = (
    <div className="space-y-4">
      <InventorySectionCard title="Document Snapshot">
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className="font-semibold text-orange-700">Not Saved</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Supplier</span>
            <span className="font-semibold text-slate-900">{selectedSupplier?.name || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Invoice No.</span>
            <span className="font-semibold text-slate-900">{invoiceNumber || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Invoice Date</span>
            <span className="font-semibold text-slate-900">{invoiceDate || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Due Date</span>
            <span className="font-semibold text-slate-900">{dueDate || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span className="font-semibold text-slate-900">{money(totals.discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Lines</span>
            <span className="font-semibold text-slate-900">{items.length}</span>
          </div>
        </div>
      </InventorySectionCard>

      <InventorySectionCard title="Tax Breakdown">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{money(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>VAT 13%</span>
            <span className="font-semibold text-slate-900">{money(totals.taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-700">Grand total</span>
            <span className="font-bold text-slate-950">{money(totals.grandTotal)}</span>
          </div>
        </div>
      </InventorySectionCard>

      <InventoryStatGrid
        layoutClassName="grid grid-cols-1 gap-3"
        density="compact"
        stats={[
          { label: 'Total quantity', value: totalQty },
          { label: 'Subtotal', value: money(totals.subtotal) },
          { label: 'VAT 13%', value: money(totals.taxAmount), tone: 'warning' },
          { label: 'Grand total', value: money(totals.grandTotal), tone: 'success' },
        ]}
      />
    </div>
  )

  const mobileSummary = (
    <div className="grid grid-cols-2 gap-3 xl:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
        <div className="mt-1 font-semibold text-orange-700">Not Saved</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Lines</div>
        <div className="mt-1 font-semibold text-slate-900">{items.length}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Subtotal</div>
        <div className="mt-1 font-semibold text-slate-900">{money(totals.subtotal)}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Grand total</div>
        <div className="mt-1 font-semibold text-emerald-700">{money(totals.grandTotal)}</div>
      </div>
    </div>
  )

  return (
    <InventoryDocumentShell
      title="Purchase Invoice"
      status={<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">Not Saved</span>}
      actions={[
        { label: 'Save', onClick: submit, disabled: submitting || anyInvalid || loading },
        { label: 'Cancel', variant: 'outline', to: '/inventory/purchases' },
      ]}
      leftRail={<div className="hidden xl:block">{leftRail}</div>}
      footer={
        <InventorySectionCard title="Activity">
          <div className="space-y-2 text-sm text-slate-600">
            <div>Purchase invoices update raw-material stock and supplier ledger balances automatically.</div>
            <div>Use the material detail page to trace stock impact and price history.</div>
          </div>
        </InventorySectionCard>
      }
    >
      {errorBlock(errors)}

      {mobileSummary}

      <InventorySectionCard
        title="Details"
        description="Supplier and purchase-invoice metadata."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={addLine}>
              Add Row
            </Button>
            <Button type="button" onClick={submit} disabled={submitting || anyInvalid || loading}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500" role="status" aria-live="polite">
            Loading purchase context...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Date *</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                aria-invalid={Boolean(errors.invoiceDate)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Due date (optional)</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Supplier *</span>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                aria-invalid={Boolean(errors.supplier)}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Invoice Number *</span>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Supplier invoice number"
                aria-invalid={Boolean(errors.invoiceNumber)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Discount amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="0.00"
              />
            </label>
            <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              VAT is calculated automatically at 13% from the subtotal after discount. Due date is optional. The summary on the left updates as you change quantities and rates.
            </div>
          </div>
        )}
      </InventorySectionCard>

      <InventorySectionCard
        title="Items"
        description="Raw material lines in a dense table layout."
        action={<Button type="button" variant="outline" onClick={addLine}>Add Row</Button>}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Purchase invoice items</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Material *</th>
                  <th className="px-4 py-3 font-semibold">Qty *</th>
                  <th className="px-4 py-3 font-semibold">Unit *</th>
                  <th className="px-4 py-3 font-semibold">Rate (NPR)</th>
                  <th className="px-4 py-3 font-semibold">Amount (NPR)</th>
                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const selected = materials.find((material) => material.id === item.rawMaterialId)
                  const amount = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 align-top font-medium text-slate-900">{idx + 1}</td>
                      <td className="px-4 py-3 align-top">
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => {
                            const next = materials.find((material) => material.id === e.target.value)
                            updateLine(idx, {
                              rawMaterialId: e.target.value,
                              unit: next?.defaultUnit || item.unit,
                              unitPrice: String(getMaterialRate(next)),
                            })
                          }}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        >
                          <option value="">Select material</option>
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name}
                              {material.sku ? ` - ${material.sku}` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="mt-1 text-xs text-slate-500">
                          {selected ? `${selected.name}${selected.sku ? ` - ${selected.sku}` : ''}` : 'Choose a material'}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                          className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-right"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          className="w-24 rounded-xl border border-slate-300 px-3 py-2"
                          value={item.unit}
                          onChange={(e) => updateLine(idx, { unit: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-900">
                          {money(Number(item.unitPrice || 0))}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Pulled from material cost
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-slate-900">{money(amount)}</td>
                      <td className="px-4 py-3 align-top">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={items.length === 1}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:grid-cols-3 lg:grid-cols-6">
          <span>Items: {items.length}</span>
          <span>Total quantity: {totalQty}</span>
          <span>Subtotal: {money(totals.subtotal)}</span>
          <span>Discount: {money(totals.discountAmount)}</span>
          <span>VAT 13%: {money(totals.taxAmount)}</span>
          <span className="font-semibold text-slate-900">Grand total: {money(totals.grandTotal)}</span>
        </div>
      </InventorySectionCard>

      <InventorySectionCard title="More Info">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Notes</span>
          <textarea
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes, supplier instructions, or receiving guidance..."
          />
        </label>
      </InventorySectionCard>
    </InventoryDocumentShell>
  )
}

function errorBlock(errors: Record<string, string>) {
  const messages = Object.values(errors)
  if (messages.length === 0) return null
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {messages[0]}
    </div>
  )
}
