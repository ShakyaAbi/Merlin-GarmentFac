import React, { useEffect, useMemo, useState } from 'react'
import { request } from '../../services/apiClient'

type Item = { id?: string; rawMaterialId: string; quantity: number; unit: string; unitPrice: string }

export default function PurchaseCreate() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<Item[]>([{ rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => {
    request('/inventory/suppliers').then(setSuppliers).catch(()=>{})
    request('/inventory/materials').then(setMaterials).catch(()=>{})
  }, [])

  const addLine = () => setItems([...items, { rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const removeLine = (idx:number) => setItems(items.filter((_,i)=>i!==idx))
  const updateLine = (idx:number, patch:Partial<Item>) => { const copy = [...items]; copy[idx] = { ...copy[idx], ...patch }; setItems(copy) }

  const lineValid = (it: Item) => {
    if (!it.rawMaterialId) return false
    if (!it.quantity || Number(it.quantity) <= 0) return false
    if (!it.unitPrice || Number(it.unitPrice) < 0) return false
    return true
  }

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice || 0)), 0), [items])

  const validate = () => {
    const e: Record<string,string> = {}
    if (!supplierId) e['supplier'] = 'Supplier is required'
    if (items.length === 0) e['items'] = 'At least one item is required'
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
    const payload = { supplierId, items: items.map(({ rawMaterialId, quantity, unit, unitPrice }) => ({ rawMaterialId, quantity, unit, unitPrice })) }
    try {
      const res = await request('/inventory/purchases', { method: 'POST', body: payload })
      alert('Purchase created: ' + (res as any).id)
      window.location.hash = '/inventory/purchases'
    } catch (err:any) { alert('Error: ' + (err?.message || 'failed')) }
    setSubmitting(false)
  }

  const anyInvalid = !supplierId || items.some(it => !lineValid(it))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Create Purchase</h1>

      <div>
        <label className="block text-sm font-medium text-slate-700">Supplier</label>
        <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="mt-1 block w-72 p-2 border rounded">
          <option value="">Select supplier</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {errors['supplier'] && <div className="text-xs text-red-600 mt-1">{errors['supplier']}</div>}
      </div>

      <div>
        <h2 className="text-lg font-medium">Items</h2>
        {errors['items'] && <div className="text-xs text-red-600 mt-1">{errors['items']}</div>}
        {items.map((it, idx) => (
          <div key={idx} className="p-3 border rounded mt-2 flex items-center gap-3">
            <select value={it.rawMaterialId} onChange={e=>updateLine(idx,{ rawMaterialId: e.target.value })} className="p-2 border rounded">
              <option value="">Select material</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" value={it.quantity} onChange={e=>updateLine(idx,{ quantity: Number(e.target.value) })} className="p-2 w-24 border rounded" />
            <input type="text" value={it.unit} onChange={e=>updateLine(idx,{ unit: e.target.value })} className="p-2 w-24 border rounded" />
            <input type="text" value={it.unitPrice} onChange={e=>updateLine(idx,{ unitPrice: e.target.value })} className="p-2 w-32 border rounded" />
            <div className="ml-auto text-sm text-slate-600">Line: {(Number(it.quantity) * Number(it.unitPrice || 0)).toFixed(2)}</div>
            <button onClick={()=>removeLine(idx)} className="text-red-500 px-2">Remove</button>
            <div className="w-full">
              {errors[`item.${idx}.material`] && <div className="text-xs text-red-600">{errors[`item.${idx}.material`]}</div>}
              {errors[`item.${idx}.quantity`] && <div className="text-xs text-red-600">{errors[`item.${idx}.quantity`]}</div>}
              {errors[`item.${idx}.unitPrice`] && <div className="text-xs text-red-600">{errors[`item.${idx}.unitPrice`]}</div>}
            </div>
          </div>
        ))}
        <div className="mt-2">
          <button onClick={addLine} className="px-3 py-2 bg-blue-600 text-white rounded">Add item</button>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
        <div>
          <div className="text-sm text-slate-600">Total</div>
          <div className="text-xl font-bold">{total.toFixed(2)}</div>
        </div>
        <div>
          <button disabled={anyInvalid || submitting} onClick={submit} className={`px-4 py-2 rounded ${anyInvalid ? 'bg-slate-300 text-slate-600' : 'bg-green-600 text-white'}`}>
            {submitting ? 'Creating...' : 'Create Purchase'}
          </button>
        </div>
      </div>
    </div>
  )
}
