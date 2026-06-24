import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { partyLedgerApi } from '../../services/partyLedgerApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
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
  const [payments, setPayments] = useState<any[]>([])
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm)
  const [form, setForm] = useState<SupplierForm>(emptySupplierForm)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [supplierData, ledgerData, paymentData] = await Promise.all([
        api.get(`/inventory/suppliers/${id}`),
        partyLedgerApi.getSupplierLedger(id),
        partyLedgerApi.getSupplierPayments(id),
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
      setPayments(Array.isArray(paymentData?.payments) ? paymentData.payments : [])
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
  const purchases = useMemo(() => (Array.isArray(supplier?.purchases) ? supplier.purchases : []), [supplier])
  const filteredLedgerEntries = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase()
    if (!q) return ledgerEntries
    return ledgerEntries.filter((entry: any) =>
      [entry.entryType, entry.documentNumber, entry.description, entry.referenceType, entry.referenceId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [ledgerEntries, ledgerSearch])
  const filteredPurchases = useMemo(() => {
    const q = purchaseSearch.trim().toLowerCase()
    if (!q) return purchases
    return purchases.filter((purchase: any) =>
      [purchase.invoiceNumber, purchase.status, purchase.supplierName, purchase.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [purchaseSearch, purchases])

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
      await partyLedgerApi.createSupplierPayment(id, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate || undefined,
        note: paymentForm.note || undefined,
      })
      setPaymentForm(emptyPaymentForm)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Failed to record supplier payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Buying"
      title={supplier?.name || 'Supplier Ledger'}
      description="Supplier profile, purchase-invoice exposure, payments made, and running payable balance."
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
              <div className="mt-1 text-2xl font-bold text-slate-900">{purchases.length}</div>
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

            <InventorySectionCard title="Record Payment" description="Post a supplier payment and reduce the payable balance.">
              <div className="space-y-3">
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
                <Button type="button" onClick={submitPayment} isLoading={savingPayment}>
                  Record Payment
                </Button>
              </div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Supplier Ledger" description="Opening balance, purchase invoices, payments made, and the running payable balance.">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">Search the ledger by document, type, or note.</div>
              <input
                value={ledgerSearch}
                onChange={(event) => setLedgerSearch(event.target.value)}
                placeholder="Search ledger"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
              />
            </div>
            {filteredLedgerEntries.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No ledger entries yet.</div>
            ) : (
              <InventoryDataTable
                caption="Supplier ledger"
                columns={[{ label: 'Date' }, { label: 'Type' }, { label: 'Document' }, { label: 'Debit' }, { label: 'Credit' }, { label: 'Running Balance' }]}
              >
                {filteredLedgerEntries.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 text-slate-600">{formatNepaliDate(entry.entryDate)}</td>
                    <td className="px-3 py-4 text-slate-700">{String(entry.entryType || '').replaceAll('_', ' ')}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{entry.documentNumber || '-'}</td>
                    <td className="px-3 py-4 text-rose-700">{money(entry.debit)}</td>
                    <td className="px-3 py-4 text-emerald-700">{money(entry.credit)}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{money(entry.runningBalance)}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Purchase Invoices" description="Purchase invoices posted against this supplier.">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">Search by invoice number, status, or note.</div>
              <input
                value={purchaseSearch}
                onChange={(event) => setPurchaseSearch(event.target.value)}
                placeholder="Search purchases"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-sm"
              />
            </div>
            {filteredPurchases.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No purchase invoices linked yet.</div>
            ) : (
              <InventoryDataTable
                caption="Supplier purchase invoices"
                columns={[{ label: 'Invoice' }, { label: 'Date' }, { label: 'Debit' }, { label: 'Credit' }, { label: 'Status' }]}
              >
                {filteredPurchases.map((purchase: any) => (
                  <tr key={purchase.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      <Link to={`/inventory/purchases/${purchase.id}`} className="text-blue-700 hover:text-blue-800">
                        {purchase.invoiceNumber || purchase.id}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-slate-600">{formatNepaliDate(purchase.invoiceDate)}</td>
                    <td className="px-3 py-4 text-rose-700">{money(purchase.totalAmount)}</td>
                    <td className="px-3 py-4 text-emerald-700">{money(0)}</td>
                    <td className="px-3 py-4 text-slate-700">{purchase.status || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <InventorySectionCard title="Payments Made" description="Payments recorded against this supplier.">
            {payments.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No payments recorded yet.</div>
            ) : (
              <InventoryDataTable
                caption="Supplier payments"
                columns={[{ label: 'Payment' }, { label: 'Date' }, { label: 'Amount' }, { label: 'Method' }, { label: 'Note' }]}
              >
                {payments.map((payment: any) => (
                  <tr key={payment.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{payment.paymentNumber || payment.id}</td>
                    <td className="px-3 py-4 text-slate-600">{formatNepaliDate(payment.paymentDate)}</td>
                    <td className="px-3 py-4 text-emerald-700">{money(payment.amount)}</td>
                    <td className="px-3 py-4 text-slate-700">{payment.paymentMethod || '-'}</td>
                    <td className="px-3 py-4 text-slate-700">{payment.note || '-'}</td>
                  </tr>
                ))}
              </InventoryDataTable>
            )}
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Supplier not found.</div>
      )}
    </InventoryPageShell>
  )
}
