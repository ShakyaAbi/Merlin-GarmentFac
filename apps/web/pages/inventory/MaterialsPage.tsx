import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const nav = useNavigate()
  useEffect(() => { fetch('/api/v1/inventory/materials').then(r => r.json()).then(setMaterials) }, [])
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Materials</h1>
        <div>
          <Link to="/inventory/materials/create" className="px-3 py-2 bg-green-600 text-white rounded">Create Material</Link>
        </div>
      </div>

      <table className="w-full text-left mt-4 border-collapse">
        <thead>
          <tr className="text-sm text-slate-600"><th>Name</th><th>SKU</th><th>Unit</th><th>Stock</th><th>Reorder</th><th>Type</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.id} className="border-t">
              <td><Link to={`/inventory/materials/${m.id}`} className="text-blue-600">{m.name}</Link></td>
              <td>{m.sku || '—'}</td>
              <td>{m.defaultUnit}</td>
              <td>{m.currentStock ?? '—'}</td>
              <td>{m.reorderLevel ?? '—'}</td>
              <td>{m.type || 'material'}</td>
              <td>
                <button onClick={()=>nav(`/inventory/materials/${m.id}`)} className="px-2 py-1 border rounded mr-2">View</button>
                <button onClick={async ()=>{
                    // quick create BOM action: open create BOM page with material prefilled
                    nav(`/inventory/boms/create?material=${m.id}`)
                  }} className="px-2 py-1 bg-indigo-600 text-white rounded">Create BOM</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
