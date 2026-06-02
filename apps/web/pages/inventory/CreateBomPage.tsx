import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function CreateBomPage(){
  const [params] = useSearchParams()
  const materialId = params.get('material')
  const [name, setName] = useState('')
  const [garmentStyle, setGarmentStyle] = useState('')
  const [items, setItems] = useState<any[]>( materialId ? [{ rawMaterialId: materialId, consumption: 1, unit: 'pcs' }] : [])
  const nav = useNavigate()

  const addItem = () => setItems([...items, { rawMaterialId: '', consumption: 0, unit: 'pcs' }])

  const save = async ()=>{
    const payload = { name, garmentStyle, items }
    const res = await fetch('/api/v1/boms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    if(res.ok) nav('/inventory/materials')
    else alert('Failed')
  }

  return (
    <div>
      <h1>Create BOM</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm">Name</label>
          <input className="w-full p-2 border rounded" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Garment Style</label>
          <input className="w-full p-2 border rounded" value={garmentStyle} onChange={e=>setGarmentStyle(e.target.value)} />
        </div>

        <div>
          <h3 className="font-semibold">Items</h3>
          {items.map((it, idx)=> (
            <div key={idx} className="flex gap-2 items-center">
              <input className="p-2 border rounded" placeholder="rawMaterialId" value={it.rawMaterialId} onChange={e=>{ const next=[...items]; next[idx].rawMaterialId=e.target.value; setItems(next) }} />
              <input className="p-2 border rounded w-24" type="number" value={it.consumption} onChange={e=>{ const next=[...items]; next[idx].consumption=Number(e.target.value); setItems(next) }} />
              <input className="p-2 border rounded w-24" value={it.unit} onChange={e=>{ const next=[...items]; next[idx].unit=e.target.value; setItems(next) }} />
            </div>
          ))}
          <div className="mt-2"><button onClick={addItem} className="px-3 py-1 border rounded">Add Item</button></div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={()=>nav(-1)} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">Save BOM</button>
        </div>
      </div>
    </div>
  )
}
