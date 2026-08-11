import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ban, Download, Pencil, ReceiptText, Trash2, WalletCards } from 'lucide-react'
import { api } from '../../services/api'
import { salesInvoiceApi } from '../../services/salesInvoiceApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryStatGrid } from '../../components/inventory/InventoryStatGrid'
import { InvoiceItemTable, InvoiceDraftItem } from '../../components/sales/InvoiceItemTable'
import { InvoiceTotalsCard } from '../../components/sales/InvoiceTotalsCard'
import { Button } from '../../components/ui/Button'
import { InvoicePaperDocument } from '../../components/invoices/InvoicePaperDocument'
import { buildSalesInvoicePaperDocumentProps } from '../../components/invoices/invoicePaperDocumentHelpers'
import { calculateInvoiceTotals } from '../../components/invoices/invoiceTotals'
import { formatNepaliDate, formatNepaliDateTime } from '../../utils/nepaliDate'
import type { CurrentUser } from '../../types'
import { useCurrentUser } from '../../components/auth/CurrentUserContext'
import { organizationBankAccountApi, OrganizationBankAccount } from '../../services/organizationBankAccountApi'

type SalesInvoice = Awaited<ReturnType<typeof salesInvoiceApi.get>>

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))

const formatDateTime = (value?: string | null) => formatNepaliDateTime(value)

const statusClass = (status?: string | null) => {
  switch (status) {
    case 'ISSUED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'PARTIAL':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'UNPAID':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

const toDraftItems = (invoice?: SalesInvoice | null): InvoiceDraftItem[] =>
  (invoice?.items || []).map((item) => ({
    id: item.id,
    productId: item.productId || '',
    productCode: item.productCode || '',
    productName: item.productName,
    quantity: String(item.quantity ?? 0),
    unitPrice: String(item.unitPrice ?? 0),
    discountAmount: String(item.discountAmount ?? 0),
    taxAmount: String(item.taxAmount ?? 0),
    warehouseId: item.warehouseId || '',
  }))

export default function SalesInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, canEdit } = useCurrentUser()
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [bankAccounts, setBankAccounts] = useState<OrganizationBankAccount[]>([])
  const [cancelReason, setCancelReason] = useState('')
  const [organizationName, setOrganizationName] = useState('Merlin Lite')
  const [organizationProfile, setOrganizationProfile] = useState<CurrentUser['organizationProfile']>(null)
  const isDataEntry = user?.role === 'DATA_ENTRY'
  const canEditInvoice = !isDataEntry && canEdit && invoice ? ['DRAFT', 'PENDING_APPROVAL'].includes(String(invoice.invoiceStatus || '')) : false
  const invoiceStatus = String(invoice?.invoiceStatus || '')
  const canIssueInvoice = invoiceStatus === 'DRAFT' || invoiceStatus === 'PENDING_APPROVAL'
  const canRecordPayment = invoiceStatus === 'ISSUED'
  const isCancelledInvoice = invoiceStatus === 'CANCELLED'
  const canCancelInvoice = user?.role === 'ADMIN' && !isCancelledInvoice

  const loadInvoice = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await salesInvoiceApi.get(id)
      setInvoice(data)
      setPaymentAmount(String(Math.max(Number(data.dueAmount ?? data.grandTotal ?? 0), 0)))
      setPaymentDate('')
      setCancelReason('')
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoice.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoice()
  }, [id])

  useEffect(() => {
    let alive = true
    api.me()
      .then((user) => {
        if (alive) {
          setOrganizationName(user.organization || 'Merlin Lite')
          setOrganizationProfile(user.organizationProfile || null)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    organizationBankAccountApi.list().then(setBankAccounts).catch(() => setBankAccounts([]))
  }, [])

  const summary = useMemo(() => {
    const items = invoice?.items || []
    const totals = calculateInvoiceTotals({
      lines: items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        rate: item.unitPrice,
        amount: Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0),
        discountAmount: item.discountAmount,
      })),
    })
    const grandTotal = Number(invoice?.grandTotal ?? totals.grandTotal)
    const paidAmount = Number(invoice?.paidAmount ?? 0)
    const dueAmount = Number(invoice?.dueAmount ?? Math.max(grandTotal - paidAmount, 0))

    return {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      nonTaxableAmount: Number(invoice?.nonTaxableAmount ?? 0),
      taxAmount: totals.taxAmount,
      grandTotal,
      paidAmount,
      dueAmount,
      invoiceStatus: invoice?.invoiceStatus || undefined,
      paymentStatus: invoice?.paymentStatus || undefined,
      lineCount: items.length,
    }
  }, [invoice])

  const draftItems = useMemo(() => toDraftItems(invoice), [invoice])
  const customerName = invoice?.customer?.customerName || invoice?.customerName || 'Walk-in customer'
  const paperDocument = useMemo(
    () => buildSalesInvoicePaperDocumentProps(invoice, customerName, organizationName, organizationProfile),
    [invoice, customerName, organizationName, organizationProfile],
  )

  const mutateInvoice = async (label: string, action: () => Promise<SalesInvoice>) => {
    if (!invoice) return
    setBusy(label)
    setError(null)
    try {
      const updated = await action()
      setInvoice(updated)
    } catch (err: any) {
      setError(err?.message || 'Invoice update failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleDownloadCsv = async () => {
    if (!invoice) return
    setBusy('csv')
    try {
      const blob = await salesInvoiceApi.downloadCsv(invoice.id)
      saveBlob(blob, `sales-invoice-${invoice.invoiceNumber || invoice.id}.csv`)
    } catch (err: any) {
      setError(err?.message || 'Failed to download CSV.')
    } finally {
      setBusy(null)
    }
  }

  const handleDownloadPdf = async () => {
    if (!invoice) return
    setBusy('pdf')
    try {
      const blob = await salesInvoiceApi.downloadPdf(invoice.id)
      saveBlob(blob, `sales-invoice-${invoice.invoiceNumber || invoice.id}.pdf`)
    } catch (err: any) {
      setError(err?.message || 'Failed to download PDF.')
    } finally {
      setBusy(null)
    }
  }

  const handleIssue = async () => mutateInvoice('issue', () => salesInvoiceApi.issue(invoice!.id))

  const handlePayment = async () => {
    const method = paymentMethod.trim() || 'Cash'
    const details: string[] = []
    if (method.toLowerCase().includes('cheque') || method.toLowerCase().includes('check')) {
      if (chequeNumber.trim()) details.push(`Cheque #: ${chequeNumber.trim()}`)
      if (bankName.trim()) details.push(`Bank: ${bankName.trim()}`)
      if (chequeDate) details.push(`Cheque date: ${formatNepaliDate(chequeDate)}`)
    }
    const note = [paymentNote.trim(), ...details].filter(Boolean).join(' | ')
    const requiresBankAccount = /bank|cheque|mobile/i.test(method)
    if (requiresBankAccount && !bankAccountId) {
      setError('Select the organization bank account used for this payment.')
      return
    }
    await mutateInvoice('payment', () => {
      const payload = {
        amount: paymentAmount,
        paymentMethod: method,
        paymentDate: paymentDate || undefined,
        note: note || undefined,
        bankAccountId: bankAccountId || undefined,
      }
      return editingPaymentId
        ? salesInvoiceApi.updatePayment(invoice!.id, editingPaymentId, payload)
        : salesInvoiceApi.payment(invoice!.id, payload)
    })
    setEditingPaymentId(null)
    setPaymentAmount('')
    setPaymentNote('')
    setPaymentDate('')
    setChequeNumber('')
    setChequeDate('')
    setBankName('')
    setBankAccountId('')
  }

  const editPayment = (payment: NonNullable<SalesInvoice['payments']>[number]) => {
    setEditingPaymentId(payment.id)
    setPaymentAmount(String(payment.amount ?? ''))
    setPaymentDate(payment.paymentDate ? String(payment.paymentDate).slice(0, 10) : '')
    setPaymentMethod(payment.paymentMethod || payment.method || 'Cash')
    setBankAccountId(payment.bankAccountId || payment.bankAccount?.id || '')
    setPaymentNote(payment.note || payment.notes || '')
  }

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm('Delete this payment? The invoice balance and customer ledger will be recalculated.')) return
    await mutateInvoice('delete-payment', () => salesInvoiceApi.deletePayment(invoice!.id, paymentId))
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Cancellation reason is required.')
      return
    }
    await mutateInvoice('cancel', () => salesInvoiceApi.cancel(invoice!.id, { reason: cancelReason.trim() }))
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500" role="status" aria-live="polite">
        Loading sales invoice...
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        {error}
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center text-sm text-slate-500" role="status" aria-live="polite">
        Invoice not found.
      </div>
    )
  }

  return (
    <InventoryPageShell
      eyebrow="Sales"
      title={`Invoice ${invoice.invoiceNumber || '-'}`}
      description={`Customer: ${customerName} | Status: ${invoice.invoiceStatus || 'UNKNOWN'} | Payment: ${invoice.paymentStatus || 'UNKNOWN'}`}
      backTo={{ to: '/sales-invoices', label: 'Back to invoices' }}
      actions={[
        { label: 'Download CSV', variant: 'outline', onClick: handleDownloadCsv },
        { label: 'Download PDF', variant: 'outline', onClick: handleDownloadPdf },
        ...(canEditInvoice && id ? [{ label: 'Edit Invoice', to: `/sales-invoices/${id}/edit` }] : []),
        { label: 'New Invoice', variant: 'secondary', onClick: () => navigate('/sales-invoices/create') },
      ]}
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

        <InventoryStatGrid
        stats={[
          { label: 'Grand total', value: money(summary.grandTotal) },
          { label: 'Paid amount', value: money(summary.paidAmount), tone: 'success' },
          { label: 'Due amount', value: money(summary.dueAmount), tone: 'warning' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <InventorySectionCard
            title="Invoice Workflow"
            description="Drafts can be edited before issue; issue is the stock-moving step for articles."
            action={
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(invoice.invoiceStatus)}`}>
                  {invoice.invoiceStatus || 'UNKNOWN'}
                </span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(invoice.paymentStatus)}`}>
                  {invoice.paymentStatus || 'UNKNOWN'}
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Customer</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{customerName}</div>
                <div className="mt-1 text-sm text-slate-600">{invoice.customer?.phone || 'No phone on file'}</div>
                <div className="text-sm text-slate-600">{invoice.customer?.email || 'No email on file'}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Invoice metadata</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Invoice date</span>
                    <span className="font-medium">{formatDateTime(invoice.invoiceDate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Due date</span>
                    <span className="font-medium">{formatDateTime(invoice.dueDate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Fiscal year</span>
                    <span className="font-medium">{invoice.fiscalYear || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Sales order</span>
                    <span className="font-medium">{invoice.salesOrderId || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canEditInvoice && id ? (
                <Button type="button" variant="outline" onClick={() => navigate(`/sales-invoices/${id}/edit`)}>
                  Edit
                </Button>
              ) : null}
              {canIssueInvoice ? (
                <Button type="button" onClick={handleIssue} isLoading={busy === 'issue'}>
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Issue
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={handleDownloadPdf} isLoading={busy === 'pdf'}>
                PDF
              </Button>
              <Button type="button" variant="outline" onClick={handleDownloadCsv} isLoading={busy === 'csv'}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Finished-Goods Lines" description="Itemised line work for the invoice.">
            <InvoiceItemTable items={draftItems} readOnly />
          </InventorySectionCard>

          <InvoiceTotalsCard
            summary={summary}
            footer={
              <div className="space-y-2 text-sm text-slate-600">
                <div>Created: {formatDateTime(invoice.createdAt)}</div>
                <div>Issued: {formatDateTime(invoice.issuedAt)}</div>
                <div>Cancelled: {formatDateTime(invoice.cancelledAt)}</div>
                {invoice.cancellationReason ? <div>Reason: {invoice.cancellationReason}</div> : null}
              </div>
            }
          />

          <InventorySectionCard title="Debit / Credit" description="Sales invoices debit the customer and payments credit the customer.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-2xl bg-rose-50 p-4">
                <div className="text-xs uppercase tracking-wide text-rose-500">Debit</div>
                <div className="mt-1 text-lg font-semibold text-rose-700">{money(summary.grandTotal)}</div>
                <div className="text-xs text-rose-600">Invoice amount charged to customer</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-500">Credit</div>
                <div className="mt-1 text-lg font-semibold text-emerald-700">{money(summary.paidAmount)}</div>
                <div className="text-xs text-emerald-600">Payments received against invoice</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Due</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{money(summary.dueAmount)}</div>
                <div className="text-xs text-slate-600">Outstanding customer balance</div>
              </div>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Paper Invoice" description="Shared paper-style invoice layout for sales and purchase documents.">
            {paperDocument ? (
              <InvoicePaperDocument {...paperDocument} />
            ) : null}
          </InventorySectionCard>

          <InventorySectionCard title="Payment Activity" description="Payments stay inside the invoice, with cash/cheque/bank details tracked as activity.">
            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{money(payment.amount)}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(payment.paymentDate || payment.createdAt || payment.paidAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                          {payment.paymentMethod || payment.method || 'Payment method unknown'}
                        </span>
                        {payment.chequeNumber ? (
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            Cheque #{payment.chequeNumber}
                          </span>
                        ) : null}
                        {canRecordPayment && canEdit ? (
                          <>
                            {canEdit ? <Button type="button" variant="outline" size="sm" onClick={() => editPayment(payment)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button> : null}
                            <Button type="button" variant="danger" size="sm" onClick={() => deletePayment(payment.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <div>Amount: {money(payment.amount)}</div>
                      <div>Date: {formatDateTime(payment.paymentDate || payment.createdAt || payment.paidAt)}</div>
                    </div>
                    {payment.note || payment.notes ? (
                      <div className="mt-2 text-sm text-slate-600">{payment.note || payment.notes}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-sm text-slate-500">No payment activity has been recorded yet.</div>
            )}
          </InventorySectionCard>
        </div>

        <div className="space-y-6">
          <InventorySectionCard title={editingPaymentId && canEdit ? 'Edit Payment' : 'Post Payment'} description="Record collection against this invoice.">
            {canRecordPayment && (!editingPaymentId || canEdit) ? (
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                {/bank|cheque|mobile/i.test(paymentMethod) ? <label className="block text-sm"><span className="mb-1 block text-slate-600">Organization bank account</span><select required value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Select account</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankName} · {account.accountName} · {account.branchName}</option>)}</select></label> : null}
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Payment date (optional)</span>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Method</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                {paymentMethod.toLowerCase().includes('cheque') || paymentMethod.toLowerCase().includes('check') ? (
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Cheque number</span>
                      <input
                        value={chequeNumber}
                        onChange={(event) => setChequeNumber(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="Cheque number"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Cheque date</span>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(event) => setChequeDate(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Bank name</span>
                      <input
                        value={bankName}
                        onChange={(event) => setBankName(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="Bank name"
                      />
                    </label>
                  </div>
                ) : null}
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Note</span>
                  <textarea
                    value={paymentNote}
                    onChange={(event) => setPaymentNote(event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="Optional payment note"
                  />
                </label>
                <Button type="button" onClick={handlePayment} isLoading={busy === 'payment'}>
                  <WalletCards className="mr-2 h-4 w-4" />
                  {editingPaymentId && canEdit ? 'Save Payment Changes' : 'Record Payment'}
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Payments can only be recorded after the invoice is issued.
              </div>
            )}
          </InventorySectionCard>

              <InventorySectionCard title="Cancellation" description="Cancel only when the sales invoice should be voided.">
                <div className="space-y-4">
                  {canCancelInvoice ? (
                    <>
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-600">Reason</span>
                        <textarea
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                          className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                          placeholder="Explain why the invoice is being cancelled"
                        />
                      </label>
                      <Button type="button" variant="danger" onClick={handleCancel} isLoading={busy === 'cancel'}>
                        <Ban className="mr-2 h-4 w-4" />
                        Cancel Invoice
                      </Button>
                    </>
                  ) : isCancelledInvoice ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      This invoice has already been cancelled.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Cannot cancel this invoice.
                    </div>
                  )}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/sales-invoices')}>
                Back to list
              </Button>
              <Link
                to="/sales-invoices/create"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                New invoice
              </Link>
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
