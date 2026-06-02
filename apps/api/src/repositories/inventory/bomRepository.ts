import { prisma } from '../../prisma'

export const listBomsForMaterial = async (rawMaterialId: string) => {
  return prisma.bOMItem.findMany({
    where: { rawMaterialId },
    include: { bom: true }
  })
}

export const createBom = async (data: any) => {
  return prisma.billOfMaterials.create({ data })
}
