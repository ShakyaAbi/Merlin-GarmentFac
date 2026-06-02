import {
  PrismaClient,
  Indicator,
  ImportJob,
  ImportTemplate,
  RowStatus,
} from "@prisma/client";
import Papa from "papaparse";
import { format, parse, isValid } from "date-fns";
import { ImportJobRepository } from "../repositories/importJobRepository";
import {
  CategoryConfig,
  CategoryDefinition,
  validateDisaggregationKey,
} from "./categoricalService";
import { normalizeSubmissionByIndicator } from "./submissionNormalization";
import { createSubmission } from "./submissionService";

interface ParsedRow {
  rowNumber: number;
  rawData: any;
  normalizedData?: any;
  errors: ValidationError[];
  warnings: ValidationError[];
  valid: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

// Service for importing CSV data as submissions
export class ImportService {
  private jobRepo: ImportJobRepository;

  constructor(private prisma: PrismaClient) {
    this.jobRepo = new ImportJobRepository(prisma);
  }

  // Parses CSV and creates staging rows
  async parseAndStage(
    jobId: number,
    fileBuffer: Buffer,
    template: ImportTemplate,
  ): Promise<void> {
    const fileContent = fileBuffer.toString("utf-8");

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          try {
            // Security: Prevent memory exhaustion from huge files
            const MAX_ROWS = 100000;
            if (results.data.length > MAX_ROWS) {
              await this.jobRepo.markFailed(jobId);
              return reject(
                new Error(
                  `CSV exceeds maximum row count (${MAX_ROWS.toLocaleString()} rows). ` +
                    `File has ${results.data.length.toLocaleString()} rows.`,
                ),
              );
            }

            // Update job with total rows
            await this.prisma.importJob.update({
              where: { id: jobId },
              data: {
                totalRows: results.data.length,
                status: "VALIDATING",
              },
            });

            // Create staging rows in batches
            const BATCH_SIZE = 500;
            for (let i = 0; i < results.data.length; i += BATCH_SIZE) {
              const batch = results.data.slice(i, i + BATCH_SIZE);

              await this.prisma.$transaction(async (tx) => {
                for (let j = 0; j < batch.length; j++) {
                  const row = batch[j];
                  await tx.importJobRow.create({
                    data: {
                      jobId,
                      rowNumber: i + j + 2, // +2 for header row and 1-based indexing
                      rawData: row,
                      validationStatus: "PENDING",
                    },
                  });
                }
              });
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: (error: any) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  }

  // Validates staging rows against indicator rules
  async validateStagingRows(
    jobId: number,
    indicator: Indicator,
  ): Promise<{ valid: number; warnings: number; errors: number }> {
    const job: any = await this.jobRepo.findById(jobId);
    if (!job || !job.stagingRows) throw new Error("Import job not found");

    const validationRules = (indicator.validationConfig as any) || {};
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    // Process in batches
    const BATCH_SIZE = 100;
    const totalRows = job.stagingRows.length;

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = job.stagingRows.slice(i, i + BATCH_SIZE);

      for (const stagingRow of batch) {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        // Transform raw data using template mappings
        const normalized = this.transformRow(
          stagingRow.rawData,
          job.template?.columnMapping as any,
        );

        // Validate against indicator rules
        const validationResult = this.validateAgainstIndicator(
          normalized,
          validationRules,
          indicator,
        );

        errors.push(...validationResult.errors);
        warnings.push(...validationResult.warnings);

        // Check uniqueness constraint for CREATE_ONLY mode
        if (job.importMode === "CREATE_ONLY" && normalized.reportedAt) {
          const exists = await this.checkDuplicate(
            indicator.id,
            normalized.reportedAt,
            normalized.disaggregationKey,
          );
          if (exists) {
            errors.push({
              field: "reportedAt",
              message: `Duplicate: data for ${normalized.reportedAt} already exists`,
              severity: "error",
              suggestion: "Use UPSERT mode or choose a different date",
            });
          }
        }

        // Determine final status
        const status: RowStatus =
          errors.length > 0
            ? "ERROR"
            : warnings.length > 0
              ? "WARNING"
              : "VALID";

        // Update staging row
        await this.prisma.importJobRow.update({
          where: { id: stagingRow.id },
          data: {
            normalizedData: normalized,
            validationStatus: status,
            errors: errors.length > 0 ? (errors as any) : null,
            warnings: warnings.length > 0 ? (warnings as any) : null,
          },
        });

        if (status === "VALID") validCount++;
        else if (status === "WARNING") warningCount++;
        else errorCount++;
      }

      // Update progress
      await this.jobRepo.updateProgress(
        jobId,
        i + batch.length,
        validCount,
        errorCount,
        warningCount,
      );
    }

    // Update final job status
    await this.jobRepo.updateStatus(jobId, "VALIDATED");

    return { valid: validCount, warnings: warningCount, errors: errorCount };
  }

  // Commits validated rows to the database

  async commitToDatabase(jobId: number, selectedRowNumbers?: number[]): Promise<void> {
    const job: any = await this.jobRepo.findById(jobId);
    if (!job) throw new Error("Import job not found");

    if (!job.indicatorId)
      throw new Error("Indicator ID required for submission import");

    await this.jobRepo.updateStatus(jobId, "IMPORTING");

    // Get only valid rows, filter by selectedRowNumbers if provided
    const where: any = {
      jobId,
      validationStatus: { in: ["VALID", "WARNING"] },
    };
    if (selectedRowNumbers && Array.isArray(selectedRowNumbers) && selectedRowNumbers.length > 0) {
      where.rowNumber = { in: selectedRowNumbers };
    }
    const validRows = await this.prisma.importJobRow.findMany({
      where,
      orderBy: { rowNumber: "asc" },
    });

    // Resolve organization id from indicator -> project
    const indicatorRecord = job.indicator as any;
    let organizationId: number | null = null;
    if (indicatorRecord && indicatorRecord.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: indicatorRecord.projectId },
        select: { organizationId: true },
      });
      organizationId = project?.organizationId ?? null;
    }

    if (!organizationId) {
      throw new Error("Unable to determine organization for indicator");
    }

    // Process rows sequentially so anomaly detection (which may call ML) can
    // evaluate using recently-created submissions. Sort by reportedAt so
    // historical rows are inserted before newer rows (important for scoring).
    const BATCH_SIZE = 500;
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const warnings = job.warningRows || 0;

    // Sort valid rows chronologically by reportedAt; fall back to rowNumber
    // if reportedAt is missing or unparsable.
    const sortedRows = [...validRows].sort((a, b) => {
      const aNormalized = a.normalizedData as any;
      const bNormalized = b.normalizedData as any;
      const aVal = aNormalized?.reportedAt;
      const bVal = bNormalized?.reportedAt;
      const aDate = aVal ? new Date(aVal) : new Date(0);
      const bDate = bVal ? new Date(bVal) : new Date(0);
      return aDate.getTime() - bDate.getTime();
    });

    for (let i = 0; i < sortedRows.length; i += BATCH_SIZE) {
      const batch = sortedRows.slice(i, i + BATCH_SIZE);

      for (const stagingRow of batch) {
        const data = stagingRow.normalizedData as any;

        try {
          const payload = {
            reportedAt: data.reportedAt,
            value: String(data.value),
            categoryValue: data.categoryValue,
            disaggregationKey: data.disaggregationKey || null,
            evidence: data.evidence,
            sourceImportJobId: jobId,
          };

          // Use submissionService.createSubmission so anomaly detection runs
          await createSubmission(job.indicatorId!, organizationId, payload, job.userId);

          successful++;

          await this.prisma.importJobRow.update({
            where: { id: stagingRow.id },
            data: { validationStatus: "IMPORTED" },
          });
        } catch (error: any) {
          failed++;
          const errObj = {
            field: "import",
            message: error?.message ?? "Import failed",
            severity: "error",
          } as any;
          await this.prisma.importJobRow.update({
            where: { id: stagingRow.id },
            data: {
              validationStatus: "ERROR",
              errors: [errObj],
            },
          });
          console.error("Import row failed:", error?.message ?? error);
        } finally {
          processed++;
        }
      }

      // Update progress after each batch
      await this.jobRepo.updateProgress(jobId, processed, successful, failed, warnings);
    }

    await this.jobRepo.markComplete(jobId);
  }

  // Rolls back import by deleting created submissions
  async rollbackImport(jobId: number): Promise<number> {
    const result = await this.prisma.submission.deleteMany({
      where: { sourceImportJobId: jobId },
    });

    await this.jobRepo.updateStatus(jobId, "CANCELLED");

    return result.count;
  }

  /**
   * Transform CSV row using template mappings
   */
  private transformRow(rawRow: any, mapping: any): any {
    if (!mapping || !mapping.columns) return rawRow;

    const normalized: any = {};

    for (const colDef of mapping.columns) {
      const csvValue = rawRow[colDef.csvHeader];
      const transform = colDef.transform || {};

      if (csvValue === undefined || csvValue === null || csvValue === "") {
        normalized[colDef.fieldName] = colDef.defaultValue || null;
        continue;
      }

      let value = csvValue;

      // Apply transformations
      if (transform.trim) {
        value = String(value).trim();
      }

      if (colDef.dataType === "date") {
        const dateFormat = transform.dateFormat || "yyyy-MM-dd";
        const parsed = parse(value, dateFormat, new Date());
        normalized[colDef.fieldName] = isValid(parsed)
          ? format(parsed, "yyyy-MM-dd")
          : value;
      } else if (colDef.dataType === "number") {
        if (transform.removeCommas) {
          value = value.replace(/,/g, "");
        }
        normalized[colDef.fieldName] = parseFloat(value);
      } else if (colDef.dataType === "category") {
        const categoryMap = transform.categoryMapping || {};
        const trimmed = String(value).trim();
        const isCaseSensitive = transform.caseSensitive === true;
        const lookupKey = isCaseSensitive ? trimmed : trimmed.toLowerCase();
        const mapped =
          categoryMap[trimmed] ??
          (!isCaseSensitive ? categoryMap[lookupKey] : undefined);
        normalized[colDef.fieldName] = mapped ?? trimmed;
      } else {
        const trimmed = String(value).trim();
        const allowedValues = Array.isArray(transform.allowedValues)
          ? transform.allowedValues.map((v: any) => String(v).trim())
          : [];

        if (allowedValues.length > 0) {
          const matched = allowedValues.find(
            (v: string) => v.toLowerCase() === trimmed.toLowerCase(),
          );
          normalized[colDef.fieldName] = matched ?? trimmed;
        } else {
          normalized[colDef.fieldName] = trimmed;
        }
      }
    }

    return normalized;
  }

  /**
   * Validate normalized data against indicator's rules
   */
  private validateAgainstIndicator(
    data: any,
    rules: any,
    indicator: Indicator,
  ): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields
    if (!data.reportedAt) {
      errors.push({
        field: "reportedAt",
        message: "Reporting date is required",
        severity: "error",
      });
    }

    if (indicator.dataType === "CATEGORICAL") {
      const hasCategoricalValue =
        data.value !== undefined &&
        data.value !== null &&
        String(data.value).trim().length > 0;
      const hasCategoryMirror =
        data.categoryValue !== undefined &&
        data.categoryValue !== null &&
        String(data.categoryValue).trim().length > 0;
      if (!hasCategoricalValue && !hasCategoryMirror) {
        errors.push({
          field: "value",
          message: "Value is required",
          severity: "error",
        });
      }
    } else if (data.value === undefined || data.value === null) {
      errors.push({
        field: "value",
        message: "Value is required",
        severity: "error",
      });
    }

    // Date validation
    if (data.reportedAt) {
      const date = new Date(data.reportedAt);
      if (!isValid(date)) {
        errors.push({
          field: "reportedAt",
          message: "Invalid date format",
          severity: "error",
          suggestion: "Use format: YYYY-MM-DD",
        });
      }
    }

    // Numeric validation
    if (
      indicator.dataType === "NUMBER" ||
      indicator.dataType === "PERCENT"
    ) {
      const numValue = parseFloat(data.value);

      if (isNaN(numValue)) {
        errors.push({
          field: "value",
          message: "Value must be a number",
          severity: "error",
        });
      } else {
        if (indicator.minValue !== null && numValue < indicator.minValue) {
          warnings.push({
            field: "value",
            message: `Value ${numValue} is below minimum ${indicator.minValue}`,
            severity: "warning",
          });
        }
        if (indicator.maxValue !== null && numValue > indicator.maxValue) {
          warnings.push({
            field: "value",
            message: `Value ${numValue} exceeds maximum ${indicator.maxValue}`,
            severity: "warning",
          });
        }
      }
    }

    if (indicator.dataType === "CATEGORICAL") {
      try {
        const categoryConfig = ((indicator.categoryConfig as any) ||
          null) as CategoryConfig | null;
        validateDisaggregationKey(data.disaggregationKey, categoryConfig);
      } catch (err: any) {
        errors.push({
          field: "disaggregationKey",
          message:
            err?.message || "Invalid disaggregation value for this indicator",
          severity: "error",
        });
      }

      try {
        const normalized = normalizeSubmissionByIndicator({
          dataType: indicator.dataType,
          payload: {
            value: data.value,
            categoryValue: data.categoryValue,
          },
          min: indicator.minValue,
          max: indicator.maxValue,
          categories: ((indicator.categories as any) || null) as
            | CategoryDefinition[]
            | null,
          categoryConfig: ((indicator.categoryConfig as any) || null) as
            | CategoryConfig
            | null,
        });
        data.value = normalized.normalizedValue;
        data.categoryValue = normalized.normalizedCategoryValue;
      } catch (err: any) {
        errors.push({
          field: "value",
          message: err?.message || "Invalid category selection",
          severity: "error",
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Check for duplicate submission
   */
  private async checkDuplicate(
    indicatorId: number,
    reportedAt: string,
    disaggregationKey?: string | null,
  ): Promise<boolean> {
    // Use null for missing disaggregationKey so the lookup matches how
    // submissions are stored (null vs empty string). This prevents false
    // negatives when detecting duplicates for rows without disaggregation.
    // Use findFirst with a where clause (matches repository usage) so we can
    // compare against null for missing disaggregationKey. This mirrors
    // submissionRepository.findUniqueSubmission which also compares against
    // null. We cast to any for the where clause to avoid TypeScript's strict
    // generated type for the compound unique input.
    const existing = await this.prisma.submission.findFirst({
      where: {
        indicatorId,
        reportedAt: new Date(reportedAt),
        disaggregationKey: disaggregationKey ?? null,
      } as any,
    });
    return existing !== null;
  }
}
