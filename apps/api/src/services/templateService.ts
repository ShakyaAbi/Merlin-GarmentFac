import { PrismaClient, Indicator } from "@prisma/client";
import { ImportTemplateRepository } from "../repositories/importTemplateRepository";

// Handles import template generation and validation
export class TemplateService {
  private importTemplateRepo: ImportTemplateRepository;
  constructor(private prisma: PrismaClient) {
    this.importTemplateRepo = new ImportTemplateRepository(prisma);
  }

  /**
   * Create default import template for an indicator
   */
  // Creates a default template for one indicator
  async createDefaultImportTemplate(indicatorId: number, userId: number) {
    const indicator = await this.prisma.indicator.findUnique({
      where: { id: indicatorId },
    });

    if (!indicator) throw new Error("Indicator not found");

    const columnMapping = this.generateDefaultImportMapping(indicator);

    return this.importTemplateRepo.create({
      name: "Default Import Template",
      description: "Auto-generated default template",
      isDefault: true,
      columnMapping,
      indicator: { connect: { id: indicatorId } },
      createdBy: { connect: { id: userId } },
    });
  }


  /**
   * Generate default import column mapping based on indicator type
   */
  // Builds the default column mapping for an indicator
  private generateDefaultImportMapping(indicator: Indicator): any {
    const columns = [];

    // Check for disaggregation dimensions
    const categoryConfig = indicator.categoryConfig as any;
    const hasDisaggregation =
      categoryConfig?.disaggregationDimensions?.length > 0;

    // Add disaggregation column if defined
    if (hasDisaggregation) {
      const dimension = categoryConfig.disaggregationDimensions[0]; // Use first dimension
      columns.push({
        csvHeader: dimension.label,
        fieldName: "disaggregationKey",
        dataType: "text",
        required: dimension.required,
        transform: {
          trim: true,
          allowedValues: dimension.values,
        },
      } as any);
    }

    // Add date column
    columns.push({
      csvHeader: "Date",
      fieldName: "reportedAt",
      dataType: "date",
      required: true,
      transform: {
        dateFormat: "yyyy-MM-dd",
        trim: true,
      },
    });

    // Add value column based on indicator type
    switch (indicator.dataType) {
      case "CATEGORICAL":
        if (indicator.categories) {
          const categories = indicator.categories as any;
          const categoryMapping: any = {};
          const categoryConfig = indicator.categoryConfig as any;
          const categoryRequired = categoryConfig?.required ?? true;

          categories.forEach((cat: any) => {
            categoryMapping[cat.label] = cat.id;
            categoryMapping[cat.label.toUpperCase()] = cat.id;
            categoryMapping[cat.label.toLowerCase()] = cat.id;
            categoryMapping[cat.id] = cat.id;
          });

          columns.push({
            csvHeader: "Value",
            fieldName: "value",
            dataType: "number",
            required: true,
            transform: {
              trim: true,
              removeCommas: true,
            },
          } as any);

          columns.push({
            csvHeader: "Category",
            fieldName: "categoryValue",
            dataType: "category",
            required: categoryRequired,
            transform: {
              categoryMapping,
              caseSensitive: false,
              allowCategoryLabels: true,
            },
          } as any);
        }
        break;

      case "BOOLEAN":
        columns.push({
          csvHeader: "Value",
          fieldName: "value",
          dataType: "boolean",
          required: true,
          transform: {
            trim: true,
            booleanValues: {
              true: ["true", "yes", "y", "1", "on"],
              false: ["false", "no", "n", "0", "off"],
            },
            caseSensitive: false,
          },
        } as any);
        break;

      case "TEXT":
        columns.push({
          csvHeader: "Value",
          fieldName: "value",
          dataType: "text",
          required: true,
          transform: {
            trim: true,
            maxLength: 1000,
          },
        } as any);
        break;

      case "NUMBER":
      case "PERCENT":
        columns.push({
          csvHeader: "Value",
          fieldName: "value",
          dataType: "number",
          required: true,
          transform: {
            trim: true,
            removeCommas: true,
          },
        } as any);
        break;

      default:
        columns.push({
          csvHeader: "Value",
          fieldName: "value",
          dataType: "text",
          required: true,
          transform: {
            trim: true,
          },
        } as any);
    }

    // Add evidence column
    columns.push({
      csvHeader: "Evidence",
      fieldName: "evidence",
      dataType: "text",
      required: false,
      transform: {
        trim: true,
        maxLength: 500,
      },
    } as any);

    return { columns };
  }


  /**
   * Validate template configuration
   */
  // Validates a template column mapping
  validateImportTemplate(columnMapping: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!columnMapping || !columnMapping.columns) {
      errors.push("Column mapping must contain columns array");
      return { valid: false, errors };
    }

    const requiredFields = ["reportedAt", "value"];
    const mappedFields = columnMapping.columns.map((col: any) => col.fieldName);

    for (const field of requiredFields) {
      if (!mappedFields.includes(field)) {
        errors.push(`Required field '${field}' is not mapped`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate sample CSV file based on template
   */
  // Generates a sample CSV for the template
  generateSampleCSV(indicator: Indicator, columnMapping: any): string {
    const columns = columnMapping.columns || [];
    const headers = columns.map((col: any) => col.csvHeader);

    // Create sample rows based on indicator type
    const sampleRows: string[][] = [];
    const categoryConfig = indicator.categoryConfig as any;
    const categories = indicator.categories as any;
    const hasDisaggregation =
      categoryConfig?.disaggregationDimensions?.length > 0;

    // Generate 3 sample rows
    for (let i = 0; i < 3; i++) {
      const row: string[] = [];

      for (const col of columns) {
        switch (col.fieldName) {
          case "disaggregationKey":
            if (hasDisaggregation) {
              const dimension = categoryConfig.disaggregationDimensions[0];
              const sampleValue = dimension.values[i % dimension.values.length];
              row.push(sampleValue || "District1");
            }
            break;

          case "reportedAt":
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            row.push(date.toISOString().split("T")[0]);
            break;

          case "value":
            if (
              indicator.dataType === "CATEGORICAL" &&
              categories?.length > 0
            ) {
              const baseValue = indicator.baselineValue || 0;
              row.push(String(baseValue + i * 10));
            } else if (indicator.dataType === "BOOLEAN") {
              row.push(i % 2 === 0 ? "true" : "false");
            } else if (
              indicator.dataType === "NUMBER" ||
              indicator.dataType === "PERCENT"
            ) {
              const baseValue = indicator.baselineValue || 0;
              row.push(String(baseValue + i * 10));
            } else {
              row.push(`Sample value ${i + 1}`);
            }
            break;
          case "categoryValue":
            if (
              indicator.dataType === "CATEGORICAL" &&
              categories?.length > 0
            ) {
              const category = categories[i % categories.length];
              row.push(category.label);
            }
            break;

          case "evidence":
            row.push(`Sample evidence ${i + 1}`);
            break;

          default:
            row.push("");
        }
      }

      sampleRows.push(row);
    }

    // Build CSV
    const csvLines = [
      headers.join(","),
      ...sampleRows.map((row) =>
        row
          .map((cell) => {
            // Escape cells with commas or quotes
            if (
              cell.includes(",") ||
              cell.includes('"') ||
              cell.includes("\n")
            ) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(","),
      ),
    ];

    return csvLines.join("\n");
  }
}
