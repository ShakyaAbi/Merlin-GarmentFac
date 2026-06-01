import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function seedInventory() {
  await prisma.supplier.createMany({ data: [
    { id: 'sup_acme', name: 'ACME Textiles', email: 'acme@example.com' },
    { id: 'sup_global', name: 'Global Fabrics', email: 'global@example.com' }
  ], skipDuplicates: true })

  await prisma.rawMaterial.createMany({ data: [
    { id: 'mat_cloth', name: 'Plain Cloth', defaultUnit: 'meter', sku: 'CLOTH-001' },
    { id: 'mat_button', name: 'Buttons', defaultUnit: 'piece', sku: 'BTN-001' }
  ], skipDuplicates: true })
}

if (require.main === module) {
  seedInventory().then(() => { console.log('inventory seed complete'); process.exit(0) })
}
