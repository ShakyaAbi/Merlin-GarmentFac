import React from "react";
import { Card } from "../ui/Card";
import type { SalesInvoiceStatus, SalesPaymentStatus } from "../../services/salesInvoiceApi";

export interface InvoiceTotalsSummary {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentStatus?: SalesPaymentStatus | string;
  invoiceStatus?: SalesInvoiceStatus | string;
  printedCount?: number;
  lineCount?: number;
}

type Props = {
  summary: InvoiceTotalsSummary;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const statusClass = (status?: string) => {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700";
    case "UNPAID":
      return "bg-rose-50 text-rose-700";
    case "ISSUED":
      return "bg-blue-50 text-blue-700";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export function InvoiceTotalsCard({
  summary,
  title = "Invoice Totals",
  description = "Live totals update as items change.",
  footer,
  className = "",
}: Props) {
  const rows = [
    { label: "Subtotal", value: money(summary.subtotal) },
    { label: "Discount", value: money(summary.discountAmount) },
    { label: "Taxable amount", value: money(summary.taxableAmount) },
    { label: "VAT 13%", value: money(summary.taxAmount) },
    { label: "Grand total", value: money(summary.grandTotal), emphasis: true },
  ];

  return (
    <Card title={title} className={className}>
      <p className="mb-4 text-sm text-slate-500">{description}</p>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {summary.invoiceStatus ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(summary.invoiceStatus)}`}>
              {summary.invoiceStatus}
            </span>
          ) : null}
          {summary.paymentStatus ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(summary.paymentStatus)}`}>
              {summary.paymentStatus}
            </span>
          ) : null}
          {typeof summary.printedCount === "number" ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Printed {summary.printedCount}x
            </span>
          ) : null}
          {typeof summary.lineCount === "number" ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {summary.lineCount} line{summary.lineCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <dl className="space-y-2 rounded-2xl bg-slate-50 p-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-slate-500">{row.label}</dt>
              <dd className={`font-semibold ${row.emphasis ? "text-slate-900" : "text-slate-800"}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {footer ? <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div> : null}
    </Card>
  );
}
