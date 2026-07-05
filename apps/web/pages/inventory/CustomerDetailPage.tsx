import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { partyLedgerApi } from '../../services/partyLedgerApi'
import { salesInvoiceApi } from '../../services/salesInvoiceApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatNepaliDate } from '../../utils/nepaliDate'

type CustomerForm = {
  customerName: string
  phone: string
  email: string
  customerType: string
  panVatNumber: string
  address: string
  notes: string
  openingBalance: string
}

const emptyForm: CustomerForm = {
  customerName: '',
  phone: '',
  email: '',
  customerType: '',
  panVatNumber: '',
  address: '',
  notes: '',
  openingBalance: '',
}

type CustomerPaymentForm = {
  invoiceId: string
  amount: string
  paymentMethod: string
  paymentDate: string
  note: string
}

const emptyPaymentForm: CustomerPaymentForm = {
  invoiceId: '',
  amount: '',
  paymentMethod: 'Cash',
  paymentDate: new Date().toISOString().slice(0, 10),
  note: '',
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<any | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [ledgerSummary, setLedgerSummary] = useState<any | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [paymentForm, setPaymentForm] = useState<CustomerPaymentForm>(emptyPaymentForm)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([api.get(`/customers/${id}`), partyLedgerApi.getCustomerLedger(id)])
      .then(([customerData, ledgerData]) => {
        setCustomer(customerData)
        setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
        setLedgerSummary(ledgerData?.summary || null)
        setForm({
          customerName: customerData?.customerName || '',
          phone: customerData?.phone || '',
          email: customerData?.email || '',
          customerType: customerData?.customerType || '',
          panVatNumber: customerData?.panVatNumber || '',
          address: customerData?.address || '',
          notes: customerData?.notes || '',
          openingBalance: String(customerData?.openingBalance ?? ''),
        })
      })
      .catch((err: any) => setError(err?.message || 'Failed to load customer.'))
      .finally(() => setLoading(false))
  }, [id])

  const invoices = useMemo(() => (Array.isArray(customer?.salesInvoices) ? customer.salesInvoices : []), [customer])
  const issuedInvoices = useMemo(
    () => invoices.filter((invoice: any) => String(invoice.invoiceStatus || '').toUpperCase() === 'ISSUED'),
    [invoices],
  )
  const recentInvoiceEntries = useMemo(
    () =>
      [...invoices]
        .sort(
          (a: any, b: any) =>
            new Date(b.invoiceDate || b.createdAt || 0).getTime() - new Date(a.invoiceDate || a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [invoices],
  )
  const customerPayments = useMemo(() => {
    return invoices.flatMap((invoice: any) =>
      Array.isArray(invoice.payments)
        ? invoice.payments.map((payment: any) => ({
            ...payment,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber || invoice.id,
            invoiceStatus: invoice.invoiceStatus,
          }))
        : [],
    )
  }, [invoices])
  const paymentIndex = useMemo(
    () => new Map(customerPayments.map((payment: any) => [payment.id, payment])),
    [customerPayments],
  )
  const filteredInvoices = useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase()
    if (!query) return invoices

    return invoices.filter((invoice: any) => {
      const haystack = [
        invoice.invoiceNumber,
        formatNepaliDate(invoice.invoiceDate, ''),
        invoice.invoiceStatus,
        invoice.paymentStatus,
        invoice.grandTotal,
        invoice.dueAmount,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [invoiceSearch, invoices])
  const totalSales = Number(ledgerSummary?.totalInvoiced ?? customer?.summary?.totalInvoiced ?? 0)
  const openBalance = Number(ledgerSummary?.outstandingAmount ?? customer?.summary?.outstandingAmount ?? 0)
  const totalPaid = Number(ledgerSummary?.totalPaid ?? customer?.summary?.totalPaid ?? 0)
  const currentBalance = Number(ledgerSummary?.currentBalance ?? customer?.summary?.currentBalance ?? openBalance)
  const customerNumber = customer?.customerNumber || '-'
  const latestInvoiceEntry = recentInvoiceEntries[0] || null
  const latestPaymentEntry = customerPayments.length
    ? [...customerPayments].sort(
        (a: any, b: any) =>
          new Date(b.paymentDate || b.createdAt || 0).getTime() - new Date(a.paymentDate || a.createdAt || 0).getTime(),
      )[0]
    : null
  const filteredLedgerEntries = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase()
    return ledgerEntries.filter((entry: any) =>
      (ledgerTypeFilter === 'ALL' || String(entry.entryType || '') === ledgerTypeFilter) &&
      [entry.entryType, entry.documentNumber, entry.description, entry.referenceType, entry.referenceId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [ledgerEntries, ledgerSearch, ledgerTypeFilter])
  const ledgerTypeCounts = useMemo(() => {
    return ledgerEntries.reduce(
      (acc, entry: any) => {
        const type = String(entry.entryType || 'OTHER')
        acc.total += 1
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      { total: 0 } as Record<string, number>,
    )
  }, [ledgerEntries])

  const ledgerTypeLabel = (type: string) => {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'Opening'
      case 'SALES_INVOICE':
        return 'Invoice'
      case 'PAYMENT_RECEIVED':
        return 'Payment'
      default:
        return type.replaceAll('_', ' ')
    }
  }

  const ledgerTone = (type: string) => {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'bg-slate-100 text-slate-700'
      case 'SALES_INVOICE':
        return 'bg-rose-50 text-rose-700'
      case 'PAYMENT_RECEIVED':
        return 'bg-emerald-50 text-emerald-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const openPaymentModal = (payment?: any) => {
    if (payment) {
      setEditingPayment(payment)
      setPaymentForm({
        invoiceId: payment.invoiceId || '',
        amount: String(payment.amount ?? ''),
        paymentMethod: payment.paymentMethod || payment.method || 'Cash',
        paymentDate: (payment.paymentDate || payment.createdAt || new Date().toISOString()).slice(0, 10),
        note: payment.note || payment.notes || '',
      })
    } else {
      setEditingPayment(null)
      setPaymentForm({
        ...emptyPaymentForm,
        invoiceId: issuedInvoices[0]?.id || invoices[0]?.id || '',
      })
    }
    setPaymentModalOpen(true)
  }

  const savePayment = async () => {
    if (!id) return
    if (!paymentForm.invoiceId) {
      setError('Select an invoice for the payment.')
      return
    }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setError('Enter a valid payment amount.')
      return
    }

    setSavingPayment(true)
    setError(null)
    try {
      const payload = {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod.trim() || 'Cash',
        paymentDate: paymentForm.paymentDate || undefined,
        note: paymentForm.note.trim() || undefined,
      }

      if (editingPayment) {
        await salesInvoiceApi.updatePayment(paymentForm.invoiceId, editingPayment.id, payload)
      } else {
        await salesInvoiceApi.payment(paymentForm.invoiceId, payload)
      }

      setPaymentModalOpen(false)
      setEditingPayment(null)
      setPaymentForm(emptyPaymentForm)
      await Promise.all([api.get(`/customers/${id}`), partyLedgerApi.getCustomerLedger(id)]).then(([customerData, ledgerData]) => {
        setCustomer(customerData)
        setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
        setLedgerSummary(ledgerData?.summary || null)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  const deletePayment = async (payment: any) => {
    if (!id) return
    if (!window.confirm('Delete this payment?')) return
    setError(null)
    try {
      await salesInvoiceApi.deletePayment(payment.invoiceId, payment.id)
      await Promise.all([api.get(`/customers/${id}`), partyLedgerApi.getCustomerLedger(id)]).then(([customerData, ledgerData]) => {
        setCustomer(customerData)
        setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
        setLedgerSummary(ledgerData?.summary || null)
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to delete payment.')
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    if (!customer) return
    setForm({
      customerName: customer.customerName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      customerType: customer.customerType || '',
      panVatNumber: customer.panVatNumber || '',
      address: customer.address || '',
      notes: customer.notes || '',
      openingBalance: String(customer.openingBalance ?? ''),
    })
  }

  const saveCustomer = async () => {
    if (!id) return
    if (!form.customerName.trim()) {
      setError('Customer name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.put(`/customers/${id}`, {
        customerName: form.customerName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        customerType: form.customerType.trim() || undefined,
        panVatNumber: form.panVatNumber.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        openingBalance: form.openingBalance === '' ? undefined : Number(form.openingBalance),
      })
      setIsEditing(false)
      await Promise.all([api.get(`/customers/${id}`), partyLedgerApi.getCustomerLedger(id)])
        .then(([customerData, ledgerData]) => {
          setCustomer(customerData)
          setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
          setLedgerSummary(ledgerData?.summary || null)
        })
    } catch (err: any) {
      setError(err?.message || 'Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  const deleteCustomer = async () => {
    if (!id) return
    if (!window.confirm('Delete this customer? This cannot be undone.')) return
    setSaving(true)
    setError(null)
    try {
      await api.delete(`/customers/${id}`)
      navigate('/inventory/customers')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <InventoryPageShell
      eyebrow="Sales Master"
      title={customer?.customerName || 'Customer Ledger'}
      description="Customer relationship snapshot, sales history, payment history, and running ledger balance."
      backTo={{ to: '/inventory/customers', label: 'Back to customers' }}
      actions={customer ? [
        { label: 'Delete Customer', variant: 'danger', onClick: deleteCustomer },
        isEditing
          ? { label: 'Cancel', variant: 'outline', onClick: cancelEdit }
          : { label: 'Edit Customer', onClick: () => setIsEditing(true) },
      ] : undefined}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading customer...</div>
      ) : customer ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Invoices</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{invoices.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total sales</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(totalSales)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total paid</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{money(totalPaid)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Current balance</div>
              <div className="mt-1 text-2xl font-bold text-amber-700">{money(currentBalance)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <InventorySectionCard title="Relationship Snapshot" description="Fast CRM context for this customer.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Customer Number</div>
                  <div className="font-medium text-slate-900">{customerNumber}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Phone</div>
                  <div className="font-medium text-slate-900">{customer.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                  <div className="font-medium text-slate-900">{customer.email || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Type</div>
                  <div className="font-medium text-slate-900">{customer.customerType || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Last Invoice</div>
                  <div className="font-medium text-slate-900">
                    {latestInvoiceEntry ? formatNepaliDate(latestInvoiceEntry.invoiceDate || latestInvoiceEntry.createdAt) : ledgerSummary?.lastInvoiceDate ? formatNepaliDate(ledgerSummary.lastInvoiceDate) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Last Payment</div>
                  <div className="font-medium text-slate-900">
                    {latestPaymentEntry ? formatNepaliDate(latestPaymentEntry.paymentDate || latestPaymentEntry.createdAt) : ledgerSummary?.lastPaymentDate ? formatNepaliDate(ledgerSummary.lastPaymentDate) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Total Sales</div>
                  <div className="font-medium text-slate-900">{money(totalSales)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Outstanding Amount</div>
                  <div className="font-medium text-slate-900">{money(openBalance)}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Latest Document</div>
                  <div className="font-medium text-slate-900">
                    {latestInvoiceEntry ? (
                      <Link to={`/sales-invoices/${latestInvoiceEntry.id}`} className="text-blue-700 hover:text-blue-800 hover:underline">
                        {latestInvoiceEntry.invoiceNumber || latestInvoiceEntry.id}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Customer Details" description="Core customer master data used in sales documents.">
              {!isEditing ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">Customer Number</div><div className="font-medium text-slate-900">{customerNumber}</div></div>
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">Phone</div><div className="font-medium text-slate-900">{customer.phone || '-'}</div></div>
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">Email</div><div className="font-medium text-slate-900">{customer.email || '-'}</div></div>
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">Type</div><div className="font-medium text-slate-900">{customer.customerType || '-'}</div></div>
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">PAN / VAT</div><div className="font-medium text-slate-900">{customer.panVatNumber || '-'}</div></div>
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">Opening Balance</div><div className="font-medium text-slate-900">{money(customer.openingBalance)}</div></div>
                  <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Address</div><div className="font-medium text-slate-900">{customer.address || '-'}</div></div>
                  <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Notes</div><div className="font-medium text-slate-900">{customer.notes || '-'}</div></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Customer Name</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.customerName} onChange={(e) => setForm((current) => ({ ...current, customerName: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Phone</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Email</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Type</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.customerType} onChange={(e) => setForm((current) => ({ ...current, customerType: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>PAN / VAT</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.panVatNumber} onChange={(e) => setForm((current) => ({ ...current, panVatNumber: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Opening Balance</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min="0" step="0.01" value={form.openingBalance} onChange={(e) => setForm((current) => ({ ...current, openingBalance: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                    <span>Address</span>
                    <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                    <span>Notes</span>
                    <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
                  </label>
                  <div className="md:col-span-2 flex gap-2">
                    <Button type="button" onClick={saveCustomer} isLoading={saving}>Save Changes</Button>
                    <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              )}
            </InventorySectionCard>

            <InventorySectionCard title="Recent Sales" description="Latest invoices for this customer.">
              {recentInvoiceEntries.length === 0 ? (
                <div className="py-8 text-sm text-slate-500">No invoices linked yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentInvoiceEntries.map((invoice: any) => (
                    <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            <Link to={`/sales-invoices/${invoice.id}`} className="text-blue-700 hover:text-blue-800 hover:underline">
                              {invoice.invoiceNumber || invoice.id}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-500">{formatNepaliDate(invoice.invoiceDate || invoice.createdAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">{money(invoice.grandTotal)}</div>
                          <div className="text-xs text-slate-500">{invoice.paymentStatus || 'Pending'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InventorySectionCard>

            <InventorySectionCard title="Account Snapshot" description="How much business and exposure this customer has in Merlin.">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>Invoices</span><span className="font-medium text-slate-900">{invoices.length}</span></div>
                <div className="flex items-center justify-between"><span>Total sales</span><span className="font-medium text-slate-900">{money(totalSales)}</span></div>
                <div className="flex items-center justify-between"><span>Total paid</span><span className="font-medium text-slate-900">{money(totalPaid)}</span></div>
                <div className="flex items-center justify-between"><span>Outstanding amount</span><span className="font-medium text-slate-900">{money(openBalance)}</span></div>
                <div className="flex items-center justify-between"><span>Running balance</span><span className="font-medium text-slate-900">{money(currentBalance)}</span></div>
                <div className="flex items-center justify-between"><span>Last invoice</span><span className="font-medium text-slate-900">{formatNepaliDate(ledgerSummary?.lastInvoiceDate)}</span></div>
                <div className="flex items-center justify-between"><span>Last payment</span><span className="font-medium text-slate-900">{formatNepaliDate(ledgerSummary?.lastPaymentDate)}</span></div>
              </div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Invoice History" description="Linked sales invoices for this customer.">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                Search by invoice number, date, status, payment status, or amount.
              </div>
              <input
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="Search invoices"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
              />
            </div>
            {filteredInvoices.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No invoices linked yet.</div>
            ) : (
              <InventoryDataTable
                caption="Customer invoice history"
                columns={[{ label: 'Invoice' }, { label: 'Date' }, { label: 'Debit' }, { label: 'Credit' }, { label: 'Due' }, { label: 'Status' }]}
              >
                {filteredInvoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      <Link to={`/sales-invoices/${invoice.id}`} className="text-blue-700 hover:text-blue-800">
                        {invoice.invoiceNumber || invoice.id}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-slate-600">{formatNepaliDate(invoice.invoiceDate)}</td>
                    <td className="px-3 py-4 text-rose-700">{money(invoice.grandTotal)}</td>
                    <td className="px-3 py-4 text-emerald-700">{money(0)}</td>
                    <td className="px-3 py-4 text-slate-700">{money(invoice.dueAmount)}</td>
                    <td className="px-3 py-4 text-slate-700">{invoice.invoiceStatus || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <InventorySectionCard
            title="Customer Ledger"
            description="Opening balance, issued sales invoices, payments received, and the running balance."
            action={<span className="text-xs font-semibold text-slate-500">{filteredLedgerEntries.length} entries</span>}
          >
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_260px]">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Search</span>
                <input
                  value={ledgerSearch}
                  onChange={(event) => setLedgerSearch(event.target.value)}
                  placeholder="Search by document, note, or type"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Entry type</span>
                <select
                  value={ledgerTypeFilter}
                  onChange={(event) => setLedgerTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <option value="ALL">All entries ({ledgerTypeCounts.total})</option>
                  <option value="OPENING_BALANCE">Opening balance ({ledgerTypeCounts.OPENING_BALANCE || 0})</option>
                  <option value="SALES_INVOICE">Invoices ({ledgerTypeCounts.SALES_INVOICE || 0})</option>
                  <option value="PAYMENT_RECEIVED">Payments ({ledgerTypeCounts.PAYMENT_RECEIVED || 0})</option>
                </select>
              </label>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => {
                  setLedgerSearch('')
                  setLedgerTypeFilter('ALL')
                }}
              >
                All
              </button>
              <button
                type="button"
                className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                onClick={() => setLedgerTypeFilter('SALES_INVOICE')}
              >
                Invoices
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                onClick={() => setLedgerTypeFilter('PAYMENT_RECEIVED')}
              >
                Payments
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                onClick={() => setLedgerTypeFilter('OPENING_BALANCE')}
              >
                Opening
              </button>
              {(ledgerSearch || ledgerTypeFilter !== 'ALL') ? (
                <button
                  type="button"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  onClick={() => {
                    setLedgerSearch('')
                    setLedgerTypeFilter('ALL')
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            {filteredLedgerEntries.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No ledger entries yet.</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm">
                    <caption className="sr-only">Customer ledger</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Entry</th>
                        <th className="px-6 py-3 font-semibold">Document</th>
                        <th className="px-6 py-3 font-semibold">Debit</th>
                        <th className="px-6 py-3 font-semibold">Credit</th>
                        <th className="px-6 py-3 font-semibold">Balance</th>
                        <th className="px-6 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedgerEntries.map((entry: any) => {
                        const entryType = String(entry.entryType || 'OTHER')
                        const isPayment = entryType === 'PAYMENT_RECEIVED'
                        const isInvoice = entryType === 'SALES_INVOICE'
                        const isOpening = entryType === 'OPENING_BALANCE'
                        const payment = isPayment ? paymentIndex.get(entry.referenceId) : null
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">{formatNepaliDate(entry.entryDate)}</td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ledgerTone(entryType)}`}>
                                  {ledgerTypeLabel(entryType)}
                                </span>
                                {entry.description ? (
                                  <div className="max-w-[280px] text-xs leading-5 text-slate-500">{entry.description}</div>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {isInvoice && entry.referenceId ? (
                                <Link to={`/sales-invoices/${entry.referenceId}`} className="text-blue-700 hover:text-blue-800 hover:underline">
                                  {entry.documentNumber || entry.referenceId}
                                </Link>
                              ) : (
                                <span>{entry.documentNumber || '-'}</span>
                              )}
                            </td>
                            <td className={`px-6 py-4 font-semibold ${entry.debit ? 'text-rose-700' : 'text-slate-400'}`}>{money(entry.debit)}</td>
                            <td className={`px-6 py-4 font-semibold ${entry.credit ? 'text-emerald-700' : 'text-slate-400'}`}>{money(entry.credit)}</td>
                            <td className={`px-6 py-4 font-semibold ${Number(entry.runningBalance) < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                              {money(entry.runningBalance)}
                            </td>
                            <td className="px-6 py-4">
                              {isPayment && payment ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                    onClick={() => openPaymentModal(payment)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                                    onClick={() => deletePayment(payment)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">{isInvoice || isOpening ? 'Locked' : '-'}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Customer not found.</div>
      )}
    </InventoryPageShell>

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={editingPayment ? 'Edit Payment' : 'Record Payment'}
        size="md"
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Invoice</span>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={paymentForm.invoiceId}
              disabled={Boolean(editingPayment)}
              onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))}
            >
              <option value="">Select invoice</option>
              {issuedInvoices.map((invoice: any) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber || invoice.id} {invoice.paymentStatus ? `- ${invoice.paymentStatus}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Payment Method</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={paymentForm.paymentMethod}
              onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Payment Date</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={paymentForm.paymentDate}
              onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Note</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={paymentForm.note}
              onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Optional note"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={savePayment} isLoading={savingPayment}>
              {editingPayment ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
