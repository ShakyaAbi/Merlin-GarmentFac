import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Plus, RefreshCw, Search } from 'lucide-react'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { expenseApi, Expense, ExpenseStatus } from '../../services/expenseApi'
import { formatNepaliDate } from '../../utils/nepaliDate'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'APPROVED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'VOID':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'ALL'>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [form, setForm] = useState({ category: '', vendor: '', description: '', amount: '0', expenseDate: new Date().toISOString().slice(0, 10), notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setExpenses(await expenseApi.list({ search, status: statusFilter, category }))
    } catch (err: any) {
      setError(err?.message || 'Failed to load expenses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(() => {
    const total = expenses.length
    const paid = expenses.filter((expense) => expense.status === 'PAID').length
    const approved = expenses.filter((expense) => expense.status === 'APPROVED').length
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
    return [
      { label: 'Expenses shown', value: total },
      { label: 'Approved', value: approved, tone: 'warning' as const },
      { label: 'Paid', value: paid, tone: 'success' as const },
      { label: 'Total spend', value: money(totalAmount) },
    ]
  }, [expenses])

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await expenseApi.create({
        category: form.category,
        vendor: form.vendor || undefined,
        description: form.description,
        amount: Number(form.amount || 0),
        expenseDate: form.expenseDate,
        notes: form.notes || undefined,
      })
      setForm({ category: '', vendor: '', description: '', amount: '0', expenseDate: new Date().toISOString().slice(0, 10), notes: '' })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Finance"
      title="Expenses"
      description="Track operational spend separately from invoices so reporting can see real manufacturing overhead."
      actions={[{ label: 'Refresh', variant: 'outline', onClick: load }]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <InventoryStatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <InventorySectionCard title="Expense Register" description="Search and filter the operational expense ledger.">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search expenses" />
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | 'ALL')} className="bg-transparent outline-none">
                {['ALL', 'APPROVED', 'PAID', 'VOID'].map((option) => (
                  <option key={option} value={option}>{option === 'ALL' ? 'All statuses' : option}</option>
                ))}
              </select>
            </label>
            <Button type="button" variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading expenses...</div>
          ) : (
            <InventoryDataTable
              caption="Expense register"
              columns={[{ label: 'Date' }, { label: 'Category' }, { label: 'Vendor' }, { label: 'Description' }, { label: 'Amount' }, { label: 'Status' }, { label: 'Actions' }]}
            >
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                  <td className="px-3 py-4 align-top">{formatNepaliDate(expense.expenseDate)}</td>
                  <td className="px-3 py-4 align-top font-medium text-slate-900">{expense.category}</td>
                  <td className="px-3 py-4 align-top text-slate-600">{expense.vendor || '-'}</td>
                  <td className="px-3 py-4 align-top text-slate-700">{expense.description}</td>
                  <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(expense.amount)}</td>
                  <td className="px-3 py-4 align-top"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(expense.status)}`}>{expense.status}</span></td>
                  <td className="px-3 py-4 align-top"><Link to={`/expenses/${expense.id}`} className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">View</Link></td>
                </tr>
              ))}
            </InventoryDataTable>
          )}
        </InventorySectionCard>

        <InventorySectionCard title="New Expense" description="Create a new operating expense entry.">
          <div className="grid grid-cols-1 gap-4">
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Category" />
            <input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Vendor" />
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Description" />
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Amount" />
            <input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Notes" />
            <Button type="button" onClick={submit} isLoading={saving}><Plus className="mr-2 h-4 w-4" />Save Expense</Button>
          </div>
        </InventorySectionCard>
      </div>
    </InventoryPageShell>
  )
}
