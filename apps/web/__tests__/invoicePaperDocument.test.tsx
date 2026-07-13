import React from 'react'
import { render, screen } from '@testing-library/react'
import { amountInWords } from '../components/invoices/amountInWords'
import { calculateInvoiceTotals } from '../components/invoices/invoiceTotals'
import { InvoicePaperDocument } from '../components/invoices/InvoicePaperDocument'

test('calculateInvoiceTotals computes taxable amount and 13 percent VAT', () => {
  const totals = calculateInvoiceTotals({
    lines: [
      { id: '1', quantity: 2, rate: 1000 },
      { id: '2', quantity: 1, rate: 500 },
    ],
    discountAmount: 300,
  })

  expect(totals.subtotal).toBe(2500)
  expect(totals.discountAmount).toBe(300)
  expect(totals.taxableAmount).toBe(2200)
  expect(totals.taxAmount).toBeCloseTo(286)
  expect(totals.grandTotal).toBeCloseTo(2486)
})

test('amountInWords formats npr amounts in english words', () => {
  expect(amountInWords(2486)).toBe('Two Thousand Four Hundred Eighty-Six Rupees Only')
})

test('InvoicePaperDocument renders the paper invoice structure', () => {
  render(
    <InvoicePaperDocument
      companyName="Harilakshmi Enterprises"
      companyAddress="Balaju, Kathmandu"
      companyPanVat="300276840"
      invoiceTitle="Sales Invoice"
      invoiceNumber="SI-001"
      invoiceDate="2026-06-13"
      party={{
        label: 'Buyer',
        name: 'Amana Plaza Fashion',
        address: 'Kalimati',
        panVatNumber: '602110270',
      }}
      notes="Handle with care"
      items={[
        { id: '1', code: '5208', description: 'Cotton Morkim cloth', quantity: 2000, rate: 62 },
        { id: '2', code: '5209', description: 'Cotton Jella cloth', quantity: 4948.75, rate: 125 },
      ]}
      discountAmount={0}
    />,
  )

  expect(screen.getByText('Harilakshmi Enterprises')).toBeTruthy()
  expect(screen.getByText('TAX INVOICE')).toBeTruthy()
  expect(screen.getByText('Sales Invoice')).toBeTruthy()
  expect(screen.getByText('Invoice No.')).toBeTruthy()
  expect(screen.getByText('Date of Transaction')).toBeTruthy()
  expect(screen.getByText('Date of Invoice Issue')).toBeTruthy()
  expect(screen.getByText('Mode of Payment')).toBeTruthy()
  expect(screen.getByText('H.S. Code')).toBeTruthy()
  expect(screen.getByText('Unit Price')).toBeTruthy()
  expect(screen.getByText('Rs.')).toBeTruthy()
  expect(screen.getByText('Ps.')).toBeTruthy()
  expect(screen.getByText('SI-001')).toBeTruthy()
  expect(screen.getByText('Buyer')).toBeTruthy()
  expect(screen.getByText('Amana Plaza Fashion')).toBeTruthy()
  expect(screen.getByText('VAT 13%')).toBeTruthy()
  expect(screen.getByText('Amount in words')).toBeTruthy()
  expect(screen.getByText('Received by')).toBeTruthy()
  expect(screen.getByText('Authorized Signature')).toBeTruthy()
  expect(screen.getByText('Handle with care')).toBeTruthy()
})

test('InvoicePaperDocument renders the approved totals block and notes placeholder', () => {
  render(
    <InvoicePaperDocument
      companyName="Harilakshmi Enterprises"
      invoiceTitle="Sales Invoice"
      invoiceNumber="SI-002"
      party={{
        label: 'Buyer',
        name: 'Walk-in customer',
      }}
      items={[
        { id: '1', code: 'A1', description: 'Item A', quantity: 1, rate: 1000 },
      ]}
      discountAmount={100}
    />,
  )

  expect(screen.getByText('Subtotal')).toBeTruthy()
  expect(screen.getByText('Discount')).toBeTruthy()
  expect(screen.getByText('Taxable Amount')).toBeTruthy()
  expect(screen.getByText('VAT 13%')).toBeTruthy()
  expect(screen.getByText('Grand Total')).toBeTruthy()
  expect(screen.getByText('No notes provided.')).toBeTruthy()
})

test('InvoicePaperDocument renders a purchase-style layout', () => {
  render(
    <InvoicePaperDocument
      companyName="Harilakshmi Enterprises"
      invoiceTitle="Purchase Invoice"
      invoiceNumber="PI-003"
      party={{
        label: 'Supplier',
        name: 'ABC Traders',
        address: 'Kathmandu',
      }}
      items={[
        { id: '1', code: 'RM-1', description: 'Raw Material', quantity: 2, rate: 500 },
      ]}
      discountAmount={0}
      notes=""
    />,
  )

  expect(screen.getByText('Purchase Invoice')).toBeTruthy()
  expect(screen.getByText('Supplier')).toBeTruthy()
  expect(screen.getByText('ABC Traders')).toBeTruthy()
})
