import React from "react";
import { Button } from "../ui/Button";

export interface InvoiceDraftItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  warehouseId: string;
}

type Props = {
  items: InvoiceDraftItem[];
  readOnly?: boolean;
  onAddItem?: () => void;
  onRemoveItem?: (id: string) => void;
  onChangeItem?: (id: string, patch: Partial<InvoiceDraftItem>) => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const lineTotal = (item: InvoiceDraftItem) => {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const discount = Number(item.discountAmount || 0);
  const tax = Number(item.taxAmount || 0);
  return Math.max(quantity * unitPrice - discount + tax, 0);
};

export function InvoiceItemTable({
  items,
  readOnly = false,
  onAddItem,
  onRemoveItem,
  onChangeItem,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Invoice Items</h3>
          <p className="text-sm text-slate-500">
            Add finished-goods lines, quantities, and pricing for this invoice.
          </p>
        </div>
        {!readOnly && onAddItem ? (
          <Button type="button" size="sm" onClick={onAddItem}>
            Add line
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">Sales invoice item lines</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Product Code</th>
              <th className="px-4 py-3 font-semibold">Product Name</th>
              <th className="px-4 py-3 font-semibold">Warehouse</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Unit Price</th>
              <th className="px-4 py-3 font-semibold">Discount</th>
              <th className="px-4 py-3 font-semibold">Tax</th>
              <th className="px-4 py-3 font-semibold">Line Total</th>
              {!readOnly ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 8 : 9}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No item lines yet.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const total = lineTotal(item);

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <span className="text-slate-700">{item.productCode || "-"}</span>
                      ) : (
                        <input
                          value={item.productCode}
                          onChange={(event) => onChangeItem?.(item.id, { productCode: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="FG-001"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <div>
                          <div className="font-medium text-slate-900">{item.productName || "Untitled item"}</div>
                          {item.productId ? (
                            <div className="text-xs text-slate-500">ID: {item.productId}</div>
                          ) : null}
                        </div>
                      ) : (
                        <input
                          value={item.productName}
                          onChange={(event) => onChangeItem?.(item.id, { productName: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Product name"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <span className="text-slate-700">{item.warehouseId || "-"}</span>
                      ) : (
                        <input
                          value={item.warehouseId}
                          onChange={(event) => onChangeItem?.(item.id, { warehouseId: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Main FG warehouse"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <span className="font-medium text-slate-900">{Number(item.quantity || 0)}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) => onChangeItem?.(item.id, { quantity: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <span className="font-medium text-slate-900">{money(Number(item.unitPrice || 0))}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => onChangeItem?.(item.id, { unitPrice: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <span className="font-medium text-slate-900">{money(Number(item.discountAmount || 0))}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discountAmount}
                          onChange={(event) => onChangeItem?.(item.id, { discountAmount: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {readOnly ? (
                        <span className="font-medium text-slate-900">{money(Number(item.taxAmount || 0))}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.taxAmount}
                          onChange={(event) => onChangeItem?.(item.id, { taxAmount: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="font-semibold text-slate-900">{money(total)}</span>
                    </td>
                    {!readOnly ? (
                      <td className="px-4 py-4 align-top">
                        <Button type="button" variant="outline" size="sm" onClick={() => onRemoveItem?.(item.id)}>
                          Remove
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
