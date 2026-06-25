import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { request } from '../../services/apiClient'
import { Button } from '../../components/ui/Button'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDocumentShell } from '../../components/inventory/InventoryDocumentShell'

type Item = { rawMaterialId: string; quantity: number; unit: string; unitPrice: string }

type Supplier = { id: string; name: string }
type Material = { id: string; name: string; sku?: string | null; defaultUnit?: string | null }

type TabKey = 'details' | 'items' | 'more'

const today = new Date().toISOString().slice(0, 10)

export default function PurchaseCreate() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [requiredBy, setRequiredBy] = useState('')
  const [company, setCompany] = useState('Merlin Lite')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([{ rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const selectedMaterial = searchParams.get('material')
  const [invoiceNumber, setInvoiceNumber] = useState('')

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
      if (current.length === 0) return [{ rawMaterialId: selectedMaterial, quantity: 1, unit: 'unit', unitPrice: '0' }]
      const next = [...current]
      next[0] = { ...next[0], rawMaterialId: selectedMaterial }
      return next
    })
  }, [selectedMaterial])

  const addLine = () => setItems((current) => [...current, { rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const removeLine = (idx: number) => setItems((current) => current.filter((_, i) => i !== idx))
  const updateLine = (idx: number, patch: Partial<Item>) => {
    const copy = [...items]
    copy[idx] = { ...copy[idx], ...patch }
    setItems(copy)
  }

  const totalAmount = useMemo(() => items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice || 0), 0), [items])
  const totalQty = useMemo(() => items.reduce((sum, it) => sum + Number(it.quantity || 0), 0), [items])
  const anyInvalid =
    !supplierId ||
    !invoiceNumber.trim() ||
    items.some((it) => !it.rawMaterialId || !it.quantity || Number(it.quantity) <= 0 || !it.unitPrice || Number(it.unitPrice) < 0)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!supplierId) e.supplier = 'Supplier is required'
    if (!invoiceNumber.trim()) e.invoiceNumber = 'Invoice number is required'
    if (!company.trim()) e.company = 'Company is required'
    if (items.length === 0) e.items = 'At least one item is required'
    items.forEach((it, idx) => {
      if (!it.rawMaterialId) e[`item.${idx}.material`] = 'Select material'
      if (!it.quantity || Number(it.quantity) <= 0) e[`item.${idx}.quantity`] = 'Quantity must be > 0'
      if (!it.unitPrice || Number(it.unitPrice) < 0) e[`item.${idx}.unitPrice`] = 'Unit price required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    const payload = {
      supplierId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: today,
      notes: notes.trim() || undefined,
      items: items.map(({ rawMaterialId, quantity, unit, unitPrice }) => ({ rawMaterialId, quantity, unit, unitPrice })),
    }
    try {
      const res = await request('/inventory/purchases', { method: 'POST', body: payload })
      alert(`Purchase created: ${(res as any).id}`)
      navigate('/inventory/purchases')
    } catch (err: any) {
      alert(`Error: ${err?.message || 'failed'}`)
    }
    setSubmitting(false)
  }

  return (
    <InventoryDocumentShell
      title="Purchase Invoice"
      status={<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">Not Saved</span>}
      actions={[
        { label: 'Save', onClick: submit, disabled: submitting || anyInvalid || loading },
        { label: 'Cancel', variant: 'outline', to: '/inventory/purchases' },
      ]}
      leftRail={
        null
      }
      footer={
        <InventorySectionCard title="Activity">
          <div className="space-y-2 text-sm text-slate-600">
            <div>Purchase orders can be reviewed after save from the list view.</div>
            <div>Purchase invoices update raw-material stock and supplier ledger balances automatically.</div>
            <div>Use the material detail page to trace stock impact and price history.</div>
          </div>
        </InventorySectionCard>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {[
          { key: 'details', label: 'Details' },
          { key: 'items', label: 'Items' },
          { key: 'more', label: 'More Info' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorBlock(errors)}

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
                value={today}
                readOnly
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Company *</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={company} onChange={(e) => setCompany(e.target.value)} />
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
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
              <span className="mb-1 block text-slate-600">Required By</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
              />
            </label>
          </div>
        )}
      </InventorySectionCard>

      {activeTab === 'items' && (
        <InventorySectionCard
          title="Items"
          description="Raw material lines in a dense table layout."
          action={<Button type="button" variant="outline" onClick={addLine}>Add Multiple</Button>}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Purchase order items</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all rows" /></th>
                    <th className="px-4 py-3 font-semibold">No.</th>
                    <th className="px-4 py-3 font-semibold">Item Code *</th>
                    <th className="px-4 py-3 font-semibold">Required By *</th>
                    <th className="px-4 py-3 font-semibold">Quantity *</th>
                    <th className="px-4 py-3 font-semibold">UOM *</th>
                    <th className="px-4 py-3 font-semibold">Rate (NPR)</th>
                    <th className="px-4 py-3 font-semibold">Amount (NPR)</th>
                    <th className="w-14 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const selected = materials.find((m) => m.id === it.rawMaterialId)
                    const amount = Number(it.quantity || 0) * Number(it.unitPrice || 0)
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 align-top"><input type="checkbox" aria-label={`Select row ${idx + 1}`} /></td>
                        <td className="px-4 py-3 align-top font-medium text-slate-900">{idx + 1}</td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={it.rawMaterialId}
                            onChange={(e) => {
                              const next = materials.find((m) => m.id === e.target.value)
                              updateLine(idx, { rawMaterialId: e.target.value, unit: next?.defaultUnit || it.unit })
                            }}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          >
                            <option value="">Select material</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}{m.sku ? ` • ${m.sku}` : ''}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-xs text-slate-500">
                            {selected ? `${selected.name}${selected.sku ? ` • ${selected.sku}` : ''}` : 'Choose a material'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="date"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            value={requiredBy}
                            onChange={(e) => setRequiredBy(e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-right"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input className="w-24 rounded-xl border border-slate-300 px-3 py-2" value={it.unit} onChange={(e) => updateLine(idx, { unit: e.target.value })} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input type="number" value={it.unitPrice} onChange={(e) => updateLine(idx, { unitPrice: e.target.value })} className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-right" />
                        </td>
                        <td className="px-4 py-3 align-top font-medium text-slate-900">
                          {amount.toLocaleString('en-NP', { style: 'currency', currency: 'NPR' })}
                        </td>
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>Showing 1 - {items.length} of {items.length} entries</span>
                <span>Selected: 0</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addLine}>Add Row</Button>
                <Button type="button" variant="outline" size="sm" onClick={submit} disabled={submitting || anyInvalid || loading}>
                  {submitting ? 'Saving...' : 'Save Purchase'}
                </Button>
              </div>
            </div>
          </div>
        </InventorySectionCard>
      )}

      {activeTab === 'more' && (
        <InventorySectionCard title="More Info">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Notes</span>
            <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes, supplier instructions, or receiving guidance..." />
          </label>
        </InventorySectionCard>
      )}

      <InventorySectionCard title="Summary">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total quantity</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{totalQty}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total amount (NPR)</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{totalAmount.toLocaleString('en-NP', { style: 'currency', currency: 'NPR' })}</div>
          </div>
        </div>
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
