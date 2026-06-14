import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { partyLedgerApi } from '../../services/partyLedgerApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'

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

export default function SupplierDetailPage() {
  const { id } = useParams()
  const [supplier, setSupplier] = useState<any | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm)

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
      actions={[{ label: 'Purchase Invoices', variant: 'outline', to: '/inventory/purchases' }]}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Supplier Number</div><div className="font-medium text-slate-900">{supplier.supplierNumber || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Contact</div><div className="font-medium text-slate-900">{supplier.contactName || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Phone</div><div className="font-medium text-slate-900">{supplier.phone || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Email</div><div className="font-medium text-slate-900">{supplier.email || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">PAN / VAT</div><div className="font-medium text-slate-900">{supplier.panVatNumber || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><div className="font-medium text-slate-900">{supplier.status || '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs uppercase tracking-wide text-slate-500">Address</div><div className="font-medium text-slate-900">{supplier.address || '-'}</div></div>
              </div>
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
                    <td className="px-3 py-4 text-slate-600">{entry.entryDate ? new Date(entry.entryDate).toLocaleDateString() : '-'}</td>
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
                    <td className="px-3 py-4 font-semibold text-slate-900">{purchase.invoiceNumber || purchase.id}</td>
                    <td className="px-3 py-4 text-slate-600">{purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString() : '-'}</td>
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
                    <td className="px-3 py-4 text-slate-600">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}</td>
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
