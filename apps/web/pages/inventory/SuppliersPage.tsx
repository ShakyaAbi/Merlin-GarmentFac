import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../../services/apiClient'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { InventoryDataTable } from '../../components/inventory/InventoryDataTable'
import { Button } from '../../components/ui/Button'

type SupplierForm = {
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  panVatNumber: string
  externalRef: string
  notes: string
  openingBalance: string
}

const emptyForm: SupplierForm = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  panVatNumber: '',
  externalRef: '',
  notes: '',
  openingBalance: '',
}

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))

export default function SuppliersPage() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const [nextSupplierNumber, setNextSupplierNumber] = useState('')

  const loadSuppliers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await request<any[]>('/inventory/suppliers')
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load suppliers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    request<{ supplierNumber?: string }>('/inventory/suppliers/next-number')
      .then((data) => setNextSupplierNumber(data?.supplierNumber || ''))
      .catch(() => setNextSupplierNumber(''))
    void loadSuppliers()
  }, [])

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contactName, supplier.email, supplier.phone, supplier.externalRef, supplier.supplierNumber]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [search, suppliers])

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await request('/inventory/suppliers', {
        method: 'POST',
        body: {
          ...form,
          name: form.name.trim(),
          openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
        },
      })
      setForm(emptyForm)
      await loadSuppliers()
    } catch (err: any) {
      setError(err?.message || 'Failed to create supplier.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Buying"
      title="Suppliers"
      description="Manage supplier master data, payables, and ledger access."
      actions={[{ label: 'Purchase Invoices', variant: 'outline', to: '/inventory/purchases' }]}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <InventorySectionCard title="New Supplier" description="Create a supplier record for purchase invoices and payable tracking." className="lg:col-span-1">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Supplier Number</span>
              <input value={nextSupplierNumber} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2" placeholder="SUP-00001" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Name</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Contact Name</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Primary contact" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Phone</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Email</span>
              <input type="email" className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Address</span>
              <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Supplier address" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">PAN / VAT</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.panVatNumber} onChange={(e) => setForm({ ...form, panVatNumber: e.target.value })} placeholder="Tax number" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">External Ref</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.externalRef} onChange={(e) => setForm({ ...form, externalRef: e.target.value })} placeholder="Optional vendor code" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Opening Balance (supplier payable)</span>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0.00" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Notes</span>
              <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional internal notes" />
            </label>
          </div>

          {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <div className="flex justify-end">
            <Button type="button" onClick={submit} isLoading={saving}>
              Create Supplier
            </Button>
          </div>
        </InventorySectionCard>

        <InventorySectionCard
          title="Supplier Ledger Register"
          description="Search suppliers and open their ledger, payment history, and purchase-invoice exposure."
          className="lg:col-span-2"
          action={<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:w-72" />}
        >
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              {search.trim() ? 'No matching suppliers found.' : 'No suppliers yet.'}
            </div>
          ) : (
            <InventoryDataTable
              caption="Supplier register"
              columns={[{ label: 'Supplier' }, { label: 'Contact' }, { label: 'Number' }, { label: 'Outstanding Payable' }, { label: 'Actions' }]}
            >
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-4 font-medium text-slate-900">
                    <div>{supplier.name}</div>
                    <div className="text-xs text-slate-500">{supplier.email || supplier.phone || 'No contact'}</div>
                  </td>
                  <td className="px-3 py-4 text-slate-600">{supplier.contactName || '-'}</td>
                  <td className="px-3 py-4 text-slate-600">{supplier.supplierNumber || '-'}</td>
                  <td className="px-3 py-4 font-semibold text-amber-700">{money(supplier.summary?.outstandingPayable)}</td>
                  <td className="px-3 py-4">
                    <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/suppliers/${supplier.id}`)}>
                      Open Ledger
                    </Button>
                  </td>
                </tr>
              ))}
            </InventoryDataTable>
          )}
        </InventorySectionCard>
      </div>
    </InventoryPageShell>
  )
}
