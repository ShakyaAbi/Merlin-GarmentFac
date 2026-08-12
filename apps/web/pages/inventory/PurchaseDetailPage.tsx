import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, Pencil, Trash2, WalletCards } from 'lucide-react'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { InvoicePaperDocument } from '../../components/invoices/InvoicePaperDocument'
import { buildPurchaseInvoicePaperDocumentProps } from '../../components/invoices/invoicePaperDocumentHelpers'
import { calculateInvoiceTotals } from '../../components/invoices/invoiceTotals'
import { formatNepaliDateTime } from '../../utils/nepaliDate'
import { Button } from '../../components/ui/Button'
import { useCurrentUser } from '../../components/auth/CurrentUserContext'
import { organizationBankAccountApi, OrganizationBankAccount } from '../../services/organizationBankAccountApi'

const money = (value: number | string | null | undefined, currency = 'NPR') =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: currency || 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

const formatDate = (value?: string | null) => formatNepaliDateTime(value)

const statusClass = (status?: string | null) => status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : status === 'PARTIAL' ? 'bg-amber-50 text-amber-800 border-amber-200' : status === 'CANCELLED' || status === 'cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-900 border-slate-200'

export default function PurchaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, canEdit } = useCurrentUser()
  const [purchase, setPurchase] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState('Merlin Lite')
  const [organizationProfile, setOrganizationProfile] = useState<any | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [bankAccounts, setBankAccounts] = useState<OrganizationBankAccount[]>([])
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const isCancelled = String(purchase?.status || '').toLowerCase() === 'cancelled'
  const canCancel = user?.role === 'ADMIN' && !isCancelled
  const canRecordPayment = !isCancelled

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
      try {
      const data = await api.get(`/inventory/purchases/${id}`)
      setPurchase(data)
      setPaymentAmount(String(Math.max(Number(data.dueAmount ?? data.totalAmount ?? 0), 0)))
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  useEffect(() => {
    organizationBankAccountApi.list().then(setBankAccounts).catch(() => setBankAccounts([]))
  }, [])

  useEffect(() => {
    let alive = true
    api.me()
      .then((user) => {
        if (!alive) return
        setOrganizationName(user.organizationProfile?.name || user.organization || 'Merlin Lite')
        setOrganizationProfile(user.organizationProfile || null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const summary = useMemo(() => {
    const items = purchase?.items || []
    const baseTotals = calculateInvoiceTotals({
      lines: items.map((item: any) => ({
        id: item.id,
        quantity: Number(item.quantity ?? 0),
        rate: Number(item.unitPrice ?? 0),
        amount: Number(item.lineTotal ?? Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)),
      })),
    })
    const discountAmount = Number(purchase?.discountAmount ?? 0)
    const subtotal = Number(baseTotals.subtotal ?? 0)
    const taxableAmount = Math.max(subtotal - discountAmount, 0)
    const taxAmount = Number((taxableAmount * 0.13).toFixed(2))
    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2))
    const paidAmount = Number(purchase?.paidAmount ?? 0)
    return { ...baseTotals, subtotal, discountAmount, taxableAmount, taxAmount, grandTotal, paidAmount, dueAmount: Math.max(Number(purchase?.dueAmount ?? grandTotal - paidAmount), 0) }
  }, [purchase])

  const mutate = async (label: string, action: () => Promise<any>) => {
    setBusy(label)
    setError(null)
    try { setPurchase(await action()) } catch (err: any) { setError(err?.message || 'Purchase update failed.') } finally { setBusy(null) }
  }

  const handlePayment = async () => {
    const method = paymentMethod.trim() || 'Cash'
    if (/bank|cheque|mobile/i.test(method) && !bankAccountId) { setError('Select the organization bank account used for this payment.'); return }
    await mutate('payment', () => editingPaymentId
      ? api.patch(`/inventory/purchases/${id}/payments/${editingPaymentId}`, { amount: paymentAmount, paymentMethod: method, paymentDate: paymentDate || undefined, note: paymentNote || undefined, bankAccountId: bankAccountId || undefined })
      : api.post(`/inventory/purchases/${id}/payment`, { amount: paymentAmount, paymentMethod: method, paymentDate: paymentDate || undefined, note: paymentNote || undefined, bankAccountId: bankAccountId || undefined }))
    setEditingPaymentId(null); setPaymentAmount(''); setPaymentDate(''); setPaymentNote(''); setBankAccountId('')
  }

  const editPayment = (payment: any) => { setEditingPaymentId(payment.id); setPaymentAmount(String(payment.amount ?? '')); setPaymentDate(payment.paymentDate ? String(payment.paymentDate).slice(0, 10) : ''); setPaymentMethod(payment.paymentMethod || 'Cash'); setPaymentNote(payment.note || ''); setBankAccountId(payment.bankAccountId || payment.bankAccount?.id || '') }
  const deletePayment = async (paymentId: string) => { if (window.confirm('Delete this payment? The supplier balance will be recalculated.')) await mutate('delete-payment', () => api.delete(`/inventory/purchases/${id}/payments/${paymentId}`).then(() => api.get(`/inventory/purchases/${id}`))) }
  const handleCancel = async () => { if (!cancelReason.trim()) { setError('Cancellation reason is required.'); return }; await mutate('cancel', () => api.post(`/inventory/purchases/${id}/cancel`, { reason: cancelReason.trim() })) }

  const paperDocument = useMemo(
    () => buildPurchaseInvoicePaperDocumentProps(purchase, organizationName, organizationProfile),
    [purchase, organizationName, organizationProfile],
  )

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title={purchase?.invoiceNumber || purchase?.id || 'Purchase Invoice'}
      description="Purchase invoice, supplier link, and raw-material stock receipt."
      backTo={{ to: '/inventory/purchases', label: 'Back to purchases' }}
      actions={[
        { label: 'Repeat Purchase', variant: 'outline', onClick: () => navigate(`/inventory/purchases/create?material=${purchase?.items?.[0]?.rawMaterialId || ''}`) },
        { label: 'Register', variant: 'secondary', to: '/inventory/purchases' },
      ]}
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading purchase...</div>
      ) : purchase ? (
        <div className="space-y-6">
          <InventorySectionCard title="Paper Invoice" description="Shared paper-style invoice layout for purchase documents.">
            {paperDocument ? <InvoicePaperDocument {...paperDocument} /> : null}
          </InventorySectionCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <InventorySectionCard title="Purchase Summary" description="Core purchase document fields.">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Supplier</div><div className="font-semibold text-slate-900">{purchase.supplier?.name || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Invoice Number</div><div className="font-semibold text-slate-900">{purchase.invoiceNumber || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Invoice Date</div><div className="font-semibold text-slate-900">{formatDate(purchase.invoiceDate)}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Due Date</div><div className="font-semibold text-slate-900">{formatDate(purchase.dueDate) || '-'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Status</div><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(purchase.status)}`}>{purchase.status || '-'}</span></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Payment Status</div><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(purchase.paymentStatus)}`}>{purchase.paymentStatus || 'UNPAID'}</span></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Totals" description="Document amount and currency.">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Currency</div><div className="font-semibold text-slate-900">{purchase.currency || 'NPR'}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Discount</div><div className="font-semibold text-slate-900">{money(summary.discountAmount, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Debit</div><div className="font-semibold text-rose-700">{money(summary.grandTotal, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Credit</div><div className="font-semibold text-emerald-700">{money(0, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Grand Total</div><div className="font-semibold text-slate-900">{money(summary.grandTotal, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Paid</div><div className="font-semibold text-emerald-700">{money(summary.paidAmount, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Due</div><div className="font-semibold text-amber-700">{money(summary.dueAmount, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">VAT 13%</div><div className="font-semibold text-slate-900">{money(summary.taxAmount, purchase.currency || 'NPR')}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-slate-500">Created At</div><div className="font-semibold text-slate-900">{formatDate(purchase.createdAt)}</div></div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Notes" description="Document remarks and receiving context.">
              <div className="text-sm text-slate-700">{purchase.notes || 'No notes provided.'}</div>
            </InventorySectionCard>
          </div>

          <InventorySectionCard title="Purchase Items" description="Raw materials received on this document.">
            <InventoryDataTable
              caption="Purchase items"
              columns={[{ label: 'Material' }, { label: 'Qty' }, { label: 'Unit' }, { label: 'Unit Price' }, { label: 'Line Total' }]}
            >
              {purchase.items?.map((item: any) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-4">
                    <div className="font-semibold text-slate-900">{item.rawMaterial?.name || item.rawMaterialId}</div>
                    <div className="text-xs text-slate-500">
                      {item.rawMaterial?.sku ? `EXIM CODE: ${item.rawMaterial.sku}` : item.rawMaterial?.defaultUnit || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-700">{Number(item.quantity ?? 0)}</td>
                  <td className="px-3 py-4 text-slate-700">{item.unit || '-'}</td>
                  <td className="px-3 py-4 text-slate-700">{money(item.unitPrice, purchase.currency || 'NPR')}</td>
                  <td className="px-3 py-4 text-slate-700">{money(item.lineTotal, purchase.currency || 'NPR')}</td>
                </tr>
              ))}
            </InventoryDataTable>
          </InventorySectionCard>

          <InventorySectionCard title="Payment History" description="Payments stay attached to this purchase and update the supplier ledger.">
            {purchase.payments?.length ? <div className="space-y-3">{purchase.payments.map((payment: any) => <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-slate-900">{money(payment.amount, purchase.currency || 'NPR')}</div><div className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</div></div><div className="flex items-center gap-2"><span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">{payment.paymentMethod}</span>{!isCancelled && canEdit ? <Button type="button" variant="outline" size="sm" onClick={() => editPayment(payment)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button> : null}{!isCancelled && canEdit ? <Button type="button" variant="danger" size="sm" onClick={() => deletePayment(payment.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button> : null}</div></div>{payment.bankAccount ? <div className="mt-2 text-xs text-slate-500">{payment.bankAccount.bankName} · {payment.bankAccount.branchName}</div> : null}{payment.note ? <div className="mt-2 text-sm text-slate-600">{payment.note}</div> : null}</div>)}</div> : <div className="py-6 text-sm text-slate-500">No payment activity has been recorded yet.</div>}
          </InventorySectionCard>

          <InventorySectionCard title={editingPaymentId ? 'Edit Payment' : 'Record Payment'} description="Record a payment made to the supplier.">
            {canRecordPayment ? <div className="space-y-4"><label className="block text-sm"><span className="mb-1 block text-slate-600">Amount</span><input type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label><label className="block text-sm"><span className="mb-1 block text-slate-600">Method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2"><option>Cash</option><option>Cheque</option><option>Bank Transfer</option><option>Mobile Banking</option><option>Card</option><option>Other</option></select></label>{/bank|cheque|mobile/i.test(paymentMethod) ? <label className="block text-sm"><span className="mb-1 block text-slate-600">Organization bank account</span><select required value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Select account</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankName} · {account.accountName} · {account.branchName}</option>)}</select></label> : null}<label className="block text-sm"><span className="mb-1 block text-slate-600">Payment date</span><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label><label className="block text-sm"><span className="mb-1 block text-slate-600">Note</span><textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" /></label><Button type="button" onClick={handlePayment} isLoading={busy === 'payment'}><WalletCards className="mr-2 h-4 w-4" />{editingPaymentId ? 'Save Payment Changes' : 'Record Payment'}</Button></div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">This purchase has already been cancelled.</div>}
          </InventorySectionCard>

          <InventorySectionCard title="Cancellation" description="Cancel only when the purchase should be voided.">
            {canCancel ? <div className="space-y-4"><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Explain why the purchase is being cancelled" /><Button type="button" variant="danger" onClick={handleCancel} isLoading={busy === 'cancel'}><Ban className="mr-2 h-4 w-4" />Cancel Purchase</Button></div> : isCancelled ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">This purchase has already been cancelled.</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Cannot cancel this purchase.</div>}
          </InventorySectionCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">Purchase not found.</div>
      )}
    </InventoryPageShell>
  )
}
