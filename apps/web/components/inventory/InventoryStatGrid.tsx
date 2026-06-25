import React from 'react'

type Stat = {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'default' | 'warning' | 'success'
}

type Props = {
  stats: Stat[]
  layoutClassName?: string
  density?: 'default' | 'compact'
}

export function InventoryStatGrid({ stats, layoutClassName, density = 'default' }: Props) {
  const toneClass = (tone: Stat['tone']) => {
    switch (tone) {
      case 'warning':
        return 'text-amber-700'
      case 'success':
        return 'text-emerald-700'
      default:
        return 'text-slate-900'
    }
  }

  const gridClassName =
    layoutClassName ||
    'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'

  const valueClassName = density === 'compact' ? 'mt-1 text-lg font-bold' : 'mt-1 text-xl font-bold'
  const labelClassName = density === 'compact' ? 'text-xs uppercase tracking-wide text-slate-500' : 'text-sm text-slate-500'

  return (
    <div className={gridClassName}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={labelClassName}>{stat.label}</div>
          <div className={`${valueClassName} ${toneClass(stat.tone)}`}>{stat.value}</div>
          {stat.hint ? <div className="mt-1 text-xs text-slate-500">{stat.hint}</div> : null}
        </div>
      ))}
    </div>
  )
}
