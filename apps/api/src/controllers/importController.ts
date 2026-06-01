import { Request, Response } from "express";
import { ImportService } from "../services/importService";
import { TemplateService } from "../services/templateService";
import { ImportTemplateRepository } from "../repositories/importTemplateRepository";
import { ImportJobRepository } from "../repositories/importJobRepository";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";

const importService = new ImportService(prisma);
const templateService = new TemplateService(prisma);
const importTemplateRepo = new ImportTemplateRepository(prisma);
const importJobRepo = new ImportJobRepository(prisma);

// Uploads CSV and creates an import job
export const uploadCSV = asyncHandler(async (req: Request, res: Response) => {
  const { indicatorId } = req.params;
  const { templateId, validateOnly } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const indicator = await prisma.indicator.findUnique({
    where: { id: parseInt(indicatorId) },
  });

  if (!indicator) {
    return res.status(404).json({ error: "Indicator not found" });
  }

  // Get or create default template
  let template;
  if (templateId) {
    template = await importTemplateRepo.findById(parseInt(templateId));
  } else {
    template = await importTemplateRepo.getDefaultTemplate(indicator.id);
    if (!template) {
      template = await templateService.createDefaultImportTemplate(
        indicator.id,
        (req as any).user.id,
      );
    }
  }

  // Create import job
  const job = await importJobRepo.create({
    importType: "SUBMISSION",
    fileName: file.originalname,
    fileSize: file.size,
    totalRows: 0,
    importMode: "CREATE_ONLY",
    indicator: { connect: { id: indicator.id } },
    template: template ? { connect: { id: template.id } } : undefined,
    user: { connect: { id: (req as any).user.id } },
  });

  // Parse and stage the CSV
  await importService.parseAndStage(job.id, file.buffer, template!);

  // Validate the staging rows
  const validationResult = await importService.validateStagingRows(
    job.id,
    indicator,
  );

  // Get preview data
  const updatedJob = await importJobRepo.findById(job.id);
  const preview = (updatedJob as any)?.stagingRows
    ?.slice(0, 10)
    .map((row: any) => ({
      rowNumber: row.rowNumber,
      data: row.normalizedData,
      valid:
        row.validationStatus === "VALID" || row.validationStatus === "WARNING",
      errors: row.errors || [],
      warnings: row.warnings || [],
    }));

  res.json({
    jobId: job.id,
    status: updatedJob?.status,
    fileName: file.originalname,
    fileSize: file.size,
    totalRows: updatedJob?.totalRows || 0,
    preview,
    validationSummary: {
      totalRows: updatedJob?.totalRows || 0,
      validRows: validationResult.valid,
      invalidRows: validationResult.errors,
      warnings: validationResult.warnings,
    },
  });
});

// Gets import job status and statistics
export const getImportJobStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const job = await importJobRepo.getJobStatistics(parseInt(jobId));

    if (!job) {
      return res.status(404).json({ error: "Import job not found" });
    }

    res.json(job);
  },
);

// Executes import by committing staged data
export const executeImport = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const { selectedRowNumbers } = req.body || {};

    const job = await importJobRepo.findById(parseInt(jobId));

    if (!job) {
      return res.status(404).json({ error: "Import job not found" });
    }

    if (job.status !== "VALIDATED") {
      return res
        .status(400)
        .json({ error: "Job must be validated before import" });
    }

    // Execute import in background, pass selectedRowNumbers
    importService.commitToDatabase(parseInt(jobId), selectedRowNumbers).catch((error) => {
      console.error("Import failed:", error);
      importJobRepo.markFailed(parseInt(jobId));
    });

    res.json({ message: "Import started", jobId: job.id });
  },
);

// Cancels and rolls back an import job
export const cancelImport = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const deletedCount = await importService.rollbackImport(parseInt(jobId));

    res.json({
      message: "Import cancelled",
      deletedSubmissions: deletedCount,
    });
  },
);

// Gets all import jobs for an indicator
export const getImportJobs = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;

    const jobs = await importJobRepo.findByIndicatorId(parseInt(indicatorId));

    res.json(jobs);
  },
);

// Downloads CSV with import error details
export const downloadErrorCSV = asyncHandler(
  async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const job = await importJobRepo.findById(parseInt(jobId));

    if (!job) {
      return res.status(404).json({ error: "Import job not found" });
    }

    // Get rows with errors
    const errorRows =
      (job as any).stagingRows?.filter(
        (row: any) => row.validationStatus === "ERROR",
      ) || [];

    // Build CSV with error information
    const csvRows = ["Row Number,Error Field,Error Message,Original Data"];

    for (const row of errorRows) {
      const errors = (row.errors as any) || [];
      for (const error of errors) {
        const originalData = JSON.stringify(row.rawData).replace(/"/g, '""');
        csvRows.push(
          `${row.rowNumber},"${error.field}","${error.message}","${originalData}"`,
        );
      }
    }

    const csv = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="import_errors_${jobId}.csv"`,
    );
    res.send(csv);
  },
);
