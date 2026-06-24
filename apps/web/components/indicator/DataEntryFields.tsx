import React from "react";
import {
  Calendar,
  Check,
  FileBox,
  FileText,
  X,
  Link as LinkIcon,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import { Indicator, IndicatorType, CategoryDefinition } from "../../types";
import { Button } from "../ui/Button";
import { formatNepaliDate } from "../../utils/nepaliDate";

interface DataEntryFieldsProps {
  indicator: Indicator;
  entry: any;
  handleEntryChange: (id: string, field: string, value: string) => void;
  handleCategoryToggle: (id: string, catId: string, multiple: boolean) => void;
  handleFileSelect: (id: string, file: File) => void;
  handleRemoveFile: (id: string) => void;
  handleAutoFillPdf: (id: string, file: File) => void;
  handleSubmit: (id: string) => void;
  parsingPdfId: string | null;
  draggingId: string | null;
  handleDragOver: (e: React.DragEvent, id: string) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, id: string) => void;
}

export const DataEntryFields: React.FC<DataEntryFieldsProps> = ({
  indicator,
  entry,
  handleEntryChange,
  handleCategoryToggle,
  handleFileSelect,
  handleRemoveFile,
  handleAutoFillPdf,
  handleSubmit,
  parsingPdfId,
  draggingId,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}) => {
  const isNumericInputType = (type: IndicatorType) =>
    type === IndicatorType.NUMBER ||
    type === IndicatorType.PERCENTAGE ||
    type === IndicatorType.CURRENCY;

  const getInputType = (type: IndicatorType) => {
    return isNumericInputType(type) ? "number" : "text";
  };

  const today = new Date();

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Date */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Reporting Date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
            value={entry.date}
            onChange={(e) =>
              handleEntryChange(indicator.id, "date", e.target.value)
            }
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
                  label = `Wk of ${formatNepaliDate(target)}`;
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
                const isSelected = entry.date === dateStr;
                const isDone = indicator.values.some((v) =>
                  v.date.startsWith(dateStr),
                );

                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() =>
                      handleEntryChange(indicator.id, "date", dateStr)
                    }
                    title={isDone ? "Already reported" : "Pending report"}
                    className={`text-[10px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm scale-105 z-10"
                        : isDone
                          ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                          : "bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400"
                    }`}
                  >
                    {isDone && <Check className="w-2.5 h-2.5" />}
                    {label}
                    {!isDone && !isSelected && (
                      <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Value input */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            Value ({indicator.unit || "Count"})
          </label>

          <input
            type={getInputType(indicator.type)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
            value={entry.value}
            onChange={(e) =>
              handleEntryChange(indicator.id, "value", e.target.value)
            }
          />

          {entry.error && (
            <p className="text-xs text-red-600 mt-1">{entry.error}</p>
          )}
        </div>

        {/* Category Selection */}
        {indicator.categories && indicator.categories.length > 0 && (
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Category{" "}
              {indicator.categoryConfig?.required && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
              {indicator.categories.map((cat: CategoryDefinition) => {
                const isChecked = (entry.selectedCategories || []).includes(
                  cat.id,
                );
                const allowMultiple =
                  indicator.categoryConfig?.allowMultiple ?? false;

                return (
                  <label
                    key={cat.id}
                    className="flex items-center p-1.5 border border-slate-300 rounded cursor-pointer hover:bg-white transition-colors"
                    style={{
                      borderColor: isChecked ? cat.color : undefined,
                      backgroundColor: isChecked ? `${cat.color}15` : undefined,
                    }}
                  >
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      name={`category-${indicator.id}`}
                      checked={isChecked}
                      onChange={() =>
                        handleCategoryToggle(
                          indicator.id,
                          cat.id,
                          allowMultiple,
                        )
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

        {/* Verification Evidence (Drag & Drop) */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <LinkIcon className="w-3 h-3" /> Verification Source
            </label>
          </div>

          {entry.file ? (
            <div className="w-full px-3 py-2.5 border border-blue-200 bg-blue-50 rounded-lg flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="bg-blue-100 p-1 rounded text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm text-blue-900 truncate font-medium">
                  {entry.file.name}
                </span>
                <span className="text-xs text-blue-500 whitespace-nowrap">
                  ({(entry.file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                onClick={() => handleRemoveFile(indicator.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className={`relative group transition-all duration-200 rounded-lg border-2 ${
                draggingId === indicator.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 border-dashed bg-white hover:border-slate-400"
              }`}
              onDragOver={(e) => handleDragOver(e, indicator.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, indicator.id)}
            >
              <input
                type="text"
                placeholder={
                  draggingId === indicator.id
                    ? "Drop file now..."
                    : "Paste link, drag, or browse file"
                }
                className={`w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none pl-9 pr-28 rounded-lg z-10 relative ${
                  draggingId === indicator.id ? "pointer-events-none" : ""
                }`}
                value={entry.evidence}
                onChange={(e) =>
                  handleEntryChange(indicator.id, "evidence", e.target.value)
                }
              />

              <LinkIcon
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  draggingId === indicator.id ? "text-blue-500" : "text-slate-400"
                }`}
              />

              {!entry.evidence && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
                  <label
                    className="cursor-pointer px-2 py-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors text-xs font-semibold"
                    title="Browse Computer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Browse
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileSelect(indicator.id, e.target.files[0])
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="md:col-span-2">
          <Button
            className={`w-full h-[42px] justify-center transition-all duration-300 ${
              entry.status === "saved" ? "bg-green-600 hover:bg-green-700" : ""
            }`}
            disabled={
              !entry.value ||
              (indicator.categoryConfig?.required === true &&
                indicator.categories &&
                indicator.categories.length > 0 &&
                (entry.selectedCategories || []).length === 0) ||
              entry.status === "saving" ||
              entry.status === "saved"
            }
            onClick={() => handleSubmit(indicator.id)}
          >
            {entry.status === "saving" ? (
              "Saving..."
            ) : entry.status === "saved" ? (
              <>
                <Check className="w-4 h-4 mr-1.5" /> Saved
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>

      {/* Info / Hints */}
      {(indicator.minExpected !== undefined ||
        indicator.maxExpected !== undefined) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <AlertCircle className="w-3 h-3" />
          <span>
            Expected Range: {indicator.minExpected ?? 0} -{" "}
            {indicator.maxExpected ?? "∞"}
          </span>
        </div>
      )}
    </div>
  );
};
