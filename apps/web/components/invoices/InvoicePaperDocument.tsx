import React from 'react'
import { amountInWords } from './amountInWords'
import { calculateInvoiceTotals } from './invoiceTotals'
import { formatNepaliDate } from '../../utils/nepaliDate'

export type InvoicePaperLine = {
  id: string
  code?: string | null
  description: string
  quantity: number
  rate: number
  amount?: number | null
  unit?: string | null
}

type MetaRow = { label: string; value: string }

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
  headerName?: string
  footerName?: string
  companyAddress?: string
  companyPanVat?: string
  invoiceTitle: string
  invoiceNumber: string
  invoiceDate?: string
  party: Party
  partyTaxLabel?: string
  partyTaxNumber?: string
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

const valueOrDash = (value?: string | null) => value?.trim() || '-'

const splitAmount = (value: number) => {
  const rounded = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
  const [rupees, paisa = '00'] = Math.abs(rounded).toFixed(2).split('.')
  const sign = rounded < 0 ? '-' : ''
  return {
    rupees: `${sign}${Number(rupees).toLocaleString('en-US')}`,
    paisa,
  }
}

export function InvoicePaperDocument({
  companyName,
  headerName,
  footerName,
  companyAddress,
  companyPanVat,
  invoiceTitle,
  invoiceNumber,
  invoiceDate,
  party,
  partyTaxLabel,
  partyTaxNumber,
  meta = [],
  items,
  discountAmount = 0,
  notes,
  className = '',
}: InvoicePaperDocumentProps) {
  const totals = calculateInvoiceTotals({ lines: items, discountAmount })
  const metaValue = (label: string, fallback = '-') => meta.find((row) => row.label === label)?.value || fallback
  const transactionDate = metaValue('Transaction Date', formatNepaliDate(invoiceDate) || '-')
  const issueDate = metaValue('Invoice Issue Date', formatNepaliDate(invoiceDate) || '-')
  const paymentMode = metaValue('Mode of Payment')
  const documentName = headerName || companyName
  const signatureName = footerName || companyName

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body { background: #fff !important; }
          .invoice-paper { width: 100% !important; max-width: none !important; border-radius: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <section
        className={`invoice-paper mx-auto max-w-[794px] overflow-hidden rounded-2xl border border-slate-300 bg-white text-[10px] leading-tight text-slate-900 shadow-md ${className}`.trim()}
        aria-label={`${invoiceTitle} ${invoiceNumber}`}
      >
        <header className="border-b border-slate-300 bg-white px-6 py-5 text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">TAX INVOICE</div>
          <h2 className="mt-1 text-[21px] font-black tracking-tight text-slate-950">{documentName}</h2>
          <div className="mt-1 text-[12px] text-slate-600">{valueOrDash(companyAddress)}</div>
          <div className="mt-1 text-[10px] text-slate-500">{invoiceTitle}</div>
        </header>

        <div className="grid grid-cols-2 border-b border-slate-300 px-5 py-2">
          <div className="border-r border-slate-200 pr-5">
            <div className="py-1"><span className="font-semibold">TPIN :</span> {valueOrDash(companyPanVat)}</div>
          </div>
          <div className="pl-5">
            <div><span className="font-semibold">Date of Transaction</span> : {transactionDate}</div>
            <div className="mt-1"><span className="font-semibold">Date of Invoice Issue</span> : {issueDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 border-b border-slate-300 px-5 py-3">
          <div className="space-y-1 pr-5">
            <div><span className="font-semibold"><span>{party.label}</span>&apos;s Name :</span> {valueOrDash(party.name)}</div>
            <div><span className="font-semibold">Address :</span> {valueOrDash(party.address)}</div>
            <div><span className="font-semibold">{valueOrDash(partyTaxLabel || `${party.label}'s TPIN`)}</span> : {valueOrDash(partyTaxNumber || party.panVatNumber)}</div>
          </div>
          <div className="pl-5 text-right">
            <div><span className="font-semibold">Invoice No.</span> : {valueOrDash(invoiceNumber)}</div>
            <div><span className="font-semibold">Mode of Payment :</span> {paymentMode}</div>
          </div>
        </div>

        <div className="overflow-x-auto px-5 py-4">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border border-slate-400 bg-slate-50 text-slate-700">
                <th rowSpan={2} className="w-10 border-r border-slate-400 px-2 py-2 text-center font-semibold">S.N.</th>
                <th rowSpan={2} className="w-24 border-r border-slate-400 px-2 py-2 text-center font-semibold">H.S. Code</th>
                <th rowSpan={2} className="border-r border-slate-400 px-2 py-2 font-semibold">Description</th>
                <th rowSpan={2} className="w-14 border-r border-slate-400 px-2 py-2 text-center font-semibold">Qty.</th>
                <th rowSpan={2} className="w-24 border-r border-slate-400 px-2 py-2 text-right font-semibold">Unit Price</th>
                <th colSpan={2} className="px-2 py-1 text-center font-semibold">Amount</th>
              </tr>
              <tr className="border-x border-b border-slate-400 bg-slate-50 text-[10px] font-medium text-slate-700">
                <th className="w-16 border-r border-slate-400 px-2 py-1 text-right">Rs.</th>
                <th className="w-16 border-r border-slate-400 px-2 py-1 text-right">Ps.</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="h-64 border-x border-b border-slate-400">
                  <td colSpan={7} className="px-3 py-5 text-center text-slate-500">No item lines yet.</td>
                </tr>
              ) : (
                <>
                  {items.map((item, index) => {
                    const amount = Number.isFinite(Number(item.amount)) ? Number(item.amount) : item.quantity * item.rate
                    const amountParts = splitAmount(amount)
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="border-x border-b border-slate-300 px-2 py-2 text-center">{index + 1}</td>
                        <td className="border-b border-r border-slate-300 px-2 py-2 text-center">{valueOrDash(item.code)}</td>
                        <td className="border-b border-r border-slate-300 px-2 py-2">
                          <div className="font-medium">{valueOrDash(item.description)}</div>
                          {item.unit ? <div className="text-[10px] text-slate-500">{item.unit}</div> : null}
                        </td>
                        <td className="border-b border-r border-slate-300 px-2 py-2 text-center">{Number(item.quantity).toLocaleString('en-US')}</td>
                        <td className="border-b border-r border-slate-300 px-2 py-2 text-right">{money(Number(item.rate))}</td>
                        <td className="border-b border-r border-slate-300 px-2 py-2 text-right">{amountParts.rupees}</td>
                        <td className="border-b border-r border-slate-300 px-2 py-2 text-right">{amountParts.paisa}</td>
                      </tr>
                    )
                  })}
                  <tr className="h-36 border-x border-b border-slate-400"><td colSpan={7} /></tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-[1fr_280px] border-t border-slate-300">
          <div className="border-r border-slate-300 px-5 py-4">
            <div className="font-semibold">Amount in words:</div>
            <div className="mt-2 min-h-8 border-b border-dotted border-slate-400 pb-1 capitalize">{amountInWords(totals.grandTotal)}</div>
            <div className="mt-3"><span className="font-semibold">Notes:</span> {notes?.trim() || 'No notes provided.'}</div>
          </div>
          <div>
            <div className="flex justify-between border-b border-slate-300 px-4 py-2"><span className="font-semibold">Total</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex justify-between border-b border-slate-300 px-4 py-2"><span className="font-semibold">Discount</span><span>{money(totals.discountAmount)}</span></div>
            <div className="flex justify-between border-b border-slate-300 px-4 py-2"><span className="font-semibold">Taxable Amount</span><span>{money(totals.taxableAmount)}</span></div>
            <div className="flex justify-between border-b border-slate-300 px-4 py-2"><span className="font-semibold">VAT 13%</span><span>{money(totals.taxAmount)}</span></div>
            <div className="flex justify-between bg-slate-50 px-4 py-2 font-bold"><span>Grand Total</span><span>{money(totals.grandTotal)}</span></div>
          </div>
        </div>

        <footer className="grid grid-cols-2 gap-10 px-6 pb-7 pt-10 text-center">
          <div className="flex min-h-28 flex-col justify-end">
            <div className="mx-auto mb-3 w-44 border-t border-dotted border-slate-500" />
            <div className="font-semibold">Received by</div>
          </div>
          <div className="flex min-h-28 flex-col justify-end">
            <div className="mx-auto mb-3 w-44 border-t border-dotted border-slate-500" />
            <div className="font-semibold">Authorized Signature</div>
            <div className="mt-2 font-semibold">For : {signatureName}</div>
          </div>
        </footer>
      </section>
    </>
  )
}
