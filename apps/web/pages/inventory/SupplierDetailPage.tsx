import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { partyLedgerApi } from '../../services/partyLedgerApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatNepaliDate } from '../../utils/nepaliDate'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

type PaymentForm = {
  amount: string
  paymentMethod: string
  paymentDate: string
  note: string
}

const emptyPaymentForm: PaymentForm = {
  amount: '',
  paymentMethod: 'cash',
  paymentDate: new Date().toISOString().slice(0, 10),
  note: '',
}

type SupplierForm = {
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  panVatNumber: string
  notes: string
  externalRef: string
  status: string
  openingBalance: string
}

const emptySupplierForm: SupplierForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  panVatNumber: '',
  notes: '',
  externalRef: '',
  status: 'ACTIVE',
  openingBalance: '',
}

export default function SupplierDetailPage() {
  const { id } = useParams()
  const [supplier, setSupplier] = useState<any | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL')
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm)
  const [editingPayment, setEditingPayment] = useState<any | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [form, setForm] = useState<SupplierForm>(emptySupplierForm)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [supplierData, ledgerData] = await Promise.all([
        api.get(`/inventory/suppliers/${id}`),
        partyLedgerApi.getSupplierLedger(id),
      ])
      setSupplier(supplierData)
      setForm({
        name: supplierData?.name || '',
        contactName: supplierData?.contactName || '',
        phone: supplierData?.phone || '',
        email: supplierData?.email || '',
        address: supplierData?.address || '',
        panVatNumber: supplierData?.panVatNumber || '',
        notes: supplierData?.notes || '',
        externalRef: supplierData?.externalRef || '',
        status: supplierData?.status || 'ACTIVE',
        openingBalance: String(supplierData?.openingBalance ?? ''),
      })
      setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load supplier ledger.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const summary = supplier?.summary || null
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
  const filteredLedgerEntries = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase()
    return ledgerEntries.filter((entry: any) =>
      (ledgerTypeFilter === 'ALL' || String(entry.entryType || '') === ledgerTypeFilter) &&
      [entry.entryType, entry.documentNumber, entry.description, entry.referenceType, entry.referenceId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [ledgerEntries, ledgerSearch, ledgerTypeFilter])
  const recentPurchaseEntries = useMemo(
    () =>
      [...ledgerEntries]
        .filter((entry: any) => String(entry.entryType || '') === 'PURCHASE_INVOICE')
        .sort((a: any, b: any) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
        .slice(0, 5),
    [ledgerEntries],
  )
  const latestPurchaseEntry = recentPurchaseEntries[0] || null
  const latestPaymentEntry = useMemo(
    () =>
      [...ledgerEntries]
        .filter((entry: any) => String(entry.entryType || '') === 'PAYMENT_MADE')
        .sort((a: any, b: any) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())[0] || null,
    [ledgerEntries],
  )

  const openPaymentModal = (payment?: any) => {
    if (payment) {
      setEditingPayment(payment)
      setPaymentForm({
        amount: String(payment.amount ?? ''),
        paymentMethod: payment.paymentMethod || 'cash',
        paymentDate: (payment.paymentDate || payment.createdAt || new Date().toISOString()).slice(0, 10),
        note: payment.note || '',
      })
    } else {
      setEditingPayment(null)
      setPaymentForm(emptyPaymentForm)
    }
    setPaymentModalOpen(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    if (!supplier) return
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      panVatNumber: supplier.panVatNumber || '',
      notes: supplier.notes || '',
      externalRef: supplier.externalRef || '',
      status: supplier.status || 'ACTIVE',
      openingBalance: String(supplier.openingBalance ?? ''),
    })
  }

  const saveSupplier = async () => {
    if (!id) return
    if (!form.name.trim()) {
      setError('Supplier name is required.')
      return
    }
    setSavingProfile(true)
      setError(null)
    try {
      await api.put(`/inventory/suppliers/${id}`, {
        name: form.name.trim(),
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        panVatNumber: form.panVatNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        externalRef: form.externalRef.trim() || undefined,
        status: form.status as 'ACTIVE' | 'INACTIVE',
        openingBalance: form.openingBalance === '' ? undefined : Number(form.openingBalance),
      })
      setIsEditing(false)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to update supplier.')
    } finally {
      setSavingProfile(false)
    }
  }

  const submitPayment = async () => {
    if (!id) return
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setError('Enter a valid payment amount.')
      return
    }
    setSavingPayment(true)
    setError(null)
    try {
      const payload = {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate || undefined,
        note: paymentForm.note || undefined,
      }
      if (editingPayment) {
        await partyLedgerApi.updateSupplierPayment(id, editingPayment.id, payload)
      } else {
        await partyLedgerApi.createSupplierPayment(id, payload)
      }
      setPaymentForm(emptyPaymentForm)
      setEditingPayment(null)
      setPaymentModalOpen(false)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to record supplier payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  const deletePayment = async (payment: any) => {
    if (!id) return
    if (!window.confirm('Delete this supplier payment?')) return
    setError(null)
    try {
      await partyLedgerApi.deleteSupplierPayment(id, payment.id)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete supplier payment.')
    }
  }

  const ledgerTypeLabel = (type: string) => {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'Opening'
      case 'PURCHASE_INVOICE':
        return 'Purchase'
      case 'PAYMENT_MADE':
        return 'Payment'
      default:
        return type.replaceAll('_', ' ')
    }
  }

  const ledgerTone = (type: string) => {
    switch (type) {
      case 'OPENING_BALANCE':
        return 'bg-slate-100 text-slate-700'
      case 'PURCHASE_INVOICE':
        return 'bg-emerald-50 text-emerald-700'
      case 'PAYMENT_MADE':
        return 'bg-amber-50 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <>
    <InventoryPageShell
      eyebrow="Buying"
      title={supplier?.name || 'Supplier Ledger'}
      description="Supplier profile, ledger history, payment activity, and running payable balance."
      backTo={{ to: '/inventory/suppliers', label: 'Back to suppliers' }}
      actions={supplier ? [
        { label: 'Purchase Invoices', variant: 'outline', to: '/inventory/purchases' },
        isEditing
          ? { label: 'Cancel', variant: 'outline', onClick: cancelEdit }
          : { label: 'Edit Supplier', onClick: () => setIsEditing(true) },
      ] : [{ label: 'Purchase Invoices', variant: 'outline', to: '/inventory/purchases' }]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading supplier ledger...</div>
      ) : supplier ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Purchase invoices</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{ledgerTypeCounts.PURCHASE_INVOICE || 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total purchases</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(summary?.totalPurchases)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total paid</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{money(summary?.totalPaid)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Outstanding payable</div>
              <div className="mt-1 text-2xl font-bold text-amber-700">{money(summary?.outstandingPayable)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <InventorySectionCard title="Relationship Snapshot" description="Fast CRM context for this supplier.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Supplier Code</div>
                  <div className="font-medium text-slate-900">{supplier.externalRef || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Primary Contact</div>
                  <div className="font-medium text-slate-900">{supplier.contactName || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Phone</div>
                  <div className="font-medium text-slate-900">{supplier.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                  <div className="font-medium text-slate-900">{supplier.email || '-'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Last Purchase</div>
                  <div className="font-medium text-slate-900">
                    {latestPurchaseEntry ? formatNepaliDate(latestPurchaseEntry.entryDate) : summary?.lastPurchaseDate ? formatNepaliDate(summary.lastPurchaseDate) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Last Payment</div>
                  <div className="font-medium text-slate-900">
                    {latestPaymentEntry ? formatNepaliDate(latestPaymentEntry.entryDate) : summary?.lastPaymentDate ? formatNepaliDate(summary.lastPaymentDate) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Total Purchases</div>
                  <div className="font-medium text-slate-900">{money(summary?.totalPurchases)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Outstanding Payable</div>
                  <div className="font-medium text-slate-900">{money(summary?.outstandingPayable)}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Latest Document</div>
                  <div className="font-medium text-slate-900">
                    {latestPurchaseEntry ? (
                      <Link to={`/inventory/purchases/${latestPurchaseEntry.referenceId}`} className="text-blue-700 hover:text-blue-800 hover:underline">
                        {latestPurchaseEntry.documentNumber || latestPurchaseEntry.referenceId}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Recent Purchases" description="Latest purchase invoices for this supplier.">
              {recentPurchaseEntries.length === 0 ? (
                <div className="py-8 text-sm text-slate-500">No purchase invoices yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentPurchaseEntries.map((entry: any) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {entry.referenceId ? (
                              <Link to={`/inventory/purchases/${entry.referenceId}`} className="text-blue-700 hover:text-blue-800 hover:underline">
                                {entry.documentNumber || entry.referenceId}
                              </Link>
                            ) : (
                              <span>{entry.documentNumber || '-'}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{formatNepaliDate(entry.entryDate)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">{money(entry.credit)}</div>
                          <div className="text-xs text-slate-500">Purchase amount</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Supplier Details" description="Core supplier data and numbering.">
            {!isEditing ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Supplier Number</div><div className="font-medium text-slate-900">{supplier.supplierNumber || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Contact</div><div className="font-medium text-slate-900">{supplier.contactName || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Phone</div><div className="font-medium text-slate-900">{supplier.phone || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Email</div><div className="font-medium text-slate-900">{supplier.email || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">PAN / VAT</div><div className="font-medium text-slate-900">{supplier.panVatNumber || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="font-medium text-slate-900">{supplier.status || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Opening Balance</div><div className="font-medium text-slate-900">{money(supplier.openingBalance)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">External Ref</div><div className="font-medium text-slate-900">{supplier.externalRef || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Address</div><div className="font-medium text-slate-900">{supplier.address || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Notes</div><div className="font-medium text-slate-900">{supplier.notes || '-'}</div></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Supplier Name</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Contact</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.contactName} onChange={(e) => setForm((current) => ({ ...current, contactName: e.target.value }))} />
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
                  <span>PAN / VAT</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.panVatNumber} onChange={(e) => setForm((current) => ({ ...current, panVatNumber: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Status</span>
                  <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Opening Balance</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min="0" step="0.01" value={form.openingBalance} onChange={(e) => setForm((current) => ({ ...current, openingBalance: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>External Ref</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.externalRef} onChange={(e) => setForm((current) => ({ ...current, externalRef: e.target.value }))} />
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
                  <Button type="button" onClick={saveSupplier} isLoading={savingProfile}>Save Changes</Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            )}
          </InventorySectionCard>

          <InventorySectionCard
            title="Supplier Ledger"
            description="One register for opening balance, purchases, and payments."
            action={<Button type="button" onClick={() => openPaymentModal()}>Record Payment</Button>}
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
                  <option value="PURCHASE_INVOICE">Purchase invoices ({ledgerTypeCounts.PURCHASE_INVOICE || 0})</option>
                  <option value="PAYMENT_MADE">Payments made ({ledgerTypeCounts.PAYMENT_MADE || 0})</option>
                </select>
              </label>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${ledgerTypeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                onClick={() => setLedgerTypeFilter('ALL')}
              >
                All
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${ledgerTypeFilter === 'PURCHASE_INVOICE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                onClick={() => setLedgerTypeFilter('PURCHASE_INVOICE')}
              >
                Purchases
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${ledgerTypeFilter === 'PAYMENT_MADE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                onClick={() => setLedgerTypeFilter('PAYMENT_MADE')}
              >
                Payments
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${ledgerTypeFilter === 'OPENING_BALANCE' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                onClick={() => setLedgerTypeFilter('OPENING_BALANCE')}
              >
                Opening
              </button>
              {ledgerSearch || ledgerTypeFilter !== 'ALL' ? (
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

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <caption className="sr-only">Supplier ledger register</caption>
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
                    {filteredLedgerEntries.length === 0 ? (
                      <tr>
                        <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={7}>
                          No matching ledger entries.
                        </td>
                      </tr>
                    ) : (
                      filteredLedgerEntries.map((entry: any) => {
                        const entryType = String(entry.entryType || 'OTHER')
                        const isPayment = entryType === 'PAYMENT_MADE'
                        const isPurchase = entryType === 'PURCHASE_INVOICE'
                        const isOpening = entryType === 'OPENING_BALANCE'
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
                              {isPurchase && entry.referenceId ? (
                                <Link to={`/inventory/purchases/${entry.referenceId}`} className="text-blue-700 hover:text-blue-800 hover:underline">
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
                              {isPayment ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                    onClick={() => openPaymentModal(entry)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                                    onClick={() => deletePayment(entry)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">{isPurchase || isOpening ? 'Locked' : '-'}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Supplier not found.</div>
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
            <span className="mb-1 block text-slate-600">Amount</span>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={paymentForm.amount} onChange={(e) => setPaymentForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0.00" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Payment Method</span>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((current) => ({ ...current, paymentMethod: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Payment Date</span>
            <input type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((current) => ({ ...current, paymentDate: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Note</span>
            <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} value={paymentForm.note} onChange={(e) => setPaymentForm((current) => ({ ...current, note: e.target.value }))} placeholder="Optional note" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={submitPayment} isLoading={savingPayment}>{editingPayment ? 'Save Changes' : 'Record Payment'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
