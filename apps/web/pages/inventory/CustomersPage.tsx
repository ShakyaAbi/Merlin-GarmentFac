import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'

type CustomerForm = {
  customerName: string
  phone: string
  email: string
  address: string
  panVatNumber: string
  customerType: string
  notes: string
  openingBalance: string
}

const emptyForm: CustomerForm = {
  customerName: '',
  phone: '',
  email: '',
  address: '',
  panVatNumber: '',
  customerType: '',
  notes: '',
  openingBalance: '',
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(Number(value ?? 0))

export default function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [nextCustomerNumber, setNextCustomerNumber] = useState('')

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<any[]>('/customers')
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/customers/next-number').then((data: any) => setNextCustomerNumber(data?.customerNumber || '')).catch(() => setNextCustomerNumber(''))
    void loadCustomers()
  }, [])

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((customer) =>
      [customer.customerName, customer.phone, customer.email, customer.panVatNumber, customer.customerType, customer.address]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [customers, search])

  const stats = useMemo(() => {
    const totalSales = customers.reduce((sum, customer) => sum + Number(customer.summary?.totalInvoiced ?? 0), 0)
    const openBalance = customers.reduce((sum, customer) => sum + Number(customer.summary?.outstandingAmount ?? 0), 0)
    return { total: customers.length, totalSales, openBalance }
  }, [customers])

  const saveCustomer = async () => {
    if (!form.customerName.trim()) {
      setError('Customer name is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await api.post('/customers', {
        ...form,
        customerName: form.customerName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        panVatNumber: form.panVatNumber.trim() || undefined,
        customerType: form.customerType.trim() || undefined,
        notes: form.notes.trim() || undefined,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
      })
      setForm(emptyForm)
      await loadCustomers()
    } catch (err: any) {
      setError(err?.message || 'Failed to save customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Sales Master"
      title="Customers"
      description="Keep customer master data available for invoices, collections, and reporting."
      backTo={{ to: '/sales-invoices', label: 'Back to sales invoices' }}
      actions={[{ label: 'New Invoice', variant: 'outline', to: '/sales-invoices/create' }]}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <InventorySectionCard title="New Customer" description="Create a customer record once and reuse it in sales documents.">
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Customer Number</span>
              <input value={nextCustomerNumber} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2" placeholder="CUS-00001" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Customer Name</span>
              <input
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Company or customer name"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Phone"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Email"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Address</span>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Customer address"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">PAN / VAT</span>
                <input
                  value={form.panVatNumber}
                  onChange={(e) => setForm({ ...form, panVatNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Tax reference"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Type</span>
                <input
                  value={form.customerType}
                  onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Retail, wholesale, distributor..."
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Optional internal notes"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Opening Balance (customer receivable)</span>
              <input
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="0.00"
              />
            </label>
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" onClick={saveCustomer} isLoading={saving}>
                Save Customer
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
                Clear
              </Button>
            </div>
          </div>
        </InventorySectionCard>

        <div className="space-y-6">
          <InventorySectionCard
            title="Customer Register"
            description="Search, review invoice exposure, and keep the sales master clean."
            action={
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:w-72"
              />
            }
          >
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                {search.trim() ? 'No matching customers found.' : 'No customers yet.'}
              </div>
            ) : (
              <InventoryDataTable
                caption="Customer register"
                columns={[
                  { label: 'Customer' },
                  { label: 'Contact' },
                  { label: 'Type' },
                  { label: 'Invoices' },
                  { label: 'Open Balance' },
                  { label: 'Actions' },
                ]}
              >
                  {filteredCustomers.map((customer) => {
                    const invoices = Array.isArray(customer.salesInvoices) ? customer.salesInvoices : []
                    const openBalance = Number(customer.summary?.outstandingAmount ?? 0)
                    return (
                      <tr key={customer.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                        <td className="px-3 py-4 align-top">
                          <div className="font-semibold text-slate-900">{customer.customerName}</div>
                          <div className="text-xs text-slate-500">{customer.customerNumber || 'No number'}</div>
                        </td>
                      <td className="px-3 py-4 align-top text-slate-600">
                        <div>{customer.phone || '-'}</div>
                        <div className="text-xs">{customer.address || '-'}</div>
                      </td>
                      <td className="px-3 py-4 align-top text-slate-600">{customer.customerType || '-'}</td>
                      <td className="px-3 py-4 align-top text-slate-700">{invoices.length}</td>
                      <td className="px-3 py-4 align-top text-slate-700">{money(openBalance)}</td>
                      <td className="px-3 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/customers/${customer.id}`)}>
                            Open
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </InventoryDataTable>
            )}
          </InventorySectionCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total customers</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Invoices linked</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.totalSales}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Open balance</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{money(stats.openBalance)}</div>
            </div>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  )
}
