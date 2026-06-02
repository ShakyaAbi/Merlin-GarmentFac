import { PrismaClient, ImportJob, ImportStatus, Prisma } from "@prisma/client";

export class ImportJobRepository {
  constructor(private prisma: PrismaClient) {}

  // Creates a new import job record
  async create(data: Prisma.ImportJobCreateInput): Promise<ImportJob> {
    return this.prisma.importJob.create({ data });
  }

  // Finds an import job by its ID
  async findById(jobId: number): Promise<ImportJob | null> {
    return this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: {
        indicator: true,
        template: true,
        user: { select: { id: true, email: true, name: true } },
        stagingRows: {
          orderBy: { rowNumber: "asc" },
        },
      },
    });
  }

  // Finds all import jobs for an indicator
  async findByIndicatorId(indicatorId: number): Promise<ImportJob[]> {
    return this.prisma.importJob.findMany({
      where: { indicatorId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Finds all import jobs created by a user
  async findByUserId(userId: number): Promise<ImportJob[]> {
    return this.prisma.importJob.findMany({
      where: { userId },
      include: {
        indicator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Updates the status of an import job
  async updateStatus(jobId: number, status: ImportStatus): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: { status },
    });
  }

  // Updates the processing progress counters
  async updateProgress(
    jobId: number,
    processed: number,
    successful: number,
    failed: number,
    warnings: number,
  ): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        processedRows: processed,
        successfulRows: successful,
        failedRows: failed,
        warningRows: warnings,
      },
    });
  }

  // Marks the import job as completed
  async markComplete(jobId: number): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  // Marks the import job as failed
  async markFailed(jobId: number): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
  }

  // Deletes an import job by ID
  async delete(jobId: number): Promise<void> {
    await this.prisma.importJob.delete({ where: { id: jobId } });
  }

  // Gets statistics for an import job
  async getJobStatistics(jobId: number) {
    const job = await this.findById(jobId);
    if (!job) return null;

    const stagingStats = await this.prisma.importJobRow.groupBy({
      by: ["validationStatus"],
      where: { jobId },
      _count: true,
    });

    return {
      ...job,
      stagingStats,
    };
  }
}
