import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'

type Action = {
  label: string
  onClick?: () => void
  to?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

type Props = {
  title: string
  status?: React.ReactNode
  actions?: Action[]
  leftRail?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

const linkBtnClass = {
  primary: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 hover:-translate-y-0.5 h-11 px-4 py-2 text-sm',
  secondary: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200 h-11 px-4 py-2 text-sm',
  outline: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-slate-400 h-11 px-4 py-2 text-sm',
  danger: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 hover:-translate-y-0.5 h-11 px-4 py-2 text-sm',
} as const

export function InventoryDocumentShell({ title, status, actions = [], leftRail, children, footer }: Props) {
  const hasLeftRail = Boolean(leftRail)

  return (
    <div className={hasLeftRail ? 'grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]' : 'space-y-6'}>
      {hasLeftRail ? (
        <aside className="sticky top-6 space-y-4 self-start">
          {leftRail}
        </aside>
      ) : null}

      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
              {status ? <div className="flex-shrink-0">{status}</div> : null}
            </div>
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) =>
                action.to ? (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={linkBtnClass[action.variant ?? 'primary']}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <Button
                    key={action.label}
                    type="button"
                    variant={action.variant ?? 'primary'}
                    size={action.size ?? 'md'}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ),
              )}
            </div>
          ) : null}
        </div>

        {children}
        {footer ? <div>{footer}</div> : null}
      </div>
    </div>
  )
}
