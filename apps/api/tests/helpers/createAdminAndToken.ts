import app from '../../src/app';
import request from 'supertest';
import { prisma } from '../../src/prisma';
import { hashPassword } from '../../src/utils/password';

export async function createAdminAndToken(
  email = 'admin@gmail.com',
  password = 'admin1234',
  name = 'Test Admin'
) {
  // Ensure dependent rows that might block user creation are removed in tests
  // (safe to ignore failures)
  try {
    await prisma.invitation.deleteMany();
  } catch (err) {
    // ignore
  }

  // Ensure an organization exists for the admin
  let organization = await prisma.organization.findFirst({ where: { name: 'Test Admin Org' } })
  if (!organization) {
    organization = await prisma.organization.create({ data: { name: 'Test Admin Org' } })
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
        organization: { connect: { id: organization.id } },
      },
    });
  } else if (!existing.organizationId) {
    await prisma.user.update({ where: { email }, data: { organization: { connect: { id: organization.id } } } });
  }

  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Unable to login test admin: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token, email, organizationId: organization.id };
}
