import React from "react";
import { Button } from "../ui/Button";
import type { SalesInvoiceProduct } from "../../services/salesInvoiceApi";

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
  products?: SalesInvoiceProduct[];
  readOnly?: boolean;
  taxEditable?: boolean;
  showWarehouse?: boolean;
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

const getProductCode = (product: SalesInvoiceProduct) => product.productCode || product.sku || product.id;

const getProductPrice = (product: SalesInvoiceProduct) => String(product.sellingPrice ?? product.costPrice ?? 0);

const applyProductToItem = (
  item: InvoiceDraftItem,
  productId: string,
  products: SalesInvoiceProduct[],
  onChangeItem?: (id: string, patch: Partial<InvoiceDraftItem>) => void,
) => {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) {
    onChangeItem?.(item.id, {
      productId,
      productCode: "",
      productName: "",
      unitPrice: "0",
      warehouseId: "",
    });
    return;
  }

  onChangeItem?.(item.id, {
    productId: product.id,
    productCode: getProductCode(product),
    productName: product.name,
    unitPrice: getProductPrice(product),
    warehouseId: product.category || item.warehouseId || "Articles",
  });
};

export function InvoiceItemTable({
  items,
  products = [],
  readOnly = false,
  taxEditable = true,
  showWarehouse = true,
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
            Add article lines, quantities, and pricing for this invoice.
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
              <th className="px-4 py-3 font-semibold">Article</th>
              <th className="px-4 py-3 font-semibold">Selected Product</th>
              {showWarehouse ? <th className="px-4 py-3 font-semibold">Warehouse</th> : null}
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Unit Price</th>
              <th className="px-4 py-3 font-semibold">Discount</th>
              <th className="px-4 py-3 font-semibold">VAT 13%</th>
              <th className="px-4 py-3 font-semibold">Line Total</th>
              {!readOnly ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? (showWarehouse ? 8 : 7) : showWarehouse ? 9 : 8} className="px-6 py-12 text-center text-sm text-slate-500">
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
                        <div className="min-w-[16rem]">
                          <select
                            value={item.productId}
                            onChange={(event) => applyProductToItem(item, event.target.value, products, onChangeItem)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select article</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {getProductCode(product)} - {product.name}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.productCode || "Choose from finished goods"}
                          </div>
                        </div>
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
                        <div className="min-w-[14rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                          <div className="truncate font-medium text-slate-900">
                            {item.productName || "No article selected"}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {item.productId ? `ID: ${item.productId}` : "Product details fill automatically"}
                          </div>
                        </div>
                      )}
                    </td>
                    {showWarehouse ? (
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
                    ) : null}
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
                        taxEditable ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.taxAmount}
                            onChange={(event) => onChangeItem?.(item.id, { taxAmount: event.target.value })}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          />
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                            {money(Number(item.taxAmount || 0))}
                          </div>
                        )
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
