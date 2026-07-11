import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../services/apiClient'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await request<any[]>('/inventory/alerts')
      setAlerts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const ack = async (id: string) => {
    await request(`/inventory/alerts/${id}/ack`, { method: 'POST' })
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  const unresolvedCount = alerts.filter((a) => !a.acknowledged).length

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Alerts"
      description="Track low stock and acknowledge what has been reviewed."
      actions={[
        { label: 'Materials', variant: 'outline', to: '/inventory/materials' },
        { label: 'Purchases', variant: 'outline', to: '/inventory/purchases' },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <InventoryStatGrid
        stats={[
          { label: 'Total alerts', value: alerts.length },
          { label: 'Unresolved', value: unresolvedCount, tone: 'warning' },
          { label: 'Status', value: loading ? 'Loading' : 'Live' },
        ]}
      />

      <InventorySectionCard title="Low Stock Alerts" description="Acknowledge alerts once the issue has been reviewed.">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500" role="status" aria-live="polite">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No alerts yet.</div>
        ) : (
          <InventoryDataTable
            caption="Inventory alert list"
            columns={[
              { label: 'Material' },
              { label: 'Triggered' },
              { label: 'Status' },
              { label: 'Action' },
            ]}
          >
            {alerts.map((alert) => (
              <tr key={alert.id} className="border-b border-slate-100 last:border-0">
                <th className="py-2 font-medium text-slate-900" scope="row">
                  {alert.rawMaterialId ? (
                    <Link
                      to={`/inventory/materials/${alert.rawMaterialId}`}
                      className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {alert.rawMaterial?.name || 'Unknown material'}
                    </Link>
                  ) : (
                    alert.rawMaterial?.name || 'Unknown material'
                  )}
                  {alert.rawMaterial?.sku ? (
                    <div className="mt-0.5 text-xs text-slate-500">EXIM CODE: {alert.rawMaterial.sku}</div>
                  ) : null}
                </th>
                <td className="py-2 text-slate-600">{alert.createdAt || '—'}</td>
                <td className="py-2 text-slate-600">{alert.acknowledged ? 'Acknowledged' : 'Open'}</td>
                <td className="py-2">
                  {!alert.acknowledged ? (
                    <button
                      type="button"
                      onClick={() => ack(alert.id)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="text-slate-400">Done</span>
                  )}
                </td>
              </tr>
            ))}
          </InventoryDataTable>
        )}
      </InventorySectionCard>
    </InventoryPageShell>
  )
}
