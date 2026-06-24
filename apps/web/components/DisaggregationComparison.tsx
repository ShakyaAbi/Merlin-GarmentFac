import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { CategoryDefinition } from "../types";
import { BarChart3, AlertCircle } from "lucide-react";
import { formatNepaliDate } from "../utils/nepaliDate";

interface CategoryStat {
  categoryId: string;
  label: string;
  count: number;
  percentage: number;
}

interface DisaggregatedRow {
  disaggregationKey: string;
  disaggregationLabel: string;
  categoryDistribution: CategoryStat[];
  totalSubmissions: number;
  lastReportedAt: string | null;
}

interface DisaggregatedResponse {
  disaggregatedStats: DisaggregatedRow[];
  totalSubmissions: number;
}

interface DisaggregationComparisonProps {
  indicatorId: string;
  categories: CategoryDefinition[];
  dimensionLabel?: string;
  onSelectDisaggregation?: (key: string | null) => void;
  selectedKey?: string | null;
  refreshCounter?: number;
  rows?: DisaggregatedRow[];
  totalSubmissions?: number;
}

const formatDate = (value: string | null) => {
  if (!value) return "Never";
  return formatNepaliDate(value, "Never");
};

export const DisaggregationComparison: React.FC<
  DisaggregationComparisonProps
> = ({
  indicatorId,
  categories,
  dimensionLabel = "Entity",
  onSelectDisaggregation,
  selectedKey,
  refreshCounter,
  rows: controlledRows,
  totalSubmissions: controlledTotalSubmissions,
}) => {
  const [rows, setRows] = useState<DisaggregatedRow[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (controlledRows) {
      setRows(controlledRows);
      setTotalSubmissions(controlledTotalSubmissions ?? controlledRows.reduce((sum, row) => sum + row.totalSubmissions, 0));
      setLoading(false);
      setError(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<DisaggregatedResponse>(
          `/indicators/${indicatorId}/disaggregated-stats`,
        );
        setRows(result.disaggregatedStats || []);
        setTotalSubmissions(result.totalSubmissions || 0);
      } catch (err: any) {
        setError(err?.message || "Failed to load disaggregation comparison");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [indicatorId, refreshCounter, controlledRows, controlledTotalSubmissions]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        Loading disaggregation comparison...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6 text-sm text-red-600 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        No disaggregated submissions yet.
      </div>
    );
  }

  const averagePerEntity = totalSubmissions / Math.max(1, rows.length);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Disaggregation Value Comparison
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Click a row below to filter the data history by that{" "}
            {dimensionLabel.toLowerCase()}.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {rows.length} {dimensionLabel.toLowerCase()}
          {rows.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded border border-slate-200 p-3 bg-slate-50">
          <div className="text-xs text-slate-500">Total Submissions</div>
          <div className="text-xl font-bold text-slate-900">
            {totalSubmissions}
          </div>
        </div>
        <div className="rounded border border-slate-200 p-3 bg-slate-50">
          <div className="text-xs text-slate-500">
            Average per {dimensionLabel}
          </div>
          <div className="text-xl font-bold text-slate-900">
            {averagePerEntity.toFixed(1)}
          </div>
        </div>
        <div className="rounded border border-slate-200 p-3 bg-slate-50">
          <div className="text-xs text-slate-500">
            Most Active {dimensionLabel}
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            {rows[0]?.disaggregationLabel || "N/A"}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-y border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-slate-700">
                {dimensionLabel}
              </th>
              <th className="text-right px-3 py-2 font-semibold text-slate-700">
                Total
              </th>
              <th className="text-right px-3 py-2 font-semibold text-slate-700">
                vs Avg
              </th>
              {categories.map((cat) => (
                <th
                  key={cat.id}
                  className="text-right px-3 py-2 font-semibold text-slate-700"
                >
                  {cat.label}
                </th>
              ))}
              <th className="text-right px-3 py-2 font-semibold text-slate-700">
                Last Report
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const byCategory = new Map(
                row.categoryDistribution.map((item) => [item.categoryId, item]),
              );
              const delta = row.totalSubmissions - averagePerEntity;
              const isSelected = selectedKey === row.disaggregationKey;

              return (
                <tr
                  key={row.disaggregationKey}
                  onClick={() =>
                    onSelectDisaggregation?.(
                      isSelected ? null : row.disaggregationKey,
                    )
                  }
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 hover:bg-blue-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                      <span
                        className={isSelected ? "text-blue-700" : "text-slate-900"}
                      >
                        {row.disaggregationLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {row.totalSubmissions}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      delta > 0
                        ? "text-green-700"
                        : delta < 0
                          ? "text-red-700"
                          : "text-slate-600"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)}
                  </td>
                  {categories.map((cat) => {
                    const item = byCategory.get(cat.id);
                    const count = item?.count || 0;
                    const pct = item?.percentage || 0;
                    return (
                      <td key={cat.id} className="px-3 py-2 text-right">
                        <span className="text-slate-800">{count}</span>
                        <span className="text-slate-400 text-xs ml-1">
                          ({Math.round(pct)}%)
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right text-slate-600">
                    {formatDate(row.lastReportedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
