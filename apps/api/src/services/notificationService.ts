import { prisma } from "../prisma";

const LOOKBACK_DAYS = 30;
const MAX_NOTIFICATIONS = 20;

export interface AnomalyNotificationItem {
  id: string;
  submissionId: number;
  indicatorId: number;
  indicatorName: string;
  projectId: number;
  projectName: string;
  anomalyReason: string | null;
  anomalyStatus: string | null;
  value: string;
  reportedAt: Date;
}

export interface OverdueNotificationItem {
  id: string;
  indicatorId: number;
  indicatorName: string;
  projectId: number;
  projectName: string;
  lastReportedAt: Date | null;
  expectedFrequency: string;
  daysOverdue: number;
}

// Fetches recent anomaly notifications
export const getAnomalyNotifications = async (organizationId: number): Promise<{
  notifications: AnomalyNotificationItem[];
  totalUnread: number;
}> => {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const anomalousSubmissions = await prisma.submission.findMany({
    where: {
      isAnomaly: true,
      deletedAt: null,
      reportedAt: { gte: since },
      indicator: { project: { organizationId } },
    } as any,
    orderBy: { reportedAt: "desc" },
    take: MAX_NOTIFICATIONS,
    include: {
      indicator: {
        include: {
          project: true,
        },
      },
    } as any,
  });

  const notifications: AnomalyNotificationItem[] = anomalousSubmissions.map(
    (sub: any) => ({
      id: String(sub.id),
      submissionId: sub.id,
      indicatorId: sub.indicator.id,
      indicatorName: sub.indicator.name,
      projectId: sub.indicator.project.id,
      projectName: sub.indicator.project.name,
      anomalyReason: sub.anomalyReason ?? null,
      anomalyStatus: sub.anomalyStatus ?? null,
      value: sub.value,
      reportedAt: sub.reportedAt,
    }),
  );

  const totalUnread = await prisma.submission.count({
    where: {
      isAnomaly: true,
      anomalyStatus: "DETECTED",
      deletedAt: null,
      reportedAt: { gte: since },
      indicator: { project: { organizationId } },
    } as any,
  });

  return { notifications, totalUnread };
};

// Fetches overdue reporting notifications
export const getOverdueNotifications = async (organizationId: number): Promise<OverdueNotificationItem[]> => {
  const indicators = await prisma.indicator.findMany({
    where: { project: { organizationId } },
    include: {
      project: true,
      submissions: {
        where: { deletedAt: null },
        orderBy: { reportedAt: 'desc' },
        take: 1
      }
    } as any
  });

  const now = new Date();
  const overdue: OverdueNotificationItem[] = [];

  for (const indicator of indicators as any[]) {
    // Only process if reminders are actually enabled for this indicator
    if (!indicator.reminderEnabled) continue;

    const freq = (indicator.validationConfig as any)?.reportingFrequency || 'WEEKLY';
    const lastSub = (indicator.submissions as any[])[0];
    const refDate = lastSub ? lastSub.reportedAt : (indicator.project as any)?.startDate;

    if (!refDate) continue;

    let expectedDays = 7;
    if (freq === 'DAILY') expectedDays = 1;
    else if (freq === 'MONTHLY') expectedDays = 30;
    else if (freq === 'QUARTERLY') expectedDays = 90;
    else if (freq === 'YEARLY') expectedDays = 365;

    const diffMs = now.getTime() - refDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // threshold is expected frequency days + grace period from settings
    const gracePeriod = indicator.reminderDaysAfterDue ?? 2;
    const alertThreshold = expectedDays + gracePeriod;

    if (diffDays > alertThreshold) {
      overdue.push({
        id: `overdue-${indicator.id}`,
        indicatorId: indicator.id,
        indicatorName: indicator.name,
        projectId: indicator.project.id,
        projectName: indicator.project.name,
        lastReportedAt: lastSub ? lastSub.reportedAt : null,
        expectedFrequency: freq,
        daysOverdue: diffDays
      });
    }
  }

  return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, MAX_NOTIFICATIONS);
};

// Marks anomaly notifications as read
export const markAllAnomaliesRead = async (userId: number, organizationId: number): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  await prisma.submission.updateMany({
    where: {
      isAnomaly: true,
      anomalyStatus: "DETECTED",
      deletedAt: null,
      reportedAt: { gte: since },
      indicator: { project: { organizationId } },
    } as any,
    data: {
      anomalyStatus: "ACKNOWLEDGED",
      anomalyReviewedBy: userId,
      anomalyReviewedAt: new Date(),
    } as any,
  });
};
