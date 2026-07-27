# Purchase invoice lifecycle

## Goal

Give purchase invoices the same operational lifecycle as sales invoices: payment recording and history, payment edits/deletes, payment status, and cancellation that reverses the received stock and supplier payable entry.

## Contract

- A purchase starts as `received` and `UNPAID`.
- Payment totals are derived from purchase payments and capped at the invoice total.
- Cancelled purchases cannot receive, edit, or delete payments.
- Cancellation is admin-only and creates negative stock transactions for the received lines, then removes the purchase invoice ledger entry.
- Bank/cheque/mobile payments require an active organization bank account.

## Implementation slices

1. Add purchase payment/status/cancellation fields and migration.
2. Add repository/service/controller routes and source tests.
3. Add payment history/actions and cancellation controls to `PurchaseDetailPage`.
4. Regenerate Prisma, run API/web checks, and refresh graphify output.
