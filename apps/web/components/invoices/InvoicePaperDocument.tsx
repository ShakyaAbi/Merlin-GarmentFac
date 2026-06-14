import React from 'react'
import { amountInWords } from './amountInWords'
import { calculateInvoiceTotals } from './invoiceTotals'

export type InvoicePaperLine = {
  id: string
  code?: string | null
  description: string
  quantity: number
  rate: number
  amount?: number | null
  unit?: string | null
}

type MetaRow = {
  label: string
  value: string
}

type Party = {
  label: string
  name: string
  address?: string
  panVatNumber?: string
  phone?: string
  email?: string
}

export type InvoicePaperDocumentProps = {
  companyName: string
  companyAddress?: string
  companyPanVat?: string
  invoiceTitle: string
  invoiceNumber: string
  invoiceDate?: string
  party: Party
  meta?: MetaRow[]
  items: InvoicePaperLine[]
  discountAmount?: number
  notes?: string
  className?: string
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('en-GB') : '-')

export function InvoicePaperDocument({
  companyName,
  companyAddress,
  companyPanVat,
  invoiceTitle,
  invoiceNumber,
  invoiceDate,
  party,
  meta = [],
  items,
  discountAmount = 0,
  notes,
  className = '',
}: InvoicePaperDocumentProps) {
  const totals = calculateInvoiceTotals({
    lines: items,
    discountAmount,
  })

  return (
    <section className={`overflow-hidden rounded-3xl border border-slate-300 bg-white text-slate-900 shadow-lg ${className}`.trim()}>
      <div className="border-b border-slate-300 bg-gradient-to-r from-rose-50 via-white to-amber-50 px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Invoice</div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">{companyName}</h2>
            {companyAddress ? <div className="text-sm text-slate-600">{companyAddress}</div> : null}
            {companyPanVat ? <div className="text-sm text-slate-600">PAN / VAT: {companyPanVat}</div> : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-sm font-semibold text-slate-500">{invoiceTitle}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Invoice No.</div>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{invoiceNumber}</div>
            <div className="mt-1 text-sm text-slate-600">{formatDate(invoiceDate)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 px-6 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{party.label}</div>
          <div className="mt-2 text-lg font-semibold text-slate-950">{party.name}</div>
          {party.address ? <div className="mt-1 text-sm text-slate-600">{party.address}</div> : null}
          {party.panVatNumber ? <div className="mt-1 text-sm text-slate-600">PAN / VAT: {party.panVatNumber}</div> : null}
          {party.phone ? <div className="mt-1 text-sm text-slate-600">Phone: {party.phone}</div> : null}
          {party.email ? <div className="mt-1 text-sm text-slate-600">Email: {party.email}</div> : null}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Document Details</div>
          <dl className="mt-2 space-y-2 text-sm text-slate-700">
            {meta.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="font-medium text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="px-3 py-3 font-semibold">SN</th>
              <th className="px-3 py-3 font-semibold">Code</th>
              <th className="px-3 py-3 font-semibold">Description</th>
              <th className="px-3 py-3 font-semibold text-right">Qty</th>
              <th className="px-3 py-3 font-semibold text-right">Rate</th>
              <th className="px-3 py-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                  No item lines yet.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const amount = Number.isFinite(Number(item.amount)) ? Number(item.amount) : item.quantity * item.rate
                return (
                  <tr key={item.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-3 py-4 text-slate-600">{index + 1}</td>
                    <td className="px-3 py-4 text-slate-700">{item.code || '-'}</td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-950">{item.description}</div>
                      {item.unit ? <div className="text-xs text-slate-500">{item.unit}</div> : null}
                    </td>
                    <td className="px-3 py-4 text-right text-slate-700">{Number(item.quantity).toLocaleString('en-US')}</td>
                    <td className="px-3 py-4 text-right text-slate-700">{money(Number(item.rate))}</td>
                    <td className="px-3 py-4 text-right font-semibold text-slate-950">{money(amount)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 border-t border-slate-200 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Amount in words:</span> {amountInWords(totals.grandTotal)}
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notes</div>
            <div className="mt-1 text-sm text-slate-700">{notes?.trim() ? notes : 'No notes provided.'}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-900">{money(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Discount</dt>
              <dd className="font-medium text-slate-900">{money(totals.discountAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Taxable Amount</dt>
              <dd className="font-medium text-slate-900">{money(totals.taxableAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">VAT 13%</dt>
              <dd className="font-medium text-slate-900">{money(totals.taxAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-300 pt-2 text-base">
              <dt className="font-semibold text-slate-700">Grand Total</dt>
              <dd className="font-bold text-slate-950">{money(totals.grandTotal)}</dd>
            </div>
          </dl>
        </div>
      </div>

    </section>
  )
}
