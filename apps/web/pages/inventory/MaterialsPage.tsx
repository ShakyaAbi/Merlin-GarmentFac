import React, { useEffect, useState } from 'react'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  useEffect(() => { fetch('/api/v1/inventory/materials').then(r => r.json()).then(setMaterials) }, [])
  return (
    <div>
      <h1>Materials</h1>
      <ul>{materials.map(m => <li key={m.id}>{m.name} — {m.defaultUnit}</li>)}</ul>
    </div>
  )
}
