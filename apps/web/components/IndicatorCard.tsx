import React from "react";
import { Indicator, IndicatorType } from "../types";
import { Button } from "./ui/Button";
import { Link } from "react-router-dom";

interface IndicatorCardProps {
  indicator: Indicator;
  onEdit?: (indicator: Indicator) => void;
  canEdit?: boolean;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({
  indicator,
  onEdit,
  canEdit = false,
}) => {
  const isCategorical = indicator.type === IndicatorType.CATEGORICAL;

  const parseCategoryIds = (value?: string) =>
    String(value || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

  const getCategorySelection = (entry: { value: number | string; categoryValue?: string }) => {
    if (entry.categoryValue && String(entry.categoryValue).trim().length > 0) {
      return String(entry.categoryValue);
    }
    if (typeof entry.value === "string") {
      return entry.value;
    }
    return "";
  };

  const sortedValues = [...indicator.values].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const latestSubmission =
    sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : undefined;
  const latestValue = latestSubmission?.value ?? indicator.baseline;

  const categoryLabelById = new Map(
    (indicator.categories || []).map((cat) => [cat.id, cat.label]),
  );
  const getCategoryLabel = (id: string) => categoryLabelById.get(id) || id;

  const latestCategoryIds = latestSubmission
    ? parseCategoryIds(getCategorySelection(latestSubmission))
    : [];

  const categoryCounts = new Map<string, number>();
  sortedValues.forEach((entry) => {
    parseCategoryIds(getCategorySelection(entry)).forEach((id) => {
      categoryCounts.set(id, (categoryCounts.get(id) || 0) + 1);
    });
  });
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ id, label: getCategoryLabel(id), count }));
  const mostFrequent = topCategories[0];


  const currentValNum = Number(latestValue);
  const targetNum = Number(indicator.target);
  const hasNumericProgress =
    !isCategorical &&
    Number.isFinite(targetNum) &&
    targetNum > 0 &&
    Number.isFinite(currentValNum);
  const numericProgress = hasNumericProgress
    ? Math.min(Math.max((currentValNum / targetNum) * 100, 0), 100)
    : 0;

  const progress = hasNumericProgress ? numericProgress : 0;
  const hasProgress = hasNumericProgress;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Under Review":
        return "bg-amber-100 text-amber-800";
      case "Inactive":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatValue = (val: number | string) => {
    if (indicator.type === IndicatorType.PERCENTAGE) return `${val}%`;
    if (indicator.type === IndicatorType.CURRENCY) return `NPR ${val}`;
    return val;
  };

  const formatCategoryValue = (value?: string) => {
    if (!value || !indicator.categories) return "";
    const labels = value
      .split(",")
      .map((id) => id.trim())
      .map((id) => getCategoryLabel(id))
      .filter(Boolean);
    return labels.join(", ");
  };

  const targetDisplay = formatValue(indicator.target);

  const currentDisplay =
    isCategorical
      ? latestCategoryIds.length > 0
        ? latestCategoryIds.map((id) => getCategoryLabel(id)).join(", ")
        : "No submission yet"
      : formatValue(latestValue);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded">
          {indicator.type}
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(indicator.status)}`}
        >
          {indicator.status || "Active"}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2">{indicator.name}</h3>
      <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">
        {indicator.description || "No description provided."}
      </p>

      {isCategorical ? (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Latest
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {currentDisplay}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Most Frequent
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {mostFrequent
                  ? `${mostFrequent.label} (${mostFrequent.count})`
                  : "No data yet"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Top Categories
            </span>
            {topCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topCategories.map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700"
                  >
                    {item.label}: {item.count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No category data yet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Target
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{targetDisplay}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{currentDisplay}</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="font-medium text-slate-500">Progress</span>
          <span className="font-bold text-slate-900">
            {hasProgress
              ? `${Math.round(progress)}%`
              : isCategorical
                ? "No target"
                : "N/A"}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              hasProgress
                ? isCategorical
                  ? "bg-emerald-600"
                  : "bg-blue-600"
                : "bg-slate-300"
            }`}
            style={{ width: `${hasProgress ? progress : 0}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto">
        <Link to={`/indicators/${indicator.id}`} className="flex-1">
          <Button
            variant="secondary"
            size="sm"
            className="w-full bg-slate-100 hover:bg-slate-200 border-none text-slate-600"
          >
            View Details
          </Button>
        </Link>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="px-4 text-slate-500 hover:text-slate-700"
            onClick={() => onEdit?.(indicator)}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
};
