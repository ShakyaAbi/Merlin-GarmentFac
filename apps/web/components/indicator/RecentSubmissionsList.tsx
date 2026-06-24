import React from "react";
import { Check } from "lucide-react";
import { IndicatorValue, Indicator } from "../../types";
import { formatNepaliDate, formatNepaliDateTime } from "../../utils/nepaliDate";

interface RecentSubmissionsListProps {
  indicator: Indicator;
  submissions: IndicatorValue[];
  selectedSubmissionIds: Set<string>;
  toggleSelectedSubmission: (id: string, checked: boolean) => void;
  editingSubmissionRows: Record<string, any>;
  setEditingSubmissionRows: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  canModifySubmission: (row: IndicatorValue) => boolean;
  beginEditSubmission: (indicatorId: string, row: IndicatorValue) => void;
  cancelEditSubmission: (submissionId: string) => void;
  saveEditedSubmission: (submissionId: string) => void;
  softDeleteSubmission: (indicatorId: string, submissionId: string) => void;
  restoreSubmission: (indicatorId: string, submissionId: string) => void;
}

export const RecentSubmissionsList: React.FC<RecentSubmissionsListProps> = ({
  indicator,
  submissions,
  selectedSubmissionIds,
  toggleSelectedSubmission,
  editingSubmissionRows,
  setEditingSubmissionRows,
  canModifySubmission,
  beginEditSubmission,
  cancelEditSubmission,
  saveEditedSubmission,
  softDeleteSubmission,
  restoreSubmission,
}) => {
  if (submissions.length === 0) {
    return (
      <div className="mt-4 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Recent Submissions
        </h4>
        <p className="text-xs text-slate-400 italic">No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Recent Submissions
      </h4>
      <div className="space-y-2">
        {submissions.slice(0, 5).map((row) => {
          const edit = editingSubmissionRows[row.id];
          const editable = canModifySubmission(row);
          return (
            <div
              key={row.id}
              className={`grid grid-cols-12 gap-2 items-center text-xs p-2 rounded border ${
                row.deletedAt
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedSubmissionIds.has(row.id)}
                  onChange={(e) =>
                    toggleSelectedSubmission(row.id, e.target.checked)
                  }
                />
              </div>
              <div className="col-span-2 text-slate-600">
                {edit ? (
                  <input
                    type="date"
                    value={edit.reportedAt}
                    onChange={(e) =>
                      setEditingSubmissionRows((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...prev[row.id],
                          reportedAt: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                  />
                ) : (
                  formatNepaliDate(row.date)
                )}
              </div>
              <div className="col-span-2 text-slate-900 font-semibold">
                {edit ? (
                  <input
                    type="text"
                    value={edit.value}
                    onChange={(e) =>
                      setEditingSubmissionRows((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...prev[row.id],
                          value: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                  />
                ) : (
                  String(row.value)
                )}
              </div>
              <div className="col-span-3 text-slate-500 truncate">
                {edit ? (
                  <input
                    type="text"
                    value={edit.evidence}
                    onChange={(e) =>
                      setEditingSubmissionRows((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...prev[row.id],
                          evidence: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                  />
                ) : (
                  row.evidence || "-"
                )}
              </div>
              <div className="col-span-2 text-slate-500 truncate">
                {edit ? (
                  <input
                    type="text"
                    value={edit.disaggregationKey || ""}
                    placeholder="Disaggregation key"
                    onChange={(e) =>
                      setEditingSubmissionRows((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...prev[row.id],
                          disaggregationKey: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                  />
                ) : (
                  row.disaggregationKey || "-"
                )}
              </div>
              <div className="col-span-2 flex flex-col items-end gap-1">
                {row.deletedAt && (
                  <div className="text-xs text-amber-700 mb-1">
                    Deleted {row.deletedAt ? `on ${formatNepaliDateTime(row.deletedAt)}` : ""}
                    {row.deletedByUserId ? ` by User ${row.deletedByUserId}` : ""}
                  </div>
                )}
                {edit ? (
                  <>
                    <button
                      className="px-2 py-1 rounded border border-green-300 text-green-700 bg-green-50"
                      onClick={() => saveEditedSubmission(row.id)}
                    >
                      Save
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-slate-300 text-slate-700 bg-white"
                      onClick={() => cancelEditSubmission(row.id)}
                    >
                      Cancel
                    </button>
                  </>
                ) : row.deletedAt ? (
                  <button
                    className="px-2 py-1 rounded border border-amber-300 text-amber-700 bg-white"
                    onClick={() => restoreSubmission(indicator.id, row.id)}
                  >
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      className="px-2 py-1 rounded border border-blue-300 text-blue-700 bg-white disabled:opacity-40"
                      disabled={!editable}
                      onClick={() => beginEditSubmission(indicator.id, row)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-red-300 text-red-700 bg-white disabled:opacity-40"
                      disabled={!editable}
                      onClick={() => softDeleteSubmission(indicator.id, row.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
