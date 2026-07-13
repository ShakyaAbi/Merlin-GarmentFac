import request from 'supertest';
import { Role } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/prisma';
import { hashPassword } from '../src/utils/password';

describe('Auth flows', () => {
  const adminEmail = 'admin@test.com';
  const password = 'Passw0rd!';

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const organization = await prisma.organization.findFirst({ where: { name: "Auth Test Org" } })
      ?? await prisma.organization.create({ data: { name: "Auth Test Org" } });
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        role: Role.ADMIN,
        organizationId: organization.id,
      },
      create: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        organizationId: organization.id,
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('logs in and returns access token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(adminEmail);
  });

  it('returns current user via /auth/me', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password });
    const token = login.body.token as string;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(adminEmail);
    expect(res.body.role).toBe(Role.ADMIN);
  });
});
