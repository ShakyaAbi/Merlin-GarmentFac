import React, { useEffect, useState } from 'react'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  useEffect(() => { fetch('/api/v1/inventory/suppliers').then(r => r.json()).then(setSuppliers) }, [])
  return (
    <div>
      <h1>Suppliers</h1>
      <ul>{suppliers.map(s => <li key={s.id}>{s.name}</li>)}</ul>
    </div>
  )
}
