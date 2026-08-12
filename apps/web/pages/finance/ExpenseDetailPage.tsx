import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { Button } from '../../components/ui/Button'
import { expenseApi, Expense, ExpenseStatus } from '../../services/expenseApi'
import { formatNepaliDate } from '../../utils/nepaliDate'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

type ExpenseForm = {
  category: string
  vendor: string
  description: string
  amount: string
  expenseDate: string
  status: ExpenseStatus
  paymentDate: string
  notes: string
}

const toForm = (expense: Expense): ExpenseForm => ({
  category: expense.category || '',
  vendor: expense.vendor || '',
  description: expense.description || '',
  amount: String(expense.amount ?? ''),
  expenseDate: expense.expenseDate ? expense.expenseDate.slice(0, 10) : '',
  status: expense.status,
  paymentDate: expense.paymentDate ? expense.paymentDate.slice(0, 10) : '',
  notes: expense.notes || '',
})

export default function ExpenseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpenseForm | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await expenseApi.get(id)
      setExpense(data)
      setForm(toForm(data))
    } catch (err: any) {
      setError(err?.message || 'Failed to load expense.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const updateForm = (field: keyof ExpenseForm, value: string) =>
    setForm((current) => current ? { ...current, [field]: value } : current)

  const save = async () => {
    if (!id || !form) return
    setSaving(true)
    setError(null)
    try {
      const updated = await expenseApi.update(id, {
        category: form.category.trim(),
        vendor: form.vendor.trim() || undefined,
        description: form.description.trim(),
        amount: Number(form.amount),
        expenseDate: form.expenseDate || undefined,
        status: form.status,
        paymentDate: form.paymentDate || undefined,
        notes: form.notes.trim() || undefined,
      })
      setExpense(updated)
      setForm(toForm(updated))
      setEditing(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to update expense.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!id || !window.confirm('Delete this expense? It will be marked void.')) return
    setSaving(true)
    setError(null)
    try {
      await expenseApi.remove(id)
      navigate('/expenses')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete expense.')
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    if (expense) setForm(toForm(expense))
    setEditing(false)
  }

  return (
    <InventoryPageShell
      eyebrow="Finance"
      title={expense?.description || 'Expense'}
      backTo={{ to: '/expenses', label: 'Back to expenses' }}
      actions={expense ? [
        editing
          ? { label: 'Cancel', variant: 'outline', onClick: cancelEdit }
          : { label: 'Edit Expense', onClick: () => setEditing(true) },
        { label: 'Delete Expense', variant: 'danger', onClick: remove },
      ] : []}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading expense...</div>
      ) : expense && form ? (
        <InventorySectionCard title={editing ? 'Edit expense' : 'Expense details'}>
          {editing ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.category} onChange={(e) => updateForm('category', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Category" />
              <input value={form.vendor} onChange={(e) => updateForm('vendor', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Vendor" />
              <input value={form.description} onChange={(e) => updateForm('description', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Description" />
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Amount" />
              <input type="date" value={form.expenseDate} onChange={(e) => updateForm('expenseDate', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              <select value={form.status} onChange={(e) => updateForm('status', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">
                {(['APPROVED', 'PAID', 'VOID'] as ExpenseStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input type="date" value={form.paymentDate} onChange={(e) => updateForm('paymentDate', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
              <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Notes" />
              <div className="md:col-span-2"><Button type="button" onClick={save} isLoading={saving}>Save Expense</Button></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><div className="text-xs uppercase text-slate-500">Date</div><div className="font-medium">{formatNepaliDate(expense.expenseDate)}</div></div>
              <div><div className="text-xs uppercase text-slate-500">Status</div><div className="font-medium">{expense.status}</div></div>
              <div><div className="text-xs uppercase text-slate-500">Category</div><div className="font-medium">{expense.category}</div></div>
              <div><div className="text-xs uppercase text-slate-500">Vendor</div><div className="font-medium">{expense.vendor || '-'}</div></div>
              <div><div className="text-xs uppercase text-slate-500">Amount</div><div className="font-medium">{money(expense.amount)}</div></div>
              <div><div className="text-xs uppercase text-slate-500">Payment date</div><div className="font-medium">{expense.paymentDate ? formatNepaliDate(expense.paymentDate) : '-'}</div></div>
              <div className="md:col-span-2"><div className="text-xs uppercase text-slate-500">Description</div><div className="font-medium">{expense.description}</div></div>
              <div className="md:col-span-2"><div className="text-xs uppercase text-slate-500">Notes</div><div className="font-medium">{expense.notes || '-'}</div></div>
            </div>
          )}
        </InventorySectionCard>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Expense not found.</div>
      )}
    </InventoryPageShell>
  )
}
