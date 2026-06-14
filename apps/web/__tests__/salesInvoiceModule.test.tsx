// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SalesInvoiceListPage from "../pages/sales/SalesInvoiceListPage";
import SalesInvoiceCreatePage from "../pages/sales/SalesInvoiceCreatePage";
import SalesInvoiceDetailPage from "../pages/sales/SalesInvoiceDetailPage";
import { salesInvoiceApi } from "../services/salesInvoiceApi";

jest.mock("../services/salesInvoiceApi", () => ({
  salesInvoiceApi: {
    listCustomers: jest.fn(),
    listProducts: jest.fn(),
    list: jest.fn(),
    previewNextInvoiceNumber: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    submit: jest.fn(),
    issue: jest.fn(),
    payment: jest.fn(),
    cancel: jest.fn(),
    downloadCsv: jest.fn(),
    export: jest.fn(),
  },
}));

const mockedApi = salesInvoiceApi as jest.Mocked<typeof salesInvoiceApi>;

describe("sales invoice screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the invoice list workflow", async () => {
    mockedApi.list.mockResolvedValue([
      {
        id: "inv-1",
        invoiceNumber: "SI-001",
        customerId: "cus-1",
        customerName: "Acme Trading",
        invoiceDate: "2026-06-08T00:00:00.000Z",
        grandTotal: 1200,
        paidAmount: 200,
        dueAmount: 1000,
        paymentStatus: "PARTIAL",
        invoiceStatus: "ISSUED",
        createdBy: 7,
      },
    ] as any);

    render(
      <MemoryRouter initialEntries={["/sales-invoices"]}>
        <Routes>
          <Route path="/sales-invoices" element={<SalesInvoiceListPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("SI-001")).toBeTruthy();
    expect(screen.getByText("Sales Invoices")).toBeTruthy();
    expect(screen.getByText("New Invoice")).toBeTruthy();
    expect(screen.getByText("Invoice Register")).toBeTruthy();
    expect(screen.getByText("Acme Trading")).toBeTruthy();
  });

  it("renders the invoice create form", async () => {
    mockedApi.listCustomers.mockResolvedValue([
      {
        id: "cus-1",
        customerName: "Acme Trading",
        phone: "111-222",
        panVatNumber: "PAN-1",
      },
    ] as any);
    mockedApi.listProducts.mockResolvedValue([
      {
        id: "fg-1",
        productCode: "FG-001",
        name: "Article One",
        unit: "pcs",
        sellingPrice: 1200,
      },
    ] as any);

    render(
      <MemoryRouter initialEntries={["/sales-invoices/create"]}>
        <Routes>
          <Route path="/sales-invoices/create" element={<SalesInvoiceCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("New Sales Invoice")).toBeTruthy();
    expect(await screen.findByText("Invoice Header")).toBeTruthy();
    expect(await screen.findByText("Invoice Items")).toBeTruthy();
    expect(await screen.findByText("Save Draft")).toBeTruthy();
    expect(await screen.findByText("Save & Issue")).toBeTruthy();
    expect(await screen.findByText("Finished-Goods Catalog")).toBeTruthy();
  });

  it("prefills the next sales invoice number from the backend", async () => {
    mockedApi.listCustomers.mockResolvedValue([]);
    mockedApi.listProducts.mockResolvedValue([]);
    mockedApi.previewNextInvoiceNumber.mockResolvedValue("SI-2026-00042");

    render(
      <MemoryRouter initialEntries={["/sales-invoices/create"]}>
        <Routes>
          <Route path="/sales-invoices/create" element={<SalesInvoiceCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("SI-2026-00042")).toBeTruthy();
    expect(mockedApi.previewNextInvoiceNumber).toHaveBeenCalledWith("2026-06-13");
  });

  it("renders the invoice detail workflow", async () => {
    mockedApi.get.mockResolvedValue({
      id: "inv-1",
      invoiceNumber: "SI-001",
      customerId: "cus-1",
      customerName: "Acme Trading",
      invoiceDate: "2026-06-08T00:00:00.000Z",
      grandTotal: 1200,
      paidAmount: 200,
      dueAmount: 1000,
      paymentStatus: "PARTIAL",
      invoiceStatus: "ISSUED",
      printedCount: 1,
      items: [
        {
          id: "item-1",
          productName: "Jacket",
          quantity: 10,
          unitPrice: 120,
          lineTotal: 1200,
        },
      ],
      payments: [],
    } as any);

    render(
      <MemoryRouter initialEntries={["/sales-invoices/inv-1"]}>
        <Routes>
          <Route path="/sales-invoices/:id" element={<SalesInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("SI-001")).toBeTruthy();
    expect(screen.getByText("Record Payment")).toBeTruthy();
    expect(screen.getByText("Cancel Invoice")).toBeTruthy();
    expect(screen.getByText("Issue")).toBeTruthy();
  });
});
