import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../services/api'

export default function MaterialDetail(){
  const { id } = useParams<{ id: string }>()
  const [material, setMaterial] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])

  useEffect(()=>{
    if(!id) return
    api.get(`/inventory/materials/${id}`).then(setMaterial).catch(()=>{})
    api.get(`/inventory/materials/${id}/transactions`).then(setTransactions).catch(()=>{})
    api.get(`/inventory/materials/${id}/purchases`).then(setPurchases).catch(()=>{})
    api.get(`/inventory/materials/${id}/prices`).then(setPrices).catch(()=>{})
  },[id])

  if(!material) return <div>Loading...</div>

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
          <button className="px-3 py-2 border rounded">Adjust Stock</button>
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
    </div>
  )
}
