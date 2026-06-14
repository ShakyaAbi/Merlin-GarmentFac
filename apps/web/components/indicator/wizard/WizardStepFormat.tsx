import React from "react";
import { Indicator, IndicatorType } from "../../../types";
import { Hash, CircleDot, Type, Check, PieChart, Plus, Trash2, Grid3x3 } from "lucide-react";

interface WizardStepFormatProps {
  formData: Partial<Indicator>;
  updateField: (field: keyof Indicator, value: any) => void;
  selectableTypes: IndicatorType[];
}

export const WizardStepFormat: React.FC<WizardStepFormatProps> = ({
  formData,
  updateField,
  selectableTypes,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Type & Data Format
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {selectableTypes.map((t) => (
          <div
            key={t}
            onClick={() => updateField("type", t)}
            className={`
              cursor-pointer p-4 rounded-lg border-2 text-center transition-all
              ${
                formData.type === t
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 hover:border-slate-300"
              }
            `}
          >
            {t === IndicatorType.NUMBER && (
              <Hash className="w-6 h-6 mx-auto mb-2" />
            )}
            {t === IndicatorType.PERCENTAGE && (
              <CircleDot className="w-6 h-6 mx-auto mb-2" />
            )}
            {t === IndicatorType.CURRENCY && (
              <span className="block text-xl font-bold mb-2">$</span>
            )}
            {t === IndicatorType.TEXT && (
              <Type className="w-6 h-6 mx-auto mb-2" />
            )}
            {t === IndicatorType.BOOLEAN && (
              <Check className="w-6 h-6 mx-auto mb-2" />
            )}
            {t === IndicatorType.CATEGORICAL && (
              <PieChart className="w-6 h-6 mx-auto mb-2" />
            )}
            <span className="font-semibold">{t}</span>
          </div>
        ))}
      </div>

      {(formData.type === IndicatorType.NUMBER ||
        formData.type === IndicatorType.PERCENTAGE ||
        formData.type === IndicatorType.CURRENCY ||
        formData.type === IndicatorType.CATEGORICAL) && (
        <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit of Measure
            </label>
            <input
              type="text"
              value={formData.unit || ""}
              onChange={(e) => updateField("unit", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
              placeholder={
                formData.type === IndicatorType.PERCENTAGE
                  ? "%"
                  : "e.g., kg, NPR"
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Decimal Places
            </label>
            <select
              value={formData.decimals}
              onChange={(e) =>
                updateField("decimals", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            >
              <option value="0">0 (Integer)</option>
              <option value="1">1 (0.1)</option>
              <option value="2">2 (0.01)</option>
            </select>
          </div>
        </div>
      )}

      {formData.type === IndicatorType.BOOLEAN && (
        <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              True Label
            </label>
            <input
              type="text"
              value={formData.booleanLabels?.true || "Yes"}
              onChange={(e) =>
                updateField("booleanLabels", {
                  ...formData.booleanLabels,
                  true: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              False Label
            </label>
            <input
              type="text"
              value={formData.booleanLabels?.false || "No"}
              onChange={(e) =>
                updateField("booleanLabels", {
                  ...formData.booleanLabels,
                  false: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            />
          </div>
        </div>
      )}

      {formData.type === IndicatorType.CATEGORICAL && (
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categories
            </label>
            {(formData.categories || []).map((cat, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={cat.id}
                  onChange={(e) => {
                    const newCats = [...(formData.categories || [])];
                    newCats[idx] = { ...cat, id: e.target.value };
                    updateField("categories", newCats);
                  }}
                  placeholder="Category ID"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 font-mono text-sm"
                />
                <input
                  type="text"
                  value={cat.label}
                  onChange={(e) => {
                    const newCats = [...(formData.categories || [])];
                    newCats[idx] = { ...cat, label: e.target.value };
                    updateField("categories", newCats);
                  }}
                  placeholder="Category Label"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                />
                <input
                  type="color"
                  value={cat.color || "#4d66ff"}
                  onChange={(e) => {
                    const newCats = [...(formData.categories || [])];
                    newCats[idx] = { ...cat, color: e.target.value };
                    updateField("categories", newCats);
                  }}
                  className="w-12 h-10 border border-slate-300 rounded-md cursor-pointer"
                />
                <button
                  onClick={() => {
                    const newCats = (formData.categories || []).filter(
                      (_, i) => i !== idx,
                    );
                    updateField("categories", newCats);
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md border border-slate-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newCats = [
                  ...(formData.categories || []),
                  { id: "", label: "", color: "#4d66ff" },
                ];
                updateField("categories", newCats);
              }}
              className="w-full px-3 py-2 border border-dashed border-slate-300 rounded-md text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      formData.categoryConfig?.allowMultiple || false
                    }
                    onChange={(e) =>
                      updateField("categoryConfig", {
                        ...formData.categoryConfig,
                        allowMultiple: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300"
                  />
                  Allow Multiple Selections
                </label>
              </div>

              {formData.categoryConfig?.allowMultiple && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Max Selections
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.categoryConfig?.maxSelections || 3}
                    onChange={(e) =>
                      updateField("categoryConfig", {
                        ...formData.categoryConfig,
                        maxSelections: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Disaggregation
                  </h3>
                </div>
                <button
                  onClick={() => {
                    const dims =
                      formData.categoryConfig?.disaggregationDimensions ||
                      [];
                    updateField("categoryConfig", {
                      ...formData.categoryConfig,
                      disaggregationDimensions: [
                        ...dims,
                        { key: "", label: "", values: [""] },
                      ],
                    });
                  }}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Dimension
                </button>
              </div>
              
              {formData.categoryConfig?.disaggregationDimensions?.map(
                (dim, dimIdx) => (
                  <div
                    key={dimIdx}
                    className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-600">
                        Dimension {dimIdx + 1}
                      </span>
                      <button
                        onClick={() => {
                          const dims = (
                            formData.categoryConfig
                              ?.disaggregationDimensions || []
                          ).filter((_, i) => i !== dimIdx);
                          updateField("categoryConfig", {
                            ...formData.categoryConfig,
                            disaggregationDimensions: dims,
                          });
                        }}
                        className="text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <input
                          type="text"
                          value={dim.key}
                          onChange={(e) => {
                            const dims = [
                              ...(formData.categoryConfig
                                ?.disaggregationDimensions || []),
                            ];
                            dims[dimIdx] = {
                              ...dims[dimIdx],
                              key: e.target.value,
                            };
                            updateField("categoryConfig", {
                              ...formData.categoryConfig,
                              disaggregationDimensions: dims,
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                          placeholder="key (e.g., district)"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={dim.label}
                          onChange={(e) => {
                            const dims = [
                              ...(formData.categoryConfig
                                ?.disaggregationDimensions || []),
                            ];
                            dims[dimIdx] = {
                              ...dims[dimIdx],
                              label: e.target.value,
                            };
                            updateField("categoryConfig", {
                              ...formData.categoryConfig,
                              disaggregationDimensions: dims,
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                          placeholder="Label (e.g., District)"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {dim.values.map((val, valIdx) => (
                        <div key={valIdx} className="flex gap-2">
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => {
                              const dims = [
                                ...(formData.categoryConfig
                                  ?.disaggregationDimensions || []),
                              ];
                              const newVals = [...dims[dimIdx].values];
                              newVals[valIdx] = e.target.value;
                              dims[dimIdx] = {
                                ...dims[dimIdx],
                                values: newVals,
                              };
                              updateField("categoryConfig", {
                                ...formData.categoryConfig,
                                disaggregationDimensions: dims,
                              });
                            }}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                            placeholder={`Value ${valIdx + 1}`}
                          />
                          <button
                            onClick={() => {
                              const dims = [
                                ...(formData.categoryConfig
                                  ?.disaggregationDimensions || []),
                              ];
                              const newVals = dims[
                                dimIdx
                              ].values.filter((_, i) => i !== valIdx);
                              dims[dimIdx] = {
                                ...dims[dimIdx],
                                values: newVals,
                              };
                              updateField("categoryConfig", {
                                ...formData.categoryConfig,
                                disaggregationDimensions: dims,
                              });
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md border border-slate-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const dims = [
                            ...(formData.categoryConfig
                              ?.disaggregationDimensions || []),
                          ];
                          dims[dimIdx] = {
                            ...dims[dimIdx],
                            values: [...dims[dimIdx].values, ""],
                          };
                          updateField("categoryConfig", {
                            ...formData.categoryConfig,
                            disaggregationDimensions: dims,
                          });
                        }}
                        className="w-full px-3 py-1.5 border border-dashed border-slate-300 rounded-md text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
                      >
                        + Add Value
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {(formData.type === IndicatorType.NUMBER ||
        formData.type === IndicatorType.PERCENTAGE ||
        formData.type === IndicatorType.CURRENCY) && (
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Disaggregation
                </h3>
              </div>
              <button
                onClick={() => {
                  const dims =
                    formData.categoryConfig?.disaggregationDimensions ||
                    [];
                  updateField("categoryConfig", {
                    ...formData.categoryConfig,
                    disaggregationDimensions: [
                      ...dims,
                      { key: "", label: "", values: [""] },
                    ],
                  });
                }}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Dimension
              </button>
            </div>

            {formData.categoryConfig?.disaggregationDimensions?.map(
              (dim, dimIdx) => (
                <div
                  key={dimIdx}
                  className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-600">
                      Dimension {dimIdx + 1}
                    </span>
                    <button
                      onClick={() => {
                        const dims =
                          formData.categoryConfig
                            ?.disaggregationDimensions || [];
                        updateField("categoryConfig", {
                          ...formData.categoryConfig,
                          disaggregationDimensions: dims.filter(
                            (_, i) => i !== dimIdx,
                          ),
                        });
                      }}
                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <input
                        type="text"
                        value={dim.key}
                        onChange={(e) => {
                          const dims = [
                            ...(formData.categoryConfig
                              ?.disaggregationDimensions || []),
                          ];
                          dims[dimIdx] = {
                            ...dims[dimIdx],
                            key: e.target.value,
                          };
                          updateField("categoryConfig", {
                            ...formData.categoryConfig,
                            disaggregationDimensions: dims,
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                        placeholder="key (e.g., district)"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={dim.label}
                        onChange={(e) => {
                          const dims = [
                            ...(formData.categoryConfig
                              ?.disaggregationDimensions || []),
                          ];
                          dims[dimIdx] = {
                            ...dims[dimIdx],
                            label: e.target.value,
                          };
                          updateField("categoryConfig", {
                            ...formData.categoryConfig,
                            disaggregationDimensions: dims,
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                        placeholder="Label (e.g., District)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dim.values.map((val, valIdx) => (
                      <div key={valIdx} className="flex gap-2">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            const dims = [
                              ...(formData.categoryConfig
                                ?.disaggregationDimensions || []),
                            ];
                            const newVals = [...dims[dimIdx].values];
                            newVals[valIdx] = e.target.value;
                            dims[dimIdx] = {
                              ...dims[dimIdx],
                              values: newVals,
                            };
                            updateField("categoryConfig", {
                              ...formData.categoryConfig,
                              disaggregationDimensions: dims,
                            });
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                          placeholder={`Value ${valIdx + 1}`}
                        />
                        <button
                          onClick={() => {
                            const dims = [
                              ...(formData.categoryConfig
                                ?.disaggregationDimensions || []),
                            ];
                            const newVals = dims[dimIdx].values.filter(
                              (_, i) => i !== valIdx,
                            );
                            dims[dimIdx] = {
                              ...dims[dimIdx],
                              values: newVals,
                            };
                            updateField("categoryConfig", {
                              ...formData.categoryConfig,
                              disaggregationDimensions: dims,
                            });
                          }}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md border border-slate-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const dims = [
                          ...(formData.categoryConfig
                            ?.disaggregationDimensions || []),
                        ];
                        dims[dimIdx] = {
                          ...dims[dimIdx],
                          values: [...dims[dimIdx].values, ""],
                        };
                        updateField("categoryConfig", {
                          ...formData.categoryConfig,
                          disaggregationDimensions: dims,
                        });
                      }}
                      className="w-full px-3 py-1.5 border border-dashed border-slate-300 rounded-md text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
                    >
                      + Add Value
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};
