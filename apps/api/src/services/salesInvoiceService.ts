import { Prisma } from '@prisma/client'
import { stringify } from 'csv-stringify/sync'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'
import { prisma } from '../prisma'
import * as repo from '../repositories/salesInvoiceRepository'
import * as userRepo from '../repositories/userRepository'
import { AppError } from '../utils/errors'
import { requireActiveOrganizationBankAccount } from './organizationBankAccountService'
import { getSalesCatalogProductsByIds, listSalesCatalogProducts } from './salesCatalogService'

type InvoiceItemInput = {
  productId: string
  quantity: number
  unitPrice?: number
  discountAmount?: number
  warehouseId?: string
}

const VAT_RATE = new Prisma.Decimal('0.13')
const EDGE_EXECUTABLE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PDF_BROWSER_PATH = existsSync(EDGE_EXECUTABLE_PATH) ? EDGE_EXECUTABLE_PATH : undefined

function toDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function decimal(value: number | string | Prisma.Decimal | null | undefined, fallback = 0) {
  return new Prisma.Decimal(value ?? fallback)
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(value: Prisma.Decimal | number | string | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

function splitAmount(value: Prisma.Decimal | number | string | null | undefined) {
  const rounded = Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100
  const [rupees, paisa = '00'] = Math.abs(rounded).toFixed(2).split('.')
  const sign = rounded < 0 ? '-' : ''
  return {
    rupees: `${sign}${Number(rupees).toLocaleString('en-US')}`,
    paisa,
  }
}

function formatDate(value?: Date | string | null) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function deriveLineTaxableAmount(quantity: Prisma.Decimal, unitPrice: Prisma.Decimal, discountAmount: Prisma.Decimal) {
  const lineSubtotal = quantity.mul(unitPrice)
  if (discountAmount.greaterThan(lineSubtotal)) {
    throw new AppError(400, 'INVALID_DISCOUNT', 'Line discount cannot exceed the line subtotal')
  }

  const taxableAmount = lineSubtotal.minus(discountAmount)
  return taxableAmount.lessThan(0) ? new Prisma.Decimal(0) : taxableAmount
}

function deriveLineAmounts(item: InvoiceItemInput, unitPrice: Prisma.Decimal, product: any) {
  const quantity = decimal(item.quantity)
  const discountAmount = decimal(item.discountAmount)
  const taxableAmount = deriveLineTaxableAmount(quantity, unitPrice, discountAmount)
  const taxAmount = taxableAmount.mul(VAT_RATE)
  const lineTotal = taxableAmount.plus(taxAmount)
  const costPrice = decimal(product.costPrice)
  const profitAmount = lineTotal.minus(quantity.mul(costPrice))

  return {
    quantity,
    unitPrice,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
    costPrice,
    profitAmount,
  }
}

function sumExistingItemTaxableAmount(item: any) {
  if (item.taxableAmount != null) return decimal(item.taxableAmount)
  if (item.lineTotal != null && item.taxAmount != null) {
    return decimal(item.lineTotal).minus(decimal(item.taxAmount))
  }
  return deriveLineTaxableAmount(decimal(item.quantity), decimal(item.unitPrice), decimal(item.discountAmount))
}

type InvoiceOrganizationProfile = {
  name?: string | null
  taxpayerNumber?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  province?: string | null
  country?: string | null
  invoiceFooter?: string | null
}

function buildInvoicePdfHtml(invoice: any, companyName: string, organizationProfile?: InvoiceOrganizationProfile | null) {
  const items = Array.isArray(invoice.items) ? invoice.items : []
  const subtotal = items.reduce(
    (sum: Prisma.Decimal, item: any) => sum.plus(decimal(item.quantity).mul(decimal(item.unitPrice))),
    new Prisma.Decimal(0),
  )
  const discountAmount = items.length > 0
    ? items.reduce((sum: Prisma.Decimal, item: any) => sum.plus(decimal(item.discountAmount)), new Prisma.Decimal(0))
    : decimal(invoice.discountAmount)
  const taxableAmount = subtotal.minus(discountAmount)
  const taxAmount = decimal(invoice.taxAmount ?? taxableAmount.mul(VAT_RATE))
  const grandTotal = decimal(invoice.grandTotal ?? taxableAmount.plus(taxAmount))
  const paidAmount = decimal(invoice.paidAmount)
  const dueAmount = decimal(invoice.dueAmount ?? grandTotal.minus(paidAmount))
  const companyAddress = [
    organizationProfile?.address,
    organizationProfile?.city,
    organizationProfile?.district,
    organizationProfile?.province,
    organizationProfile?.country,
  ].filter(Boolean).join(', ') || 'Nepal'

  const lineRows = items
    .map(
      (item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.productCode || item.product?.productCode || item.productId || '-')}</td>
          <td>
            <div class="desc">${escapeHtml(item.productName || item.product?.name || 'Untitled item')}</div>
            <div class="muted">${escapeHtml(item.warehouseId || item.product?.unit || '')}</div>
          </td>
          <td class="right">${Number(item.quantity ?? 0).toLocaleString('en-US')}</td>
          <td class="right">${formatMoney(item.unitPrice)}</td>
          <td class="right">${splitAmount(item.lineTotal ?? sumExistingItemTaxableAmount(item).plus(decimal(item.taxAmount))).rupees}</td>
          <td class="right">${splitAmount(item.lineTotal ?? sumExistingItemTaxableAmount(item).plus(decimal(item.taxAmount))).paisa}</td>
        </tr>`,
    )
    .join('')

  const paymentRows = Array.isArray(invoice.payments) && invoice.payments.length > 0
    ? invoice.payments
        .map(
          (payment: any) => `
            <tr>
              <td>${escapeHtml(payment.paymentNumber || payment.id)}</td>
              <td>${formatDate(payment.paymentDate || payment.createdAt || payment.paidAt)}</td>
              <td>${escapeHtml(payment.paymentMethod || payment.method || '-')}</td>
              <td>${escapeHtml(payment.note || payment.notes || '')}</td>
              <td class="right">${formatMoney(payment.amount)}</td>
            </tr>`,
        )
        .join('')
    : ''

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sheet {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            overflow: hidden;
          }
          .header {
            padding: 24px;
            background: #ffffff;
            border-bottom: 1px solid #cbd5e1;
            text-align: center;
          }
          .header-row, .info-grid, .totals-grid {
            display: grid;
            gap: 16px;
          }
          .header-row {
            display: block;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            margin: 6px 0 4px;
          }
          .muted {
            color: #64748b;
            font-size: 11px;
          }
          .panel {
            background: #f8fafc;
            border-radius: 14px;
            padding: 14px;
          }
          .info-grid {
            grid-template-columns: 1fr 1fr;
            padding: 14px 20px;
            border-bottom: 1px solid #e2e8f0;
          }
          .items {
            padding: 18px 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 10px 8px;
            vertical-align: top;
          }
          th {
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 10px;
            color: #64748b;
            text-align: left;
          }
          .right { text-align: right; white-space: nowrap; }
          .desc { font-weight: 600; }
          .totals {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            border-top: 1px solid #e2e8f0;
            padding: 18px 24px 24px;
          }
          .summary {
            background: #f8fafc;
            border-radius: 14px;
            padding: 14px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 4px 0;
            font-size: 13px;
          }
          .summary-row.total {
            border-top: 1px solid #cbd5e1;
            margin-top: 6px;
            padding-top: 10px;
            font-size: 15px;
            font-weight: 700;
          }
          .chip {
            display: inline-block;
            border: 1px solid #cbd5e1;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 700;
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            margin: 0 0 8px;
          }
          .payments {
            padding: 0 24px 24px;
          }
          .payments table td { font-size: 12px; }
          .amount-subhead { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #cbd5e1; margin-top: 4px; }
          .amount-subhead span { padding-top: 4px; font-size: 10px; font-weight: 400; text-align: center; }
          .amount-subhead span:first-child { border-right: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="header-row">
              <div class="muted" style="letter-spacing:0.2em; text-transform:uppercase; font-weight:700">TAX INVOICE</div>
              <div class="title">${escapeHtml(companyName)}</div>
              <div class="muted">${escapeHtml(companyAddress)}</div>
              <div class="muted">Sales Invoice</div>
            </div>
          </div>

          <div class="info-grid" style="padding-top:10px; padding-bottom:10px">
            <div class="panel">
              <div><strong>TPIN :</strong> ${escapeHtml(organizationProfile?.taxpayerNumber || '-')}</div>
            </div>
            <div class="panel">
              <div><strong>Date of Transaction</strong> : ${formatDate(invoice.invoiceDate || invoice.createdAt)}</div>
              <div style="margin-top:6px"><strong>Date of Invoice Issue</strong> : ${formatDate(invoice.createdAt || invoice.invoiceDate)}</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:10px 20px; border-bottom:1px solid #cbd5e1">
            <div style="padding-right:12px">
              <div><strong>Buyer's Name :</strong> ${escapeHtml(invoice.customer?.customerName || 'Walk-in customer')}</div>
              <div style="margin-top:6px"><strong>Address :</strong> ${escapeHtml(invoice.customer?.address || '-')}</div>
              <div style="margin-top:6px"><strong>Buyer's TPIN :</strong> ${escapeHtml(invoice.customer?.panVatNumber || '-')}</div>
            </div>
            <div style="padding-left:12px; text-align:right">
              <div><strong>Invoice No.</strong> : ${escapeHtml(invoice.invoiceNumber || '-')}</div>
              <div style="margin-top:6px"><strong>Mode of Payment :</strong> ${escapeHtml(invoice.paymentMethod || invoice.paymentMode || '-')}</div>
            </div>
          </div>

          <div class="items">
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width:48px">S.N.</th>
                  <th rowspan="2" style="width:100px">H.S. Code</th>
                  <th rowspan="2">Description</th>
                  <th rowspan="2" class="right" style="width:60px">Qty.</th>
                  <th rowspan="2" class="right" style="width:100px">Unit Price</th>
                  <th colspan="2" style="text-align:center">Amount</th>
                </tr>
                <tr>
                  <th class="right" style="width:60px">Rs.</th>
                  <th class="right" style="width:60px">Ps.</th>
                </tr>
              </thead>
              <tbody>
                ${lineRows || `<tr><td colspan="7" style="padding:16px; color:#64748b;">No item lines.</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="panel">
              <div class="section-title">Amount in words:</div>
              <div class="muted">${formatMoney(grandTotal)} Rupees Only</div>
              <div style="margin-top:16px"><strong>Notes:</strong> ${escapeHtml([invoice.remarks, organizationProfile?.invoiceFooter].filter(Boolean).join(' — ') || 'No notes provided.')}</div>
            </div>
            <div class="summary">
              <div class="summary-row"><span>Total</span><span>${formatMoney(subtotal)}</span></div>
              <div class="summary-row"><span>Discount</span><span>${formatMoney(discountAmount)}</span></div>
              <div class="summary-row"><span>Taxable Amount</span><span>${formatMoney(taxableAmount)}</span></div>
              <div class="summary-row"><span>VAT 13%</span><span>${formatMoney(taxAmount)}</span></div>
              <div class="summary-row total"><span>Grand Total</span><span>${formatMoney(grandTotal)}</span></div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; padding:38px 24px 16px; text-align:center">
            <div style="display:flex; min-height:112px; flex-direction:column; justify-content:flex-end">
              <div style="border-top:1px dotted #64748b; width:176px; margin:0 auto 10px"></div>
              <strong>Received by</strong>
            </div>
            <div style="display:flex; min-height:112px; flex-direction:column; justify-content:flex-end">
              <div style="border-top:1px dotted #64748b; width:176px; margin:0 auto 10px"></div>
              <strong>Authorized Signature</strong>
              <div style="margin-top:6px"><strong>For : ${escapeHtml(companyName)}</strong></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

async function htmlToPdfBuffer(html: string) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: PDF_BROWSER_PATH,
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    })
  } finally {
    await browser.close()
  }
}

function buildInvoiceTotalsFromItems(items: any[], invoiceDiscountValue: number | string | Prisma.Decimal | null | undefined) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(decimal(item.quantity).mul(decimal(item.unitPrice))),
    new Prisma.Decimal(0),
  )
  const lineDiscountAmount = items.reduce((sum, item) => sum.plus(decimal(item.discountAmount)), new Prisma.Decimal(0))
  const invoiceDiscount = lineDiscountAmount.plus(decimal(invoiceDiscountValue))

  if (invoiceDiscount.greaterThan(subtotal)) {
    throw new AppError(400, 'INVALID_DISCOUNT', 'Invoice discount cannot exceed the subtotal')
  }

  const taxableAmount = subtotal.minus(invoiceDiscount)
  const taxAmount = taxableAmount.mul(VAT_RATE)
  const grandTotal = taxableAmount.plus(taxAmount)

  return { subtotal, invoiceDiscount, taxableAmount, taxAmount, grandTotal }
}

async function buildInvoiceData(payload: any) {
  const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } })
  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', 'Customer not found')
  }

  const items: InvoiceItemInput[] = payload.items || []
  const productMap = await getSalesCatalogProductsByIds(items.map((item) => item.productId))

  const invoiceDiscountValue = payload.discountAmount ?? 0
  const preparedItems: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>> = []

  for (const item of items) {
    const product = productMap.get(item.productId)!
    const unitPrice = decimal(item.unitPrice ?? product.sellingPrice ?? 0)
    const lineAmounts = deriveLineAmounts(item, unitPrice, product)

    preparedItems.push({
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      quantity: Number(lineAmounts.quantity),
      unitPrice: lineAmounts.unitPrice,
      discountAmount: lineAmounts.discountAmount,
      taxableAmount: lineAmounts.taxableAmount,
      taxAmount: lineAmounts.taxAmount,
      lineTotal: lineAmounts.lineTotal,
      costPrice: lineAmounts.costPrice,
      profitAmount: lineAmounts.profitAmount,
      warehouseId: item.warehouseId || null,
    })
  }

  const totals = buildInvoiceTotalsFromItems(preparedItems, invoiceDiscountValue)

  const invoiceDate = toDate(payload.invoiceDate) || new Date()
  const dueDate = toDate(payload.dueDate)

  return {
    invoiceData: {
      invoiceNumber: payload.invoiceNumber ?? null,
      fiscalYear: payload.fiscalYear || `FY${invoiceDate.getFullYear()}`,
      customerId: payload.customerId,
      salesOrderId: payload.salesOrderId ?? null,
      invoiceDate,
      dueDate,
      subtotal: totals.subtotal,
      discountAmount: totals.invoiceDiscount,
      taxableAmount: totals.taxableAmount,
      nonTaxableAmount: new Prisma.Decimal(0),
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      paidAmount: new Prisma.Decimal(0),
      dueAmount: totals.grandTotal,
      paymentStatus: 'UNPAID',
      invoiceStatus: 'DRAFT',
      remarks: payload.remarks || null,
      createdBy: payload.createdBy ?? null,
    } as Prisma.SalesInvoiceUncheckedCreateInput,
    items: preparedItems,
  }
}

function invoiceDraftable(invoice: any) {
  return invoice.invoiceStatus === 'DRAFT' || invoice.invoiceStatus === 'PENDING_APPROVAL'
}

function invoiceEditable(invoice: any) {
  return invoice.invoiceStatus === 'DRAFT'
}

function rebuildFromExisting(invoice: any, payload: any) {
  const invoiceDiscountValue = payload.discountAmount ?? invoice.discountAmount ?? 0
  const preparedItems: Array<Omit<Prisma.SalesInvoiceItemUncheckedCreateInput, 'invoiceId'>> = []

  for (const item of invoice.items) {
    const quantity = decimal(item.quantity)
    const unitPrice = decimal(item.unitPrice)
    const discountAmount = decimal(item.discountAmount)
    const taxableAmount = sumExistingItemTaxableAmount(item)
    const taxAmount = taxableAmount.mul(VAT_RATE)
    const lineTotal = taxableAmount.plus(taxAmount)
    const costPrice = decimal(item.costPrice)

    preparedItems.push({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: Number(quantity),
      unitPrice,
      discountAmount,
      taxableAmount,
      taxAmount,
      lineTotal,
      costPrice,
      profitAmount: lineTotal.minus(quantity.mul(costPrice)),
      warehouseId: item.warehouseId || null,
    })
  }

  const totals = buildInvoiceTotalsFromItems(invoice.items, invoiceDiscountValue)
  const paidAmount = decimal(invoice.paidAmount)
  const dueAmount = totals.grandTotal.minus(paidAmount)

  return {
    invoiceData: {
      invoiceNumber: payload.invoiceNumber ?? invoice.invoiceNumber ?? null,
      fiscalYear: payload.fiscalYear ?? invoice.fiscalYear ?? `FY${new Date(invoice.invoiceDate).getFullYear()}`,
      customerId: payload.customerId ?? invoice.customerId,
      invoiceDate: toDate(payload.invoiceDate) || invoice.invoiceDate,
      dueDate: toDate(payload.dueDate) ?? invoice.dueDate,
      subtotal: totals.subtotal,
      discountAmount: totals.invoiceDiscount,
      taxableAmount: totals.taxableAmount,
      nonTaxableAmount: invoice.nonTaxableAmount ?? new Prisma.Decimal(0),
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      paidAmount,
      dueAmount,
      remarks: payload.remarks ?? invoice.remarks ?? null,
    },
    items: preparedItems,
  }
}

export async function listInvoices(opts: any = {}) {
  return repo.listInvoices(opts)
}

export async function exportInvoices(opts: {
  search?: string
  customerId?: string
  invoiceStatus?: any
  paymentStatus?: any
} = {}) {
  const data = await repo.listInvoices({ ...opts, page: 1, pageSize: 1000 })
  const rows = data.items.map((invoice: any) => ({
    invoiceNumber: invoice.invoiceNumber || '-',
    customerName: invoice.customer?.customerName || '',
    invoiceDate: invoice.invoiceDate?.toISOString?.() || invoice.invoiceDate,
    dueDate: invoice.dueDate?.toISOString?.() || invoice.dueDate || '',
    invoiceStatus: invoice.invoiceStatus || '',
    paymentStatus: invoice.paymentStatus || '',
    grandTotal: Number(invoice.grandTotal ?? 0),
    paidAmount: Number(invoice.paidAmount ?? 0),
    dueAmount: Number(invoice.dueAmount ?? 0),
    remarks: invoice.remarks || '',
  }))

  return stringify(rows, {
    header: true,
    columns: [
      { key: 'invoiceNumber', header: 'Invoice Number' },
      { key: 'customerName', header: 'Customer' },
      { key: 'invoiceDate', header: 'Invoice Date' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'invoiceStatus', header: 'Invoice Status' },
      { key: 'paymentStatus', header: 'Payment Status' },
      { key: 'grandTotal', header: 'Grand Total' },
      { key: 'paidAmount', header: 'Paid Amount' },
      { key: 'dueAmount', header: 'Due Amount' },
      { key: 'remarks', header: 'Remarks' },
    ],
  })
}

export async function exportInvoice(id: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }

  const rows = [
    {
      invoiceNumber: invoice.invoiceNumber || '-',
      customerName: invoice.customer?.customerName || '',
      invoiceDate: invoice.invoiceDate?.toISOString?.() || invoice.invoiceDate,
      dueDate: invoice.dueDate?.toISOString?.() || invoice.dueDate || '',
      invoiceStatus: invoice.invoiceStatus || '',
      paymentStatus: invoice.paymentStatus || '',
      grandTotal: Number(invoice.grandTotal ?? 0),
      paidAmount: Number(invoice.paidAmount ?? 0),
      dueAmount: Number(invoice.dueAmount ?? 0),
      remarks: invoice.remarks || '',
      lines: invoice.items.length,
    },
  ]

  return stringify(rows, {
    header: true,
    columns: [
      { key: 'invoiceNumber', header: 'Invoice Number' },
      { key: 'customerName', header: 'Customer' },
      { key: 'invoiceDate', header: 'Invoice Date' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'invoiceStatus', header: 'Invoice Status' },
      { key: 'paymentStatus', header: 'Payment Status' },
      { key: 'grandTotal', header: 'Grand Total' },
      { key: 'paidAmount', header: 'Paid Amount' },
      { key: 'dueAmount', header: 'Due Amount' },
      { key: 'remarks', header: 'Remarks' },
      { key: 'lines', header: 'Lines' },
    ],
  })
}

export async function exportInvoicePdf(id: string, companyName = 'Merlin Lite', organizationProfile?: InvoiceOrganizationProfile | null) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }

  const html = buildInvoicePdfHtml(invoice, companyName, organizationProfile)
  return htmlToPdfBuffer(html)
}

export async function listCustomers(opts: { search?: string } = {}) {
  const where: any = { deletedAt: null }
  if (opts.search) {
    where.OR = [
      { customerName: { contains: opts.search, mode: 'insensitive' } },
      { phone: { contains: opts.search, mode: 'insensitive' } },
      { panVatNumber: { contains: opts.search, mode: 'insensitive' } },
      { customerType: { contains: opts.search, mode: 'insensitive' } },
      { email: { contains: opts.search, mode: 'insensitive' } },
    ]
  }

  return prisma.customer.findMany({
    where,
    orderBy: { customerName: 'asc' },
    select: {
      id: true,
      customerName: true,
      phone: true,
      address: true,
      panVatNumber: true,
      customerType: true,
      email: true,
      notes: true,
      createdAt: true,
    },
  })
}

export async function listProducts(opts: { search?: string } = {}) {
  return listSalesCatalogProducts(opts)
}

export async function getInvoice(id: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) return null
  return invoice
}

export async function listInvoicePayments(id: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  return repo.listInvoicePayments(id)
}

export async function previewNextInvoiceNumber(invoiceDate: Date, resetByFiscalYear = true, initialNumber = 1) {
  return repo.previewNextInvoiceNumber(invoiceDate, resetByFiscalYear, initialNumber)
}

export async function createInvoice(payload: any, userId?: number) {
  const prepared = await buildInvoiceData({ ...payload, createdBy: userId })
  const user = userId ? await userRepo.findById(userId) : null
  return repo.createDraftInvoice(prepared.invoiceData, prepared.items, user?.organization?.nextSalesInvoiceNumber ?? 1)
}

export async function updateInvoice(id: string, payload: any, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) {
    throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  }
  if (!invoiceDraftable(invoice)) {
    throw new AppError(409, 'INVALID_STATUS', 'Only draft or pending-approval invoices can be updated')
  }

  const prepared = payload.items?.length
    ? await buildInvoiceData({
        ...payload,
        invoiceNumber: payload.invoiceNumber ?? invoice.invoiceNumber ?? null,
        customerId: payload.customerId || invoice.customerId,
        createdBy: userId,
      })
    : rebuildFromExisting(invoice, payload)

  return repo.updateDraftInvoice(id, prepared.invoiceData, payload.items?.length ? prepared.items : undefined)
}

export async function issueInvoice(id: string, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  if (invoice.invoiceStatus !== 'DRAFT' && invoice.invoiceStatus !== 'PENDING_APPROVAL') {
    throw new AppError(409, 'INVALID_STATUS', 'Only draft or pending-approval invoices can be issued')
  }
  const user = userId ? await userRepo.findById(userId) : null
  return repo.issueInvoice(id, userId, user?.organization?.nextSalesInvoiceNumber ?? 1)
}

export async function recordPayment(id: string, payload: any, userId?: number, organizationId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  const method = String(payload.paymentMethod || '').toLowerCase()
  if (/bank|cheque|mobile/.test(method) && !payload.bankAccountId) throw new AppError(400, 'BANK_ACCOUNT_REQUIRED', 'Select the organization bank account used for this payment')
  if (payload.bankAccountId && organizationId) await requireActiveOrganizationBankAccount(payload.bankAccountId, organizationId)
  return repo.recordPayment(
    id,
    {
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      paymentDate: toDate(payload.paymentDate) || undefined,
      note: payload.note,
      bankAccountId: payload.bankAccountId,
    },
    userId,
  )
}

export async function updatePayment(id: string, paymentId: string, payload: any, userId?: number, organizationId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  if (payload.bankAccountId && organizationId) await requireActiveOrganizationBankAccount(payload.bankAccountId, organizationId)
  return repo.updatePayment(
    id,
    paymentId,
    {
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      paymentDate: toDate(payload.paymentDate) || undefined,
      note: payload.note,
      bankAccountId: payload.bankAccountId,
    },
    userId,
  )
}

export async function deletePayment(id: string, paymentId: string) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  return repo.deletePayment(id, paymentId)
}

export async function cancelInvoice(id: string, payload: any, userId?: number) {
  const invoice = await repo.getInvoice(id)
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Sales invoice not found')
  return repo.cancelInvoice(id, payload.reason, userId)
}
