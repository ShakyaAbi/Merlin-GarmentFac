import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { AnomalyNotification } from '../../types'
import { formatNepaliDateTime } from '../../utils/nepaliDate'

type InventoryAlertItem = {
  id: string
  rawMaterialId: string
  createdAt?: string | null
  acknowledged?: boolean
  rawMaterial?: {
    id: string
    name: string
    sku?: string | null
  } | null
}

type LowStockFinishedGoodItem = {
  id: string
  name: string
  currentStock?: number | null
  reorderLevel?: number | null
  sku?: string | null
  productCode?: string | null
}

type Props = {
  notifications: AnomalyNotification[]
  overdueNotifications: any[]
  inventoryAlerts: InventoryAlertItem[]
  lowStockFinishedGoods: LowStockFinishedGoodItem[]
  unreadCount: number
  onClose: () => void
  onMarkAllRead: () => void
  markingRead: boolean
  onAckInventoryAlert: (id: string) => void
}

export function NotificationsMenu({
  notifications,
  overdueNotifications,
  inventoryAlerts,
  lowStockFinishedGoods,
  unreadCount,
  onClose,
  onMarkAllRead,
  markingRead,
  onAckInventoryAlert,
}: Props) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose}></div>
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in slide-in-from-top-2">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} alerts attention` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              disabled={markingRead}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {markingRead ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
          {overdueNotifications.length > 0 &&
            overdueNotifications.map((n) => (
              <Link
                key={n.id}
                to={`/indicators/${n.indicatorId}`}
                onClick={onClose}
                className="px-4 py-3 hover:bg-amber-50/60 flex gap-3 transition-colors cursor-pointer group block"
              >
                <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-amber-700 truncate">
                      {n.indicatorName} Overdue
                    </p>
                    <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">
                      Overdue
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {n.projectName}
                  </p>
                  <p className="text-xs text-amber-600 mt-1 line-clamp-2">
                    Last report was {n.daysOverdue} days ago. Expected {n.expectedFrequency.toLowerCase()}.
                  </p>
                </div>
              </Link>
            ))}

          {inventoryAlerts.length > 0 && (
            <div className="px-4 py-3 bg-slate-50/30">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Inventory Alerts
                </p>
                <Link
                  to="/inventory/alerts"
                  onClick={onClose}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Open page
                </Link>
              </div>
              <div className="space-y-2">
                {inventoryAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to={alert.rawMaterialId ? `/inventory/materials/${alert.rawMaterialId}` : '/inventory/alerts'}
                    onClick={onClose}
                    className="block rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {alert.rawMaterial?.name || 'Unknown material'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Low stock alert
                          {alert.createdAt ? ` - ${formatNepaliDateTime(alert.createdAt)}` : ''}
                        </p>
                      </div>
                      {!alert.acknowledged ? (
                        <button
                          type="button"
                          onClick={() => onAckInventoryAlert(alert.id)}
                          className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {lowStockFinishedGoods.length > 0 && (
            <div className="px-4 py-3 bg-slate-50/30">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Low Stock Articles
                </p>
                <Link
                  to="/inventory/finished-goods"
                  onClick={onClose}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Open page
                </Link>
              </div>
              <div className="space-y-2">
                {lowStockFinishedGoods.map((item) => (
                  <Link
                    key={item.id}
                    to={`/inventory/finished-goods/${item.id}`}
                    onClick={onClose}
                    className="block rounded-xl border border-amber-100 bg-white px-3 py-2 shadow-sm transition hover:border-amber-200 hover:bg-amber-50/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Stock {Number(item.currentStock ?? 0)} | Reorder {item.reorderLevel ?? 'N/A'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        Open
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {notifications.length > 0 ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={`/indicators/${n.indicatorId}`}
                onClick={onClose}
                className="px-4 py-3 hover:bg-red-50/60 flex gap-3 transition-colors cursor-pointer group block"
              >
                <div className="mt-0.5 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-red-700 truncate">
                      {n.indicatorName} anomaly
                    </p>
                    {n.anomalyStatus === 'DETECTED' && (
                      <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {n.projectName}
                  </p>
                  {n.anomalyReason && (
                    <p className="text-xs text-red-600 mt-1 line-clamp-2">
                      {n.anomalyReason}
                    </p>
                  )}
                </div>
              </Link>
            ))
          ) : (
            overdueNotifications.length === 0 && (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">
                  Everything looks good!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  No anomalies or late reports.
                </p>
              </div>
            )
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-center bg-slate-50/30">
          <span className="text-xs text-slate-400">
            Last 30 days · auto-refreshes every 60s
          </span>
        </div>
      </div>
    </>
  )
}
