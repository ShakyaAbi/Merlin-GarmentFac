import React from 'react'

export default function PurchasesPage() {
  return (
    <div>
      <h1>Purchases</h1>
      <p>Create and view purchases</p>
      <div className="mt-3">
        <a href="#/inventory/purchases/create" className="px-3 py-2 bg-blue-600 text-white rounded">Create Purchase</a>
      </div>
    </div>
  )
}
