import React, { useEffect, useState } from 'react'
import { request } from '../../services/apiClient'

type Item = { rawMaterialId: string; quantity: number; unit: string; unitPrice: string }

export default function PurchaseCreate() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<Item[]>([{ rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])

  useEffect(() => { request('/inventory/suppliers').then(setSuppliers).catch(()=>{}) ; request('/inventory/materials').then(setMaterials).catch(()=>{}) }, [])

  const addLine = () => setItems([...items, { rawMaterialId: '', quantity: 1, unit: 'unit', unitPrice: '0' }])
  const updateLine = (idx:number, patch:Partial<Item>) => { const copy = [...items]; copy[idx] = { ...copy[idx], ...patch }; setItems(copy) }

  const submit = async () => {
    const payload = { supplierId, items }
    try {
      const res = await request('/inventory/purchases', { method: 'POST', body: payload })
      alert('Purchase created: ' + (res as any).id)
      window.location.hash = '/inventory/purchases'
    } catch (err:any) { alert('Error: ' + err.message) }
  }

  return (
    <div>
      <h1>Create Purchase</h1>
      <div>
        <label>Supplier</label>
        <select value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
          <option value="">Select</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <h2>Items</h2>
      {items.map((it, idx) => (
        <div key={idx} style={{border:'1px solid #ddd', padding:8, marginBottom:8}}>
          <select value={it.rawMaterialId} onChange={e=>updateLine(idx,{ rawMaterialId: e.target.value })}>
            <option value="">Select material</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="number" value={it.quantity} onChange={e=>updateLine(idx,{ quantity: Number(e.target.value) })} />
          <input type="text" value={it.unit} onChange={e=>updateLine(idx,{ unit: e.target.value })} />
          <input type="text" value={it.unitPrice} onChange={e=>updateLine(idx,{ unitPrice: e.target.value })} />
        </div>
      ))}
      <button onClick={addLine}>Add item</button>
      <div>
        <button onClick={submit}>Create Purchase</button>
      </div>
    </div>
  )
}
