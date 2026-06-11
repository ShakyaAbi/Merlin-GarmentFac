import React from 'react'

type Stat = {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'default' | 'warning' | 'success'
}

type Props = {
  stats: Stat[]
}

export function InventoryStatGrid({ stats }: Props) {
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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{stat.label}</div>
          <div className={`mt-1 text-xl font-bold ${toneClass(stat.tone)}`}>{stat.value}</div>
          {stat.hint ? <div className="mt-1 text-xs text-slate-500">{stat.hint}</div> : null}
        </div>
      ))}
    </div>
  )
}
