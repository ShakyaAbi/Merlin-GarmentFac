import React from 'react'
import { Card } from '../ui/Card'

type Props = {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function InventorySectionCard({ title, description, action, children, className = '' }: Props) {
  return (
    <Card
      title={title}
      action={action}
      className={className}
    >
      {description ? <p className="mb-4 text-sm text-slate-500">{description}</p> : null}
      {children}
    </Card>
  )
}
