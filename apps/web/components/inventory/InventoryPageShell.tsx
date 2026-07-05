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
  eyebrow?: string
  title: string
  description?: string
  backTo?: { to: string; label: string }
  actions?: Action[]
  children?: React.ReactNode
}

const linkBtnClass = {
  primary: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 hover:-translate-y-0.5 h-11 px-4 py-2 text-sm',
  secondary: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200 h-11 px-4 py-2 text-sm',
  outline: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-slate-400 h-11 px-4 py-2 text-sm',
  danger: 'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-0 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 hover:-translate-y-0.5 h-11 px-4 py-2 text-sm',
} as const

export function InventoryPageShell({ eyebrow, title, description, backTo, actions = [], children }: Props) {
  return (
    <div className="space-y-6">
      <div>
        {backTo ? (
          <Link to={backTo.to} className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-blue-600">
            {backTo.label}
          </Link>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {eyebrow ? (
              <div className="mb-2 text-xs font-semibold text-slate-500">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
            {description ? <p className="mt-1 text-slate-600">{description}</p> : null}
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
      </div>
      {children}
    </div>
  )
}
