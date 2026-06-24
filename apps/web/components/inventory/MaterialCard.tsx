import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'

type MaterialCardProps = {
  material: {
    id: string
    name: string
    sku?: string
    description?: string
    defaultUnit?: string
    currentStock?: number
    reorderLevel?: number | null
    type?: string
    active?: boolean
  }
  onEdit?: (material: MaterialCardProps['material']) => void
}

export function MaterialCard({ material, onEdit }: MaterialCardProps) {
  const currentStock = Number(material.currentStock ?? 0)
  const reorderLevel = material.reorderLevel ?? null
  const hasTarget = reorderLevel != null && Number.isFinite(Number(reorderLevel)) && Number(reorderLevel) > 0
  const progress = hasTarget ? Math.min(Math.max((currentStock / Number(reorderLevel)) * 100, 0), 100) : 0
  const statusTone =
    !material.active
      ? 'bg-slate-100 text-slate-800'
      : currentStock <= Number(reorderLevel ?? 0)
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800'
  const statusLabel = !material.active ? 'Inactive' : currentStock <= Number(reorderLevel ?? 0) ? 'Low Stock' : 'Healthy'

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
            {material.type || 'Material'}
          </span>
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone}`}>{statusLabel}</span>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stock</div>
          <div className="text-lg font-bold text-slate-900">{currentStock}</div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-900">{material.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{material.description || 'No description provided.'}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SKU</span>
          <p className="mt-1 text-sm font-semibold text-slate-900">{material.sku || 'N/A'}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unit</span>
          <p className="mt-1 text-sm font-semibold text-slate-900">{material.defaultUnit || 'N/A'}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reorder</span>
          <p className="mt-1 text-sm font-semibold text-slate-900">{hasTarget ? reorderLevel : 'No target'}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Coverage</span>
          <p className="mt-1 text-sm font-semibold text-slate-900">{hasTarget ? `${Math.round(progress)}%` : 'N/A'}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Stock vs reorder</span>
          <span className="font-bold text-slate-900">{hasTarget ? `${Math.round(progress)}%` : 'No target'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${hasTarget ? (progress < 100 ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-slate-300'}`}
            style={{ width: `${hasTarget ? progress : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <Link
          to={`/inventory/materials/${material.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-200"
        >
          View
        </Link>
        <Button type="button" variant="outline" size="sm" className="px-4" onClick={() => onEdit?.(material)}>
          Edit
        </Button>
      </div>
    </div>
  )
}
