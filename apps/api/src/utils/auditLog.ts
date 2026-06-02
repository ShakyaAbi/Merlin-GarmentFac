import { prisma } from "../prisma";

// Actions that can be audit-logged
export type AuditAction =
  | "SUBMISSION_DELETE"
  | "SUBMISSION_RESTORE";

// Records an audit log entry in the database
export async function logAuditEvent(params: {
  action: AuditAction;
  userId: number;
  submissionId: number;
  indicatorId: number;
  organizationId: number;
  meta?: any;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      userId: params.userId,
      submissionId: params.submissionId,
      indicatorId: params.indicatorId,
      organizationId: params.organizationId,
      meta: params.meta || {},
      createdAt: new Date(),
    },
  });
}

// Generic audit recorder used by feature controllers. Keeps backward compatibility with
// simple recordAudit({ action, userId, before, after }) calls. Stores minimal fields
// in the AuditLog table and the rest in meta.
export async function recordAudit(entry: { action: string; userId?: number; before?: any; after?: any; meta?: any }) {
  await prisma.auditLog.create({
    data: {
      action: entry.action as any,
      userId: entry.userId || 0,
      submissionId: 0,
      indicatorId: 0,
      organizationId: 0,
      meta: { before: entry.before || null, after: entry.after || null, extra: entry.meta || {} },
      createdAt: new Date(),
    },
  })
}
