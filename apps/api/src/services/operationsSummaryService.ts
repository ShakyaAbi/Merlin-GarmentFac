import { prisma } from '../prisma'
import { listPurchasesForMaterial as listMaterialPurchases } from '../repositories/inventory/purchaseRepository'

function toNumber(value: any) {
  return Number(value ?? 0)
}

function money(value: any) {
  return Number(value ?? 0)
}

function costFromBomItems(order: any) {
  const plannedQty = toNumber(order.quantityPlanned)
  const bomItems = Array.isArray(order.bom?.items) ? order.bom.items : []
  return bomItems.reduce((sum: number, item: any) => {
    const unitCost = toNumber(item.rawMaterial?.costPrice ?? item.rawMaterial?.averageUnitCost ?? 0)
    const consumption = toNumber(item.consumption)
    return sum + unitCost * consumption * plannedQty
  }, 0)
}

function productionCostBase(order: any) {
  return costFromBomItems(order)
}

function classifyOverheadExpense(expense: any) {
  const text = `${expense?.category || ''} ${expense?.description || ''} ${expense?.vendor || ''}`.toLowerCase()
  return [
    'rent',
    'utilities',
    'electric',
    'power',
    'water',
    'factory',
    'maintenance',
    'repair',
    'salary',
    'wage',
    'payroll',
    'supervisor',
    'admin',
    'insurance',
    'depreciation',
    'transport',
    'freight',
    'packing',
    'consumable',
  ].some((keyword) => text.includes(keyword))
}

function classifyOverheadBucket(expense: any) {
  const text = `${expense?.category || ''} ${expense?.description || ''} ${expense?.vendor || ''}`.toLowerCase()
  if (['rent', 'utilities', 'electric', 'power', 'water', 'factory', 'maintenance', 'repair', 'insurance', 'depreciation'].some((keyword) => text.includes(keyword))) {
    return 'Factory overhead'
  }
  if (['salary', 'wage', 'payroll', 'supervisor', 'operator', 'production', 'line', 'shift'].some((keyword) => text.includes(keyword))) {
    return 'Production labor'
  }
  if (['transport', 'freight', 'packing', 'consumable', 'admin', 'office', 'stationery', 'marketing', 'selling'].some((keyword) => text.includes(keyword))) {
    return 'Selling and admin'
  }
  return 'Other overhead'
}

export async function getOperationsSummary(opts: { from?: string; to?: string } = {}) {
  const fromDate = opts.from ? new Date(opts.from) : null
  const toDate = opts.to ? new Date(opts.to) : null

  const invoiceDateWhere: any = {}
  const expenseDateWhere: any = {}
  const productionDateWhere: any = {}
  const purchaseDateWhere: any = {}

  if (fromDate) {
    invoiceDateWhere.gte = fromDate
    expenseDateWhere.gte = fromDate
    productionDateWhere.gte = fromDate
    purchaseDateWhere.gte = fromDate
  }
  if (toDate) {
    invoiceDateWhere.lte = toDate
    expenseDateWhere.lte = toDate
    productionDateWhere.lte = toDate
    purchaseDateWhere.lte = toDate
  }

  const [materials, finishedGoods, suppliers, customers, invoices, expenses, productionOrders, purchaseTotal] = await Promise.all([
    prisma.rawMaterial.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, reorderLevel: true },
    }),
    prisma.finishedGoodProduct.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, reorderLevel: true },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, customerName: true },
    }),
    prisma.salesInvoice.findMany({
      include: { customer: true },
      where: Object.keys(invoiceDateWhere).length > 0 ? { invoiceDate: invoiceDateWhere } : undefined,
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        ...(Object.keys(expenseDateWhere).length > 0 ? { expenseDate: expenseDateWhere } : {}),
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.productionOrder.findMany({
      include: {
        bom: { include: { items: { include: { rawMaterial: true } } } },
        finishedGood: true,
      },
      where: Object.keys(productionDateWhere).length > 0 ? { createdAt: productionDateWhere } : undefined,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchase.aggregate({
      where: Object.keys(purchaseDateWhere).length > 0 ? { createdAt: purchaseDateWhere } : undefined,
      _sum: { totalAmount: true },
    }),
  ])

  const rawMaterialStockRows = materials.length
    ? await prisma.stockTransaction.groupBy({
        by: ['rawMaterialId'],
        where: { rawMaterialId: { in: materials.map((item) => item.id) } },
        _sum: { change: true },
      })
    : []
  const finishedGoodStockRows = finishedGoods.length
    ? await prisma.finishedGoodStockTransaction.groupBy({
        by: ['productId'],
        where: { productId: { in: finishedGoods.map((item) => item.id) } },
        _sum: { change: true },
      })
    : []

  const rawStockMap = new Map(rawMaterialStockRows.map((row) => [row.rawMaterialId, Number(row._sum.change || 0)]))
  const fgStockMap = new Map(finishedGoodStockRows.map((row) => [row.productId, Number(row._sum.change || 0)]))

  const normalizedMaterials = materials.map((item) => ({
    ...item,
    currentStock: rawStockMap.get(item.id) || 0,
  }))
  const normalizedFinishedGoods = finishedGoods.map((item) => ({
    ...item,
    currentStock: fgStockMap.get(item.id) || 0,
  }))

  const lowStockMaterials = normalizedMaterials.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel))
  const lowStockFinishedGoods = normalizedFinishedGoods.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel))

  const salesTotal = invoices.reduce((sum, invoice) => sum + money(invoice.grandTotal), 0)
  const paidInvoiceTotal = invoices.reduce((sum, invoice) => sum + money(invoice.paidAmount), 0)
  const dueTotal = invoices.reduce((sum, invoice) => sum + money(invoice.dueAmount), 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + money(expense.amount), 0)
  const overheadExpenseTotal = expenses.filter(classifyOverheadExpense).reduce((sum, expense) => sum + money(expense.amount), 0)
  const nonManufacturingExpenseTotal = expenseTotal - overheadExpenseTotal
  const overheadAllocations = expenses
    .filter(classifyOverheadExpense)
    .reduce<Record<string, number>>((allocations, expense) => {
      const bucket = classifyOverheadBucket(expense)
      allocations[bucket] = (allocations[bucket] || 0) + money(expense.amount)
      return allocations
    }, {})
  const purchaseValue = money(purchaseTotal._sum.totalAmount)
  const productionMaterialCost = productionOrders.reduce((sum, order) => sum + costFromBomItems(order), 0)
  const workInProgressCost = productionOrders
    .filter((order) => String(order.status || '').toUpperCase() !== 'COMPLETED')
    .reduce((sum, order) => sum + costFromBomItems(order), 0)
  const absorbedOverhead = overheadExpenseTotal
  const manufacturingMargin = salesTotal - productionMaterialCost - absorbedOverhead
  const estimatedProfit = paidInvoiceTotal - purchaseValue - expenseTotal
  const totalProductionBase = productionOrders.reduce((sum, order) => sum + productionCostBase(order), 0)
  const overheadRate = totalProductionBase > 0 ? absorbedOverhead / totalProductionBase : 0
  const productionOrderAllocations = productionOrders.map((order) => {
    const baseCost = productionCostBase(order)
    const overhead = baseCost * overheadRate
    const fullyAbsorbedCost = baseCost + overhead
    return {
      id: order.id,
      orderNumber: order.orderNumber || order.id,
      finishedGoodName: order.finishedGoodName || order.finishedGood?.name || '-',
      status: order.status,
      quantityPlanned: toNumber(order.quantityPlanned),
      baseCost,
      allocatedOverhead: overhead,
      fullyAbsorbedCost,
    }
  })

  return {
    counts: {
      materials: normalizedMaterials.length,
      finishedGoods: normalizedFinishedGoods.length,
      suppliers: suppliers.length,
      customers: customers.length,
      openInvoices: invoices.filter((invoice) => Number(invoice.dueAmount ?? 0) > 0).length,
      lowStockMaterials: lowStockMaterials.length,
      lowStockFinishedGoods: lowStockFinishedGoods.length,
    },
    money: {
      salesTotal,
      paidInvoiceTotal,
      dueTotal,
      purchaseValue,
      expenseTotal,
      overheadExpenseTotal,
      nonManufacturingExpenseTotal,
      overheadAllocationCount: Object.keys(overheadAllocations).length,
      productionMaterialCost,
      workInProgressCost,
      absorbedOverhead,
      grossMargin: manufacturingMargin,
      manufacturingMargin,
      overheadRate,
      estimatedProfit,
    },
    recent: {
      invoices: invoices.slice(0, 8),
      purchases: await Promise.all(
        normalizedMaterials.slice(0, 10).map(async (material) => {
          try {
            const rows = await listMaterialPurchases(material.id, { page: 1, pageSize: 2 })
            return Array.isArray(rows) ? rows : []
          } catch {
            return []
          }
        }),
      ).then((rows) => rows.flat().slice(0, 8)),
      productionOrders: productionOrders.slice(0, 8),
    },
    lists: {
      lowStockMaterials,
      lowStockFinishedGoods,
      materials: normalizedMaterials,
      finishedGoods: normalizedFinishedGoods,
      suppliers,
      customers,
      expenses: expenses.slice(0, 8),
      overheadAllocations: Object.entries(overheadAllocations)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      productionOrderAllocations: productionOrderAllocations.slice(0, 8),
    },
  }
}
