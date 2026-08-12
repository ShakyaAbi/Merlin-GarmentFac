import { prisma } from "../prisma";

// Finds an organization by ID
export const findById = (id: number) =>
  prisma.organization.findUnique({ where: { id } });

// Finds an organization by name
export const findByName = (name: string) =>
  prisma.organization.findFirst({ where: { name } });

// Lists all organizations
export const findAll = () =>
  prisma.organization.findMany({ orderBy: { name: 'asc' } });

// Creates a new organization
export const create = (data: { name: string }) =>
  prisma.organization.create({ data });

// Updates an organization by ID
export const updateById = (id: number, data: {
  name?: string
  taxpayerNumber?: string | null
  registrationNumber?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  province?: string | null
  postalCode?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  invoiceFooter?: string | null
  resetSalesInvoiceSequenceEachFiscalYear?: boolean
}) =>
  prisma.organization.update({ where: { id }, data });

// Deletes an organization by ID
export const deleteById = (id: number) =>
  prisma.organization.delete({ where: { id } });

// Gets all users in an organization
export const getUsers = (organizationId: number) =>
  prisma.user.findMany({ where: { organizationId } });

// Gets all projects for an organization
export const getProjects = (organizationId: number) =>
  prisma.project.findMany({ where: { organizationId } });
