import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type BomItemRow = {
  id: string
  bomId: string
  garmentStyle: string
  consumption: number
  unit: string
  yield: number | null
}

type BomSummaryRow = {
  id: string
  name: string
  garmentStyle: string
  createdBy: number | null
  createdAt: Date
  itemCount: number
}

// Lists BOM items for a raw material
export const listBomsForMaterial = async (rawMaterialId: string) => {
  return prisma.$queryRaw<Array<BomItemRow>>(Prisma.sql`
    SELECT
      bi.id,
      bi."bomId",
      b."garmentStyle",
      bi.consumption,
      bi.unit,
      bi."yield"
    FROM "BOMItem" bi
    INNER JOIN "BillOfMaterials" b ON b.id = bi."bomId"
    WHERE bi."rawMaterialId" = ${rawMaterialId}
    ORDER BY b."createdAt" DESC, bi.id ASC
  `)
}

// Lists all BOMs
export const listBoms = async () => {
  return prisma.$queryRaw<Array<BomSummaryRow>>(Prisma.sql`
    SELECT
      b.id,
      b.name,
      b."garmentStyle",
      b."createdBy",
      b."createdAt",
      COUNT(bi.id)::int AS "itemCount"
    FROM "BillOfMaterials" b
    LEFT JOIN "BOMItem" bi ON bi."bomId" = b.id
    GROUP BY b.id
    ORDER BY b."createdAt" DESC
  `)
}

// Creates a BOM record and its line items
export const createBom = async (data: any) => {
  const { items = [], ...bomData } = data ?? {}

  return prisma.$transaction(async (tx) => {
    const created = await tx.$queryRaw<Array<{
      id: string
      name: string
      garmentStyle: string
      createdBy: number | null
      createdAt: Date
    }>>(Prisma.sql`
      INSERT INTO "BillOfMaterials" ("name", "garmentStyle", "createdBy")
      VALUES (${bomData.name}, ${bomData.garmentStyle}, ${bomData.createdBy ?? null})
      RETURNING id, name, "garmentStyle", "createdBy", "createdAt"
    `)

    const bom = created[0]
    for (const item of items) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "BOMItem" ("bomId", "rawMaterialId", consumption, unit, "yield")
        VALUES (${bom.id}, ${item.rawMaterialId}, ${Number(item.consumption)}, ${item.unit}, ${item.yield ?? null})
      `)
    }

    return bom
  })
}
