import {
  PrismaClient,
  Indicator,
  ExportTemplate,
  Submission,
} from "@prisma/client";
import { format } from "date-fns";
import { stringify } from "csv-stringify/sync";

interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  categories?: string[];
  includeAnomalies?: boolean;
  excludeAnomalies?: boolean;
}

// Service for exporting submission data to CSV
export class ExportService {
  constructor(private prisma: PrismaClient) {}

  // Generates CSV from submissions with sanitization
  async generateCSV(
    indicatorId: number,
    template: ExportTemplate | null,
    filters: ExportFilters,
  ): Promise<string> {
    const indicator = await this.prisma.indicator.findUnique({
      where: { id: indicatorId },
      include: { submissions: true },
    });

    if (!indicator) throw new Error("Indicator not found");

    // Build where clause
    const where: any = { indicatorId };

    if (filters.dateFrom || filters.dateTo) {
      where.reportedAt = {};
      if (filters.dateFrom) where.reportedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.reportedAt.lte = new Date(filters.dateTo);
    }

    if (filters.categories && filters.categories.length > 0) {
      where.categoryValue = { in: filters.categories };
    }

    if (
      filters.includeAnomalies !== undefined ||
      filters.excludeAnomalies !== undefined
    ) {
      if (filters.excludeAnomalies) {
        where.isAnomaly = false;
      } else if (filters.includeAnomalies) {
        where.isAnomaly = true;
      }
    }

    const submissions = await this.prisma.submission.findMany({
      where,
      orderBy: { reportedAt: "asc" },
      include: {
        createdByUser: { select: { name: true, email: true } },
      },
    });

    // Use template or default columns
    const columns = template?.columnConfig
      ? (template.columnConfig as any).columns
      : this.getDefaultColumns();

    // Build rows
    const rows = [];

    // Headers
    const headers = columns.map((col: any) => col.header);
    rows.push(headers);

    // Data rows
    for (const submission of submissions) {
      const row = columns.map((col: any) => {
        const value = this.formatCell(submission, col, indicator);
        return this.sanitizeCell(value);
      });
      rows.push(row);
    }

    // Convert to CSV using csv-stringify
    return stringify(rows, {
      quoted: true,
      quoted_empty: true,
    });
  }

  /**
   * Format cell value based on column configuration
   */
  private formatCell(
    submission: Submission & { createdByUser: any },
    col: any,
    indicator: Indicator,
  ): any {
    const field = col.field;

    switch (field) {
      case "reportedAt":
        const dateFormat = col.format || "yyyy-MM-dd";
        return format(new Date(submission.reportedAt), dateFormat);

      case "value":
        const numValue = parseFloat(submission.value);
        if (!isNaN(numValue) && col.format) {
          const decimals = parseInt(col.format) || 2;
          return numValue.toFixed(decimals);
        }
        return submission.value;

      case "categoryValue":
        if (!submission.categoryValue) return "";
        if (col.showLabel) {
          // Find category label
          const categories = (indicator.categories as any) || [];
          const category = categories.find(
            (c: any) => c.id === submission.categoryValue,
          );
          return category ? category.label : submission.categoryValue;
        }
        return submission.categoryValue;

      case "evidence":
        return submission.evidence || "";

      case "isAnomaly":
        if (col.format === "Yes/No") {
          return submission.isAnomaly ? "Yes" : "No";
        }
        return submission.isAnomaly ? "TRUE" : "FALSE";

      case "anomalyReason":
        return submission.anomalyReason || "";

      case "createdBy":
        return (
          submission.createdByUser?.name ||
          submission.createdByUser?.email ||
          ""
        );

      default:
        return "";
    }
  }

  /**
   * Sanitize cell to prevent CSV injection
   * Excel/LibreOffice can execute formulas starting with =, +, -, @, \t, \r
   */
  private sanitizeCell(value: any): string {
    if (value === null || value === undefined) return "";

    const str = String(value);

    // Dangerous characters that start formulas
    const dangerousStarts = ["=", "+", "-", "@", "\t", "\r"];

    if (dangerousStarts.some((char) => str.startsWith(char))) {
      // Prefix with single quote to treat as text
      return `'${str}`;
    }

    return str;
  }

  /**
   * Get default column configuration
   */
  private getDefaultColumns() {
    return [
      { field: "reportedAt", header: "Date", format: "yyyy-MM-dd" },
      { field: "value", header: "Value", format: "2" },
      { field: "categoryValue", header: "Category", showLabel: true },
      { field: "evidence", header: "Evidence" },
      { field: "isAnomaly", header: "Anomaly", format: "Yes/No" },
      { field: "anomalyReason", header: "Anomaly Reason" },
      { field: "createdBy", header: "Created By" },
    ];
  }

  // Generates preview of first 10 rows
  async generatePreview(
    indicatorId: number,
    template: ExportTemplate | null,
    filters: ExportFilters,
  ): Promise<string> {
    // Use same logic but limit to 10 rows
    const csv = await this.generateCSV(indicatorId, template, filters);
    const lines = csv.split("\n");
    return lines.slice(0, 11).join("\n"); // Header + 10 data rows
  }
}
