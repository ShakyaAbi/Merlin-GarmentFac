import React from "react";
import {
  Table as TableIcon,
  Trash2,
  RotateCcw,
  Download,
  UploadCloud,
  ArrowUpDown,
  History,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  FileText,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Indicator, IndicatorValue, IndicatorType } from "../../types";
import { Button } from "../ui/Button";
import {
  formatDate,
  formatCategoricalDisplay,
  formatCategoryValue,
  inferAnomalyReason,
} from "../../services/indicatorUtils";
import { formatNepaliDateTime } from "../../utils/nepaliDate";

interface SubmissionHistoryTableProps {
  indicator: Indicator;
  tableValues: IndicatorValue[];
  pagedValues: IndicatorValue[];
  showDeleted: boolean;
  setShowDeleted: (show: boolean) => void;
  selectedRows: Set<string>;
  toggleRowSelected: (rowId: string, checked: boolean) => void;
  toggleSelectAll: (checked: boolean, rows: IndicatorValue[]) => void;
  handleBatchDelete: () => Promise<void>;
  handleBatchRestore: () => Promise<void>;
  handleDownloadCsvTemplate: () => Promise<void>;
  setShowImportWizard: (show: boolean) => void;
  setShowExportDialog: (show: boolean) => void;
  handleSort: (field: "date" | "value") => void;
  sortField: "date" | "value";
  sortOrder: "asc" | "desc";
  editingRows: Record<
    string,
    {
      reportedAt: string;
      value: string;
      categoryValue: string;
      disaggregationKey?: string;
      evidence: string;
    }
  >;
  setEditingRows: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  startRowEdit: (row: IndicatorValue) => void;
  cancelRowEdit: (rowId: string) => void;
  saveRowEdit: (rowId: string) => Promise<void>;
  deleteRow: (rowId: string) => Promise<void>;
  restoreRow: (rowId: string) => Promise<void>;
  canModifyRow: (row: IndicatorValue) => boolean;
  filterDisaggregation: string | null;
  setFilterDisaggregation: (key: string | null) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  safeCurrentPage: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  totalRows: number;
  pageNumbers: number[];
}

export const SubmissionHistoryTable: React.FC<SubmissionHistoryTableProps> = ({
  indicator,
  tableValues,
  pagedValues,
  showDeleted,
  setShowDeleted,
  selectedRows,
  toggleRowSelected,
  toggleSelectAll,
  handleBatchDelete,
  handleBatchRestore,
  handleDownloadCsvTemplate,
  setShowImportWizard,
  setShowExportDialog,
  handleSort,
  sortField,
  sortOrder,
  editingRows,
  setEditingRows,
  startRowEdit,
  cancelRowEdit,
  saveRowEdit,
  deleteRow,
  restoreRow,
  canModifyRow,
  filterDisaggregation,
  setFilterDisaggregation,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  safeCurrentPage,
  totalPages,
  showingFrom,
  showingTo,
  totalRows,
  pageNumbers,
}) => {
  const dims = indicator.categoryConfig?.disaggregationDimensions || [];
  const primaryDim =
    dims.find((d) => d.required) || (dims.length > 0 ? dims[0] : null);
  const dimensionLabel = primaryDim?.label || "Disaggregation";
  const baseColCount = indicator.type === IndicatorType.CATEGORICAL ? 9 : 8;
  const totalColCount = baseColCount + (showDeleted ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <TableIcon className="w-5 h-5 text-slate-400" />
          Data History
        </h3>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-slate-200 bg-white text-slate-600">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show Deleted
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchDelete}
            disabled={selectedRows.size === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchRestore}
            disabled={selectedRows.size === 0}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Restore Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsvTemplate}
          >
            <Download className="w-4 h-4 mr-2" /> CSV Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportWizard(true)}
          >
            <UploadCloud className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      pagedValues.length > 0 &&
                      pagedValues.every((row) => selectedRows.has(row.id))
                    }
                    onChange={(e) =>
                      toggleSelectAll(e.target.checked, pagedValues)
                    }
                  />
                </th>
                <th
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Reporting Date
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "date" ? "text-blue-600" : "text-slate-400"}`}
                    />
                  </div>
                </th>
                {indicator.type === IndicatorType.CATEGORICAL ? (
                  <>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Value</th>
                  </>
                ) : (
                  <th className="px-6 py-3">Value</th>
                )}
                <th className="px-6 py-3">Disaggregation</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Anomaly Reason</th>
                <th className="px-6 py-3">Verification</th>
                {showDeleted && <th className="px-6 py-3">Deleted</th>}
                <th className="px-6 py-3 sticky right-0 bg-slate-50 z-10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableValues.length === 0 ? (
                <tr>
                  <td colSpan={indicator.type === IndicatorType.CATEGORICAL ? 9 : 8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <History className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm italic">
                        {filterDisaggregation
                          ? `No individual data points found for "${filterDisaggregation}"`
                          : "No data entries recorded yet."}
                      </p>
                      {filterDisaggregation && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setFilterDisaggregation(null)}
                        >
                          Clear filter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedValues.map((row) => {
                  const edit = editingRows[row.id];
                  const editable = canModifyRow(row);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 transition-colors ${row.isAnomaly ? "bg-red-50/30" : ""} ${row.deletedAt ? "bg-gray-100 text-gray-400" : ""}`}
                    >
                      {/* Deleted metadata moved to dedicated column when `showDeleted` is true */}
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={(e) =>
                            toggleRowSelected(row.id, e.target.checked)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {edit ? (
                          <input
                            type="date"
                            value={edit.reportedAt}
                            onChange={(e) =>
                              setEditingRows((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  reportedAt: e.target.value,
                                },
                              }))
                            }
                            className="px-2 py-1 border border-slate-300 rounded"
                          />
                        ) : (
                          formatDate(row.date)
                        )}
                      </td>
                      {indicator.type === IndicatorType.CATEGORICAL ? (
                        <>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {edit ? (
                              <select
                                value={edit.categoryValue}
                                onChange={(e) =>
                                  setEditingRows((prev: any) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      categoryValue: e.target.value,
                                    },
                                  }))
                                }
                                className="px-2 py-1 border border-slate-300 rounded text-sm w-full font-sans max-w-[120px]"
                              >
                                <option value="">Select Category</option>
                                {indicator.categories?.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              formatCategoryValue(
                                row.categoryValue || String(row.value),
                                indicator.categories,
                              )
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-700">
                            {edit ? (
                              <input
                                type="text"
                                value={edit.value}
                                onChange={(e) =>
                                  setEditingRows((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      value: e.target.value,
                                    },
                                  }))
                                }
                                className="px-2 py-1 border border-slate-300 rounded w-28"
                              />
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span>{row.categoryValue ? row.value : "-"}</span>
                                {row.categoryValue && (
                                  <span className="text-[10px] text-slate-400 font-sans uppercase tracking-[0.05em]">
                                    {indicator.unit}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 font-mono text-slate-700">
                          {edit ? (
                            <input
                              type="text"
                              value={edit.value}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.id]: {
                                    ...prev[row.id],
                                    value: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border border-slate-300 rounded w-28"
                            />
                          ) : (
                            <>
                              {formatCategoricalDisplay(
                                row.value,
                                row.categoryValue,
                                indicator.type,
                                indicator.categories,
                              )}
                              <span className="text-xs text-slate-400 ml-1 font-sans">
                                {indicator.unit}
                              </span>
                            </>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {edit ? (
                          <input
                            type="text"
                            value={edit.disaggregationKey || ""}
                            placeholder="Disaggregation key"
                            onChange={(e) =>
                              setEditingRows((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  disaggregationKey: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                        ) : row.disaggregationKey ? (() => {
                          const key = row.disaggregationKey;
                          // Composite key: dim1:val1|dim2:val2
                          if (key.includes("|")) {
                            const parts = key.split("|").map((part) => {
                              const colonIdx = part.indexOf(":");
                              if (colonIdx === -1) return { label: "", value: part };
                              const dimKey = part.substring(0, colonIdx).trim();
                              const dimValue = part.substring(colonIdx + 1).trim();
                              // Try to find the dimension label from config
                              const matchingDim = dims.find(
                                (d) => d.key === dimKey || d.label === dimKey,
                              );
                              return {
                                label: matchingDim?.label || dimKey,
                                value: dimValue,
                              };
                            });
                            return (
                              <div className="flex flex-col gap-1">
                                {parts.map((p, i) => (
                                  <div key={i} className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.02em]">
                                      {p.label}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full w-fit">
                                      {p.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          // Simple key: single dimension
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.02em]">
                                {dimensionLabel}
                              </span>
                              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                                {key}
                              </span>
                            </div>
                          );
                        })() : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.isAnomaly ? (
                          <div
                            className="flex items-center gap-2 text-red-600"
                            title={inferAnomalyReason(
                              row.value,
                              indicator,
                              row.anomalyReason,
                              row.isAnomaly,
                              row.anomalyScore,
                              row.anomalyThreshold,
                            )}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              Anomaly
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              Verified
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.isAnomaly ? (
                          <span
                            className="text-xs text-red-600 block max-w-[260px] whitespace-normal break-words"
                            title={inferAnomalyReason(
                              row.value,
                              indicator,
                              row.anomalyReason,
                              row.isAnomaly,
                              row.anomalyScore,
                              row.anomalyThreshold,
                            )}
                          >
                            {inferAnomalyReason(
                              row.value,
                              indicator,
                              row.anomalyReason,
                              row.isAnomaly,
                              row.anomalyScore,
                              row.anomalyThreshold,
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {edit ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={edit.evidence}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.id]: {
                                    ...prev[row.id],
                                    evidence: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border border-slate-300 rounded w-48"
                            />
                            <div className="flex items-center gap-2 md:hidden">
                              <button
                                className="text-xs px-2 py-1 border rounded text-green-700 border-green-200 bg-green-50"
                                onClick={() => saveRowEdit(row.id)}
                              >
                                Save
                              </button>
                              <button
                                className="text-xs px-2 py-1 border rounded text-slate-700 border-slate-200"
                                onClick={() => cancelRowEdit(row.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : row.evidence ? (
                          row.evidence.startsWith("http") ? (
                            <a
                              href={row.evidence}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit transition-colors"
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span className="text-xs font-medium">
                                View Verification
                              </span>
                            </a>
                          ) : row.evidence.startsWith("[Attached]") ? (
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">
                              <FileText className="w-3 h-3" />
                              <span className="text-xs truncate max-w-[150px]">
                                {row.evidence.replace("[Attached] ", "")}
                              </span>
                            </div>
                          ) : (
                            <span
                              className="text-xs text-slate-600 italic block max-w-[200px] truncate"
                              title={row.evidence}
                            >
                              {row.evidence}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      {showDeleted && (
                        <td className="px-6 py-4">
                          {row.deletedAt ? (
                            <span
                              className="text-xs text-gray-500 italic max-w-[220px] truncate block"
                              title={`Deleted on ${formatNepaliDateTime(row.deletedAt)}${row.deletedByUserId ? ` by User ${row.deletedByUserId}` : ""}`}>
                              Deleted on {formatNepaliDateTime(row.deletedAt)}
                              {row.deletedByUserId ? ` by User ${row.deletedByUserId}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 sticky right-0 bg-white z-10 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)]">
                        <div className="flex items-center gap-2">
                          {edit ? (
                            <>
                              <button
                                className="text-xs px-2 py-1 border rounded text-green-700 border-green-200 bg-green-50"
                                onClick={() => saveRowEdit(row.id)}
                              >
                                Save
                              </button>
                              <button
                                className="text-xs px-2 py-1 border rounded text-slate-700 border-slate-200"
                                onClick={() => cancelRowEdit(row.id)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {!row.deletedAt && (
                                <button
                                  className="text-xs px-2 py-1 border rounded text-blue-700 border-blue-200 disabled:opacity-40"
                                  disabled={!editable}
                                  onClick={() => startRowEdit(row)}
                                  title={
                                    editable
                                      ? "Edit"
                                      : "You cannot edit this submission"
                                  }
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {!row.deletedAt ? (
                                <button
                                  className="text-xs px-2 py-1 border rounded text-red-700 border-red-200 disabled:opacity-40"
                                  disabled={!editable}
                                  onClick={() => deleteRow(row.id)}
                                  title={
                                    editable
                                      ? "Delete"
                                      : "You cannot delete this submission"
                                  }
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  className="text-xs px-2 py-1 border rounded text-amber-700 border-amber-200"
                                  onClick={() => restoreRow(row.id)}
                                  title="Restore"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                Showing <span className="font-semibold">{showingFrom}</span>
                {" - "}
                <span className="font-semibold">{showingTo}</span> of{" "}
                <span className="font-semibold">{totalRows}</span> entries
              </span>
              <span>
                Selected:{" "}
                <span className="font-semibold">{selectedRows.size}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-600">Rows</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white disabled:opacity-40"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
              >
                <ChevronLeft className="w-3 h-3" />
                Prev
              </button>
              {safeCurrentPage > 3 && (
                <>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    onClick={() => setCurrentPage(1)}
                  >
                    1
                  </button>
                  <span className="px-1 text-xs text-slate-400">...</span>
                </>
              )}
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`px-2 py-1 text-xs border rounded ${
                    page === safeCurrentPage
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white"
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              {safeCurrentPage < totalPages - 2 && (
                <>
                  <span className="px-1 text-xs text-slate-400">...</span>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white disabled:opacity-40"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safeCurrentPage >= totalPages}
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
