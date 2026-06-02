import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../services/api'
import { Modal } from '../../components/ui/Modal'

export default function MaterialDetail(){
  const { id } = useParams<{ id: string }>()
  const [material, setMaterial] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [boms, setBoms] = useState<any[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  useEffect(()=>{
    if(!id) return
    api.get(`/inventory/materials/${id}`).then(setMaterial).catch(()=>{})
    api.get(`/inventory/materials/${id}/transactions`).then(setTransactions).catch(()=>{})
    api.get(`/inventory/materials/${id}/purchases`).then(setPurchases).catch(()=>{})
    api.get(`/inventory/materials/${id}/prices`).then(setPrices).catch(()=>{})
    api.get(`/inventory/materials/${id}/boms`).then(setBoms).catch(()=>{})
  },[id])

  if(!material) return <div>Loading...</div>

  const handleSaveEdit = async (payload:any) => {
    try{
      const updated = await api.put(`/inventory/materials/${material.id}`, payload)
      setMaterial(updated)
      setShowEdit(false)
    }catch(err:any){ alert('Update failed: '+err.message) }
  }

  const handleAdjust = async (payload:any) => {
    try{
      const tx = await api.post(`/inventory/materials/${material.id}/adjust-stock`, payload)
      setTransactions([tx, ...transactions])
      // refresh stock
      const refreshed = await api.get(`/inventory/materials/${material.id}`)
      setMaterial(refreshed)
      setShowAdjust(false)
    }catch(err:any){ alert('Adjust failed: '+err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/inventory/materials" className="text-sm text-blue-600">← Back</Link>
          <h1 className="text-2xl font-semibold">{material.name} <span className="text-sm text-slate-500">{material.sku}</span></h1>
          <div className="text-sm text-slate-600">Unit: {material.defaultUnit} · Cost: {material.costPrice || 'N/A'}</div>
        </div>
        <div className="space-x-2">
          <Link to={`/inventory/purchases/create?material=${material.id}`} className="px-3 py-2 bg-blue-600 text-white rounded">Create Purchase</Link>
          <button onClick={()=>setShowAdjust(true)} className="px-3 py-2 border rounded">Adjust Stock</button>
          <button onClick={()=>setShowEdit(true)} className="px-3 py-2 border rounded">Edit Material</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold">Stock Transactions</h3>
            <table className="w-full text-left mt-3">
              <thead><tr><th>Date</th><th>Change</th><th>Reason</th><th>Ref</th></tr></thead>
              <tbody>
                {transactions.map((t:any)=> <tr key={t.id}><td>{new Date(t.createdAt).toLocaleString()}</td><td>{t.change}</td><td>{t.reason}</td><td>{t.referenceId}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="p-4 bg-white rounded shadow mb-4">
            <h3 className="font-semibold">Summary</h3>
            <div className="mt-2 text-sm text-slate-600">Current stock: {material.currentStock}</div>
            <div className="mt-1 text-sm text-slate-600">Reorder level: {material.reorderLevel ?? 'Not set'}</div>
          </div>

          <div className="p-4 bg-white rounded shadow mb-4">
            <h3 className="font-semibold">Price History</h3>
            <ul className="mt-2 text-sm text-slate-600">
              {prices.map((p:any)=> <li key={p.purchaseId}>{new Date(p.date).toLocaleDateString()} — {p.unitPrice} ({p.quantity})</li>)}
            </ul>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold">Recent Purchases</h3>
            <ul className="mt-2 text-sm text-slate-600">
              {purchases.map((p:any)=> <li key={p.id}>{new Date(p.createdAt).toLocaleDateString()} — {p.supplier?.name} — {p.totalAmount}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded shadow mt-4">
        <h3 className="font-semibold">Bill of Materials (BOMs using this material)</h3>
        {boms.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">No BOMs reference this material.</div>
        ) : (
          <table className="w-full text-left mt-3">
            <thead><tr><th>Garment</th><th>Consumption</th><th>Unit</th><th>Yield</th></tr></thead>
            <tbody>
              {boms.map((b:any)=> <tr key={b.id}><td>{b.garmentStyle}</td><td>{b.consumption}</td><td>{b.unit}</td><td>{b.yield ?? '—'}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showEdit} onClose={()=>setShowEdit(false)} title={`Edit ${material.name}`} size="md">
        <EditMaterialForm material={material} onCancel={()=>setShowEdit(false)} onSave={handleSaveEdit} />
      </Modal>

      <Modal isOpen={showAdjust} onClose={()=>setShowAdjust(false)} title={`Adjust stock — ${material.name}`} size="md">
        <AdjustStockForm material={material} onCancel={()=>setShowAdjust(false)} onSave={handleAdjust} />
      </Modal>
    </div>
  )
}

function EditMaterialForm({ material, onCancel, onSave }: any){
  const [form, setForm] = useState({ name: material.name, sku: material.sku || '', defaultUnit: material.defaultUnit || '', reorderLevel: material.reorderLevel || 0, costPrice: material.costPrice || '' })
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm">Name</label>
        <input className="w-full p-2 border rounded" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm">SKU</label>
        <input className="w-full p-2 border rounded" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm">Default Unit</label>
          <input className="w-full p-2 border rounded" value={form.defaultUnit} onChange={e=>setForm({...form, defaultUnit:e.target.value})} />
        </div>
        <div className="w-32">
          <label className="block text-sm">Reorder</label>
          <input type="number" className="w-full p-2 border rounded" value={form.reorderLevel} onChange={e=>setForm({...form, reorderLevel: Number(e.target.value)})} />
        </div>
      </div>
      <div>
        <label className="block text-sm">Cost Price</label>
        <input className="w-full p-2 border rounded" value={form.costPrice} onChange={e=>setForm({...form, costPrice:e.target.value})} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
        <button onClick={()=>onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </div>
  )
}

function AdjustStockForm({ material, onCancel, onSave }: any){
  const [change, setChange] = useState(0)
  const [unit, setUnit] = useState(material.defaultUnit || '')
  const [reason, setReason] = useState('adjustment')
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm">Change (use negative to reduce)</label>
        <input type="number" className="w-full p-2 border rounded" value={change} onChange={e=>setChange(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-sm">Unit</label>
        <input className="w-full p-2 border rounded" value={unit} onChange={e=>setUnit(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm">Reason</label>
        <input className="w-full p-2 border rounded" value={reason} onChange={e=>setReason(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
        <button onClick={()=>onSave({ change, unit, reason })} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
      </div>
    </div>
  )
}
