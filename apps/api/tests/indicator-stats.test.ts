import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { Role, IndicatorDataType } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

describe("Indicator Statistics", () => {
  let authToken: string;
  let userId: number;
  let projectId: number;
  let nodeId: number;
  let indicatorId: number;

  beforeAll(async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: {
        email: "stats-test@test.com",
        passwordHash,
        role: Role.ADMIN,
        name: "Stats Tester",
        organization: { create: { name: "Stats Test Org" } },
      },
    });
    userId = user.id;

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "stats-test@test.com", password: "password123" });
    authToken = loginRes.body.token;

    const project = await prisma.project.create({
      data: { name: "Stats Test Project", status: "ACTIVE", organization: { connect: { id: user.organizationId } } },
    });
    projectId = project.id;

    const node = await prisma.logframeNode.create({
      data: {
        projectId,
        type: "OUTPUT",
        title: "Test Output",
        sortOrder: 0,
      },
    });
    nodeId = node.id;
  });

  afterAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: "stats-test@test.com" } });
    await prisma.$disconnect();
  });

  describe("GET /indicators/:id/stats", () => {
    beforeEach(async () => {
      const indicator = await prisma.indicator.create({
        data: {
           projectId,
           logframeNodeId: nodeId,
           name: "Stats Indicator",
           unit: "units",
           dataType: IndicatorDataType.NUMBER,
           baselineValue: 50,
           targetValue: 100,
           createdByUserId: userId,
         },
      });
      indicatorId = indicator.id;

      // Create submissions with varying values
      const values = [55, 60, 65, 70, 75, 80, 85];
      for (let i = 0; i < values.length; i++) {
        await prisma.submission.create({
          data: {
            indicatorId,
            reportedAt: new Date(2025, 0, i + 1),
            value: String(values[i]),
            createdByUserId: userId,
          },
        });
      }

      // Create one anomaly
      await prisma.submission.create({
        data: {
          indicatorId,
          reportedAt: new Date(2025, 0, 8),
          value: "200",
          createdByUserId: userId,
          isAnomaly: true,
          anomalyReason: "Outlier detected",
        },
      });
    });

    afterEach(async () => {
      await prisma.submission.deleteMany({ where: { indicatorId } });
      await prisma.indicator.delete({ where: { id: indicatorId } });
    });

    test("should return comprehensive statistics", async () => {
      const res = await request(app)
        .get(`/api/v1/indicators/${indicatorId}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.submissionCount).toBe(8);
      expect(res.body.stats.anomalyCount).toBe(1);
      expect(res.body.stats.anomalyRate).toBeCloseTo(12.5, 1);
      expect(res.body.stats.currentValue).toBe(200);
      expect(res.body.stats.average).toBeDefined();
      expect(res.body.stats.min).toBe(55);
      expect(res.body.stats.max).toBe(200);
      expect(res.body.stats.trend).toBeDefined();
      expect(res.body.stats.progressToTarget).toBeDefined();
      expect(res.body.stats.progressFromBaseline).toBeDefined();
    });

    test("should calculate progress to target correctly", async () => {
      const res = await request(app)
        .get(`/api/v1/indicators/${indicatorId}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      // Current value is 200, target is 100
      expect(res.body.stats.progressToTarget).toBeCloseTo(200, 0);
    });

    test("should calculate progress from baseline correctly", async () => {
      const res = await request(app)
        .get(`/api/v1/indicators/${indicatorId}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      // Current value is 200, baseline is 50
      expect(res.body.stats.progressFromBaseline).toBe(150);
    });

    test("should detect increasing trend", async () => {
      const res = await request(app)
        .get(`/api/v1/indicators/${indicatorId}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.body.stats.trend).toBe("increasing");
    });
  });

  describe("Trend Detection", () => {
    test("should detect decreasing trend", async () => {
      const indicator = await prisma.indicator.create({
          data: {
            projectId,
            logframeNodeId: nodeId,
            name: "Decreasing Trend Indicator",
            unit: "units",
            dataType: IndicatorDataType.NUMBER,
            targetValue: 100,
            createdByUserId: userId,
          },
      });

      const values = [100, 90, 80, 70, 60, 50];
      for (let i = 0; i < values.length; i++) {
        await prisma.submission.create({
          data: {
            indicatorId: indicator.id,
            reportedAt: new Date(2025, 0, i + 1),
            value: String(values[i]),
            createdByUserId: userId,
          },
        });
      }

      const res = await request(app)
        .get(`/api/v1/indicators/${indicator.id}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.trend).toBe("decreasing");

      await prisma.submission.deleteMany({
        where: { indicatorId: indicator.id },
      });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });

    test("should detect stable trend", async () => {
      const indicator = await prisma.indicator.create({
          data: {
            projectId,
            logframeNodeId: nodeId,
            name: "Stable Trend Indicator",
            unit: "units",
            dataType: IndicatorDataType.NUMBER,
            targetValue: 100,
            createdByUserId: userId,
          },
      });

      const values = [50, 52, 48, 51, 49, 50, 49];
      for (let i = 0; i < values.length; i++) {
        await prisma.submission.create({
          data: {
            indicatorId: indicator.id,
            reportedAt: new Date(2025, 0, i + 1),
            value: String(values[i]),
            createdByUserId: userId,
          },
        });
      }

      const res = await request(app)
        .get(`/api/v1/indicators/${indicator.id}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.trend).toBe("stable");

      await prisma.submission.deleteMany({
        where: { indicatorId: indicator.id },
      });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });
  });

  describe("Empty Indicator Stats", () => {
    test("should return null stats for indicator with no submissions", async () => {
      const indicator = await prisma.indicator.create({
          data: {
            projectId,
            logframeNodeId: nodeId,
            name: "Empty Indicator",
            unit: "units",
            dataType: IndicatorDataType.NUMBER,
            createdByUserId: userId,
          },
      });

      const res = await request(app)
        .get(`/api/v1/indicators/${indicator.id}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeNull();

      await prisma.indicator.delete({ where: { id: indicator.id } });
    });
  });
});
