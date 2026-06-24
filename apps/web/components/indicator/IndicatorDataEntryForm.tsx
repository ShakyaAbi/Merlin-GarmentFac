import React from "react";
import {
  Save,
  CheckCircle,
  FileText,
  X,
  Link as LinkIcon,
  UploadCloud,
} from "lucide-react";
import { Indicator, IndicatorType, CategoryDefinition } from "../../types";
import { Button } from "../ui/Button";
import { isNumericInputType, formatCategoryValue } from "../../services/indicatorUtils";
import { formatNepaliDate } from "../../utils/nepaliDate";

interface IndicatorDataEntryFormProps {
  indicator: Indicator;
  entryDate: string;
  setEntryDate: (date: string) => void;
  entryValue: string;
  setEntryValue: (value: string) => void;
  evidence: string;
  setEvidence: (evidence: string) => void;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  selectedCategories: string[];
  handleCategoryToggle: (categoryId: string, allowMultiple: boolean) => void;
  selectedDisaggregationValues: Record<string, string>;
  setSelectedDisaggregationValues: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  handleSave: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  error: string | null;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

export const IndicatorDataEntryForm: React.FC<IndicatorDataEntryFormProps> = ({
  indicator,
  entryDate,
  setEntryDate,
  entryValue,
  setEntryValue,
  evidence,
  setEvidence,
  attachedFile,
  setAttachedFile,
  selectedCategories,
  handleCategoryToggle,
  selectedDisaggregationValues,
  setSelectedDisaggregationValues,
  handleSave,
  saving,
  error,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-lg shadow-slate-200/50 sticky top-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        {indicator.frequency} Data Entry
      </h3>
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reporting Date
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />

          {/* Scheduled Points suggestions */}
          {indicator.frequency && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                if (offset >= 4 && indicator.frequency !== "Daily") return null;

                const d = new Date();
                let label = "";
                let dateStr = "";

                if (indicator.frequency === "Daily") {
                  const target = new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate() - offset,
                  );
                  dateStr = target.toISOString().split("T")[0];
                  label =
                    offset === 0
                      ? "Today"
                      : offset === 1
                        ? "Yesterday"
                        : formatNepaliDate(target);
                } else if (indicator.frequency === "Weekly") {
                  const diff = d.getDate() - d.getDay() - offset * 7;
                  const target = new Date(d.getFullYear(), d.getMonth(), diff);
                  dateStr = target.toISOString().split("T")[0];
                  label = `Wk ${formatNepaliDate(target)}`;
                } else if (indicator.frequency === "Monthly") {
                  const target = new Date(
                    d.getFullYear(),
                    d.getMonth() - offset,
                    0,
                  );
                  dateStr = target.toISOString().split("T")[0];
                  label = formatNepaliDate(target);
                }

                if (!dateStr) return null;
                const isSelected = entryDate === dateStr;
                const isDone = indicator.values.some((v) =>
                  v.date.startsWith(dateStr),
                );

                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => setEntryDate(dateStr)}
                    title={isDone ? "Already reported" : "Pending report"}
                    className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white z-10"
                        : isDone
                          ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                          : "bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400"
                    }`}
                  >
                    {isDone && <CheckCircle className="w-2.5 h-2.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Value
          </label>
          <input
            type={isNumericInputType(indicator.type) ? "number" : "text"}
            step={isNumericInputType(indicator.type) ? "0.01" : undefined}
            placeholder={
              isNumericInputType(indicator.type) ? "e.g. 45" : "e.g. Completed"
            }
            value={entryValue}
            onChange={(e) => setEntryValue(e.target.value)}
            className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />
          {(indicator.type === IndicatorType.NUMBER ||
            indicator.type === IndicatorType.PERCENTAGE ||
            indicator.type === IndicatorType.CURRENCY) && (
            <p className="text-xs text-slate-400 mt-1">
              Expected range: {indicator.minExpected} - {indicator.maxExpected}
            </p>
          )}
        </div>

        {/* Category Selection */}
        {indicator.categories && indicator.categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category{" "}
              {indicator.categoryConfig?.required && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
              {indicator.categories.map((cat: CategoryDefinition) => {
                const isChecked = selectedCategories.includes(cat.id);
                const allowMultiple =
                  indicator.categoryConfig?.allowMultiple ?? false;

                return (
                  <label
                    key={cat.id}
                    className="flex items-center p-1.5 border border-slate-300 rounded cursor-pointer hover:bg-white transition-colors"
                    style={{
                      borderColor: isChecked ? cat.color : undefined,
                      backgroundColor: isChecked
                        ? `${cat.color}15`
                        : undefined,
                    }}
                  >
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      name="category-selection"
                      checked={isChecked}
                      onChange={() =>
                        handleCategoryToggle(cat.id, allowMultiple)
                      }
                      className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div className="ml-2 flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-medium text-slate-900">
                        {cat.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Disaggregation Selection */}
        {indicator.categoryConfig?.disaggregationDimensions &&
          indicator.categoryConfig.disaggregationDimensions.length > 0 && (
            <div>
              {(() => {
                const dims =
                  indicator.categoryConfig?.disaggregationDimensions || [];
                const primaryDim = dims.find((d) => d.required) || dims[0];
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">
                        Disaggregation
                      </label>
                      {primaryDim && (
                        <span className="text-[11px] text-slate-500">
                          Saved key: {primaryDim.label || "Primary"}
                        </span>
                      )}
                    </div>
                    {dims.map((dim) => {
                      const dimKey = dim.key || dim.label;
                      const selectedValue =
                        selectedDisaggregationValues[dimKey] || "";
                      return (
                        <div key={dimKey}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {dim.label || "Dimension"}{" "}
                            {dim.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <select
                            value={selectedValue}
                            onChange={(e) =>
                              setSelectedDisaggregationValues((prev) => ({
                                ...prev,
                                [dimKey]: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                          >
                            <option value="">
                              Select {dim.label || "value"}
                            </option>
                            {dim.values.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    {dims.length > 1 && (
                      <p className="text-xs text-slate-500">
                        All dimensions are saved together with each entry.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        {/* Evidence / File Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Verification
          </label>
          {attachedFile ? (
            <div className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-md flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-900 truncate">
                  {attachedFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-red-500 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={`relative transition-all duration-200 rounded-md border-2 ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 border-dashed bg-white hover:border-slate-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="text"
                placeholder={isDragging ? "Drop file..." : "Link, drag, or browse file"}
                className={`w-full px-3 py-2 bg-transparent text-sm focus:outline-none pl-9 pr-28 rounded-md z-10 relative ${isDragging ? "pointer-events-none" : ""}`}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
              <LinkIcon
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDragging ? "text-blue-500" : "text-slate-400"}`}
              />

              {!evidence && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
                  <label
                    className="cursor-pointer px-2 py-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors text-xs font-semibold"
                    title="Browse Computer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Browse
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && setAttachedFile(e.target.files[0])
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Entry
        </Button>
      </form>

      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6">
        <h4 className="font-semibold text-slate-900 text-sm mb-3">
          Indicator Details
        </h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Target</dt>
            <dd className="font-medium text-slate-900">
              {indicator.type === IndicatorType.CATEGORICAL ? (
                indicator.targetCategory ? (
                  formatCategoryValue(indicator.targetCategory, indicator.categories)
                ) : indicator.target === undefined ||
                  indicator.target === null ||
                  indicator.target === "" ? (
                  "No target set"
                ) : (
                  indicator.target
                )
              ) : (
                indicator.target
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Baseline</dt>
            <dd className="font-medium text-slate-900">
              {indicator.type === IndicatorType.CATEGORICAL &&
              indicator.baselineCategory
                ? formatCategoryValue(indicator.baselineCategory, indicator.categories)
                : indicator.baseline}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Frequency</dt>
            <dd className="font-medium text-slate-900">
              {indicator.frequency}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
