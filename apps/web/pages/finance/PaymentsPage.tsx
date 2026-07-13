import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { salesInvoiceApi, SalesInvoice, SalesPaymentStatus } from '../../services/salesInvoiceApi'
import { formatNepaliDate } from '../../utils/nepaliDate'

type PaymentRow = {
  id: string
  invoiceId: string
  invoiceNumber?: string | null
  customerName: string
  amount: number | string
  paymentDate?: string | null
  paymentMethod?: string | null
  note?: string | null
  invoiceStatus?: string | null
  paymentStatus?: string | null
}

type PaymentForm = {
  invoiceId: string
  amount: string
  paymentDate: string
  paymentMethod: string
  note: string
}

const emptyPaymentForm: PaymentForm = {
  invoiceId: '',
  amount: '',
  paymentDate: '',
  paymentMethod: 'Cash',
  note: '',
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SalesPaymentStatus | 'ALL'>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm)
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await salesInvoiceApi.list({ pageSize: 500 })
      setInvoices(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const payments = useMemo<PaymentRow[]>(() => {
    const rows: PaymentRow[] = []
    for (const invoice of invoices) {
      for (const payment of invoice.payments || []) {
        rows.push({
          id: payment.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer?.customerName || invoice.customerName || 'Walk-in customer',
          amount: payment.amount,
          paymentDate: payment.paymentDate || payment.createdAt || null,
          paymentMethod: payment.paymentMethod || payment.method || null,
          note: payment.note || payment.notes || null,
          invoiceStatus: invoice.invoiceStatus || null,
          paymentStatus: invoice.paymentStatus || null,
        })
      }
    }
    return rows
  }, [invoices])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return payments.filter((payment) => {
      const haystack = [payment.invoiceNumber, payment.customerName, payment.paymentMethod, payment.note].filter(Boolean).join(' ').toLowerCase()
      const matchesStatus = statusFilter === 'ALL' ? true : payment.paymentStatus === statusFilter
      return matchesStatus && (query ? haystack.includes(query) : true)
    })
  }, [payments, search, statusFilter])

  const openCreatePayment = () => {
    setEditingPayment(null)
    setPaymentForm(emptyPaymentForm)
    setPaymentModalOpen(true)
  }

  const openEditPayment = (payment: PaymentRow) => {
    setEditingPayment(payment)
    setPaymentForm({
      invoiceId: payment.invoiceId,
      amount: String(payment.amount ?? ''),
      paymentDate: payment.paymentDate ? String(payment.paymentDate).slice(0, 10) : '',
      paymentMethod: payment.paymentMethod || 'Cash',
      note: payment.note || '',
    })
    setPaymentModalOpen(true)
  }

  const savePayment = async () => {
    const amount = Number(paymentForm.amount)
    if (!paymentForm.invoiceId || !Number.isFinite(amount) || amount <= 0 || !paymentForm.paymentMethod.trim()) {
      setError('Choose an issued invoice and enter a positive amount and payment method.')
      return
    }

    setSavingPayment(true)
    setError(null)
    try {
      const payload = {
        amount,
        paymentMethod: paymentForm.paymentMethod.trim(),
        paymentDate: paymentForm.paymentDate || undefined,
        note: paymentForm.note.trim() || undefined,
      }
      if (editingPayment) {
        await salesInvoiceApi.updatePayment(editingPayment.invoiceId, editingPayment.id, payload)
      } else {
        await salesInvoiceApi.payment(paymentForm.invoiceId, payload)
      }
      setPaymentModalOpen(false)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  const deletePayment = async (payment: PaymentRow) => {
    if (!window.confirm(`Delete payment ${payment.id}? This will recalculate the invoice balance.`)) return
    setError(null)
    try {
      await salesInvoiceApi.deletePayment(payment.invoiceId, payment.id)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete payment.')
    }
  }

  const paymentInvoices = invoices.filter((invoice) =>
    invoice.invoiceStatus === 'ISSUED'
    && (invoice.id === paymentForm.invoiceId || Number(invoice.dueAmount ?? 0) > 0),
  )

  const stats = useMemo(() => {
    const total = filtered.length
    const collected = filtered.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const invoicesPaid = invoices.filter((invoice) => invoice.paymentStatus === 'PAID').length
    return [
      { label: 'Payments shown', value: total },
      { label: 'Collected', value: money(collected), tone: 'success' as const },
      { label: 'Paid invoices', value: invoicesPaid, tone: 'success' as const },
      { label: 'Outstanding invoices', value: invoices.filter((invoice) => Number(invoice.dueAmount ?? 0) > 0).length, tone: 'warning' as const },
    ]
  }, [filtered, invoices])

  return (
    <InventoryPageShell
      eyebrow="Finance"
      title="Payments"
      description="A register of invoice payments recorded through the sales-invoice workflow."
      actions={[{ label: 'Record Payment', onClick: openCreatePayment }, { label: 'Refresh', variant: 'outline', onClick: load }]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <InventoryStatGrid stats={stats} />

      <InventorySectionCard title="Payment Register" description="Search payments by invoice, customer, method, or note.">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search payments" />
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SalesPaymentStatus | 'ALL')} className="bg-transparent outline-none">
              {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map((option) => (
                <option key={option} value={option}>{option === 'ALL' ? 'All payment states' : option}</option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
            No payments match the current filters.
          </div>
        ) : (
          <InventoryDataTable
            caption="Payment register"
            columns={[{ label: 'Invoice' }, { label: 'Customer' }, { label: 'Date' }, { label: 'Amount' }, { label: 'Method' }, { label: 'Actions' }]}
          >
            {filtered.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                <td className="px-3 py-4 align-top font-semibold text-slate-900">{payment.invoiceNumber || payment.invoiceId}</td>
                <td className="px-3 py-4 align-top text-slate-700">{payment.customerName}</td>
                <td className="px-3 py-4 align-top text-slate-600">{formatNepaliDate(payment.paymentDate)}</td>
                <td className="px-3 py-4 align-top font-semibold text-slate-900">{money(payment.amount)}</td>
                <td className="px-3 py-4 align-top text-slate-700">{payment.paymentMethod || '-'}</td>
                <td className="px-3 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/sales-invoices/${payment.invoiceId}`} className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      View Invoice
                    </Link>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditPayment(payment)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => deletePayment(payment)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </InventoryDataTable>
        )}
      </InventorySectionCard>

      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={editingPayment ? 'Edit Sales Payment' : 'Record Sales Payment'}>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Issued invoice</span>
            <select value={paymentForm.invoiceId} disabled={Boolean(editingPayment)} onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value="">Select invoice</option>
              {paymentInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber || invoice.id} · {invoice.customer?.customerName || invoice.customerName || 'Customer'} · Due {money(invoice.dueAmount)}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Amount</span>
            <input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Payment date</span>
            <input type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Method</span>
            <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2">
              {['Cash', 'Cheque', 'Bank Transfer', 'Card', 'Mobile Banking', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Note</span>
            <textarea value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Optional payment note" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={savePayment} isLoading={savingPayment}>{editingPayment ? 'Save Changes' : 'Record Payment'}</Button>
          </div>
        </div>
      </Modal>
    </InventoryPageShell>
  )
}
