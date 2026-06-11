import React from 'react'

type Column = {
  label: string
  className?: string
  scope?: 'col'
}

type Props = {
  caption: string
  columns: Column[]
  children: React.ReactNode
  emptyState?: React.ReactNode
}

export function InventoryDataTable({ caption, columns, children, emptyState }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-slate-500">
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th key={column.label} className={`py-3 font-medium ${column.className || ''}`} scope={column.scope ?? 'col'}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {emptyState}
    </div>
  )
}
