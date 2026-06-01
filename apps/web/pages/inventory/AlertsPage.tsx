import React, { useEffect, useState } from 'react'
import { request } from '../../services/apiClient'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  useEffect(()=>{ request('/inventory/alerts').then(setAlerts).catch(()=>{}) }, [])
  const ack = async (id:string) => { await request(`/inventory/alerts/${id}/ack`, { method: 'POST' }); setAlerts(alerts.filter(a=>a.id!==id)) }
  return (
    <div>
      <h1>Low Stock Alerts</h1>
      <ul>{alerts.map(a=> <li key={a.id}>{a.rawMaterial?.name} — {a.createdAt} <button onClick={()=>ack(a.id)}>Acknowledge</button></li>)}</ul>
    </div>
  )
}
