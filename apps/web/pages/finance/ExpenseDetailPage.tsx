import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { expenseApi, Expense } from '../../services/expenseApi'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function ExpenseDetailPage() {
  const { id } = useParams()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    expenseApi.get(id).then(setExpense).catch((err: any) => setError(err?.message || 'Failed to load expense.')).finally(() => setLoading(false))
  }, [id])

  return (
    <InventoryPageShell eyebrow="Finance" title={expense?.description || 'Expense'} backTo={{ to: '/expenses', label: 'Back to expenses' }}>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading expense...</div>
      ) : expense ? (
        <InventorySectionCard title="Expense details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><div className="text-xs uppercase text-slate-500">Date</div><div className="font-medium">{expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : '-'}</div></div>
            <div><div className="text-xs uppercase text-slate-500">Status</div><div className="font-medium">{expense.status}</div></div>
            <div><div className="text-xs uppercase text-slate-500">Category</div><div className="font-medium">{expense.category}</div></div>
            <div><div className="text-xs uppercase text-slate-500">Vendor</div><div className="font-medium">{expense.vendor || '-'}</div></div>
            <div><div className="text-xs uppercase text-slate-500">Amount</div><div className="font-medium">{money(expense.amount)}</div></div>
            <div className="md:col-span-2"><div className="text-xs uppercase text-slate-500">Description</div><div className="font-medium">{expense.description}</div></div>
            <div className="md:col-span-2"><div className="text-xs uppercase text-slate-500">Notes</div><div className="font-medium">{expense.notes || '-'}</div></div>
          </div>
        </InventorySectionCard>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Expense not found.</div>
      )}
    </InventoryPageShell>
  )
}
