import { IndicatorDataType } from "@prisma/client";
import { BadRequestError } from "../utils/errors";
import {
  CategoryConfig,
  CategoryDefinition,
  formatCategoricalValue,
  validateCategoricalValue,
} from "./categoricalService";

type SubmissionPayload = {
  value: unknown;
  categoryValue?: string | null;
};

type NormalizeArgs = {
  dataType: IndicatorDataType;
  payload: SubmissionPayload;
  min?: number | null;
  max?: number | null;
  categories?: CategoryDefinition[] | null;
  categoryConfig?: CategoryConfig | null;
};

const normalizeScalarValue = (
  dataType: IndicatorDataType,
  value: unknown,
  min?: number | null,
  max?: number | null,
): string => {
  switch (dataType) {
    case "NUMBER": {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new BadRequestError("INVALID_VALUE", "Value must be numeric");
      }
      return num.toString();
    }
    case "PERCENT": {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new BadRequestError("INVALID_VALUE", "Value must be numeric");
      }
      const lower = min ?? 0;
      const upper = max ?? 100;
      if (num < lower || num > upper) {
        throw new BadRequestError(
          "VALUE_OUT_OF_RANGE",
          `Percent must be between ${lower} and ${upper}`,
        );
      }
      return num.toString();
    }
    case "BOOLEAN": {
      if (typeof value === "boolean") return value.toString();
      if (
        typeof value === "string" &&
        ["true", "false"].includes(value.toLowerCase())
      ) {
        return value.toLowerCase();
      }
      throw new BadRequestError("INVALID_VALUE", "Value must be boolean");
    }
    case "TEXT": {
      if (value === undefined || value === null) {
        throw new BadRequestError("INVALID_VALUE", "Value cannot be empty");
      }
      return String(value);
    }
    case "CATEGORICAL": {
      if (value === undefined || value === null) {
        throw new BadRequestError(
          "INVALID_VALUE",
          "Category selection cannot be empty",
        );
      }
      return String(value);
    }
    default:
      throw new BadRequestError("INVALID_VALUE", "Unsupported data type");
  }
};

// Normalizes a submission payload by indicator type
export const normalizeSubmissionByIndicator = ({
  dataType,
  payload,
  min,
  max,
  categories,
  categoryConfig,
}: NormalizeArgs): { normalizedValue: string; normalizedCategoryValue: string | null } => {
  const config = categoryConfig || { required: false };

  if (dataType === "CATEGORICAL") {
    if (!categories || categories.length === 0) {
      throw new BadRequestError(
        "NO_CATEGORIES",
        "Indicator has no categories defined",
      );
    }

    // Identify which input contains the category selection. 
    // New clients send 'categoryValue'. Old clients/imports might send category ID in 'value'.
    const rawCategoryInput = payload.categoryValue ?? payload.value ?? "";
    const selectedIds = validateCategoricalValue(
      String(rawCategoryInput),
      categories,
      config,
    );
    const canonicalCategoryValue =
      selectedIds.length > 0 ? formatCategoricalValue(selectedIds) : null;

    // Determine the normalized 'value' (Headcount/Amount).
    // If 'categoryValue' was explicitly provided, then 'value' is definitely the headcount.
    // If 'categoryValue' was missing but matches a category ID, then 'value' was the category, 
    // and we should store the canonical ID in both columns for compatibility.
    let normalizedValue = String(payload.value ?? "");
    if (!payload.categoryValue && canonicalCategoryValue) {
      normalizedValue = canonicalCategoryValue;
    }

    return {
      normalizedValue,
      normalizedCategoryValue: canonicalCategoryValue,
    };
  }

  let normalizedCategoryValue: string | null = null;
  if (categories && categories.length > 0) {
    const rawCategoryValue = payload.categoryValue;
    const shouldValidate =
      config.required === true ||
      (rawCategoryValue !== null && rawCategoryValue !== undefined);

    if (shouldValidate) {
      const selectedIds = validateCategoricalValue(
        String(rawCategoryValue ?? ""),
        categories,
        config,
      );
      normalizedCategoryValue =
        selectedIds.length > 0 ? formatCategoricalValue(selectedIds) : null;
    }
  }

  return {
    normalizedValue: normalizeScalarValue(dataType, payload.value, min, max),
    normalizedCategoryValue,
  };
};
