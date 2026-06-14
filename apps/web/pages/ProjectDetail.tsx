import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Project,
  Indicator,
  LogframeNode,
  NodeType,
  ProjectStats,
  ActivityLog,
} from "../types";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";
import { LogframeTree } from "../components/LogframeTree";
import { Modal } from "../components/ui/Modal";
import { LogframeNodeForm } from "../components/LogframeNodeForm";
// (LogframeWizard removed)
import ConfirmCascadeModal from "../components/ConfirmCascadeModal";
import { IndicatorCard } from "../components/IndicatorCard";
import { IndicatorWizard } from "../components/IndicatorWizard";
import {
  ArrowLeft,
  BarChart2,
  GitBranch,
  Layers,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Activity,
  Info,
  ClipboardCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card } from "../components/ui/Card";

export const ProjectDetail: React.FC = () => {
  type OutcomeProgressItem = {
    indicator: Indicator;
    latestValue: number | string | null;
    latestDate?: string;
    targetNumeric?: number;
    currentNumeric?: number;
  };

  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [outcomeProgress, setOutcomeProgress] = useState<OutcomeProgressItem[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "logframe" | "indicators"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    sectors: "",
    location: "",
    donor: "",
    budgetAmount: "",
    budgetSpent: "",
    budgetCurrency: "",
  });
  const navigate = useNavigate();

  // Modal States
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [selectedNode, setSelectedNode] = useState<LogframeNode | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(
    null,
  );

  // State for adding indicator from tree
  const [selectedNodeForIndicator, setSelectedNodeForIndicator] =
    useState<LogframeNode | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [progressSearch, setProgressSearch] = useState("");
  const [progressLevelFilter, setProgressLevelFilter] = useState<
    "ALL" | NodeType
  >("ALL");
  const [progressPage, setProgressPage] = useState(1);
  const progressPageSize = 5;

  const refreshData = () => {
    if (id) {
      setLoading(true);
      Promise.all([
        api.getProject(id),
        api.getIndicators(id),
        api.getProjectStats(id),
        api.getProjectActivities(id),
        api.getProjectAlerts(id),
        api.me(),
      ])
        .then(([projData, indData, statsData, actData, alertsData, userData]) => {
          setProject(projData ? { ...projData } : undefined);
          setIndicators(indData);
          setStats(statsData);
          setActivities(actData);
          setAlerts(alertsData || []);
          setCurrentUser({ role: userData.role });
        })
        .catch((error) => {
          console.error("Failed to load project detail", error);
          setProject(undefined);
          setIndicators([]);
          setStats(null);
          setActivities([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    refreshData();
  }, [id, isWizardOpen]); // Also refresh when wizard closes (assuming success)

  const isManagerOrAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  useEffect(() => {
    const loadOutcomeProgress = async () => {
      if (indicators.length === 0) {
        setOutcomeProgress([]);
        return;
      }

      const rows = await Promise.allSettled(
        indicators.map(async (indicator) => {
          const submissions = await api.getIndicatorSubmissions(indicator.id);
          const latest = submissions[0];
          const latestValue =
            latest?.value !== undefined && latest?.value !== null
              ? latest.value
              : null;
          const currentNumeric = Number(latestValue);
          const targetNumeric = Number(indicator.target);
          return {
            indicator,
            latestValue,
            latestDate: latest?.date,
            currentNumeric: Number.isFinite(currentNumeric)
              ? currentNumeric
              : undefined,
            targetNumeric: Number.isFinite(targetNumeric) ? targetNumeric : undefined,
          } as OutcomeProgressItem;
        }),
      );

      const progressRows = rows
        .filter((r): r is PromiseFulfilledResult<OutcomeProgressItem> => r.status === "fulfilled")
        .map((r) => r.value)
        .sort((a, b) => {
          const aTime = a.latestDate ? new Date(a.latestDate).getTime() : 0;
          const bTime = b.latestDate ? new Date(b.latestDate).getTime() : 0;
          return bTime - aTime;
        });

      setOutcomeProgress(progressRows);
    };

    loadOutcomeProgress().catch((error) => {
      console.error("Failed to load outcome indicator progress", error);
      setOutcomeProgress([]);
    });
  }, [indicators]);

  const toDateInputValue = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const openEditModal = (focusField?: string) => {
    if (!project) return;
    setEditForm({
      name: project.name ?? "",
      description: project.description ?? "",
      status: project.status ?? "Draft",
      startDate: toDateInputValue(project.startDate),
      endDate: toDateInputValue(project.endDate),
      sectors: (project.sectors || []).join(", "),
      location: project.location ?? "",
      donor: project.donor ?? "",
      budgetAmount:
        project.budgetAmount !== undefined && project.budgetAmount !== null
          ? String(project.budgetAmount)
          : "",
      budgetSpent:
        project.budgetSpent !== undefined && project.budgetSpent !== null
          ? String(project.budgetSpent)
          : "",
      budgetCurrency: project.budgetCurrency ?? "",
    });
    setEditError(null);
    setIsEditOpen(true);
    
    if (focusField) {
      setTimeout(() => {
        const el = document.querySelector(`[name="${focusField}"]`) as HTMLInputElement | HTMLTextAreaElement;
        el?.focus();
      }, 100);
    }
  };

  const handleAddRootGoal = () => {
    setSelectedNode(null);
    setNodeModalMode("create");
    setIsNodeModalOpen(true);
  };

  const handleAddChild = (parentNode: LogframeNode) => {
    setSelectedNode(parentNode);
    setNodeModalMode("create");
    setIsNodeModalOpen(true);
  };

  const handleEditNode = (node: LogframeNode) => {
    setSelectedNode(node);
    setNodeModalMode("edit");
    setIsNodeModalOpen(true);
  };

  // Listen for delete events from LogframeTree
  // Listen for delete events from LogframeTree -> open confirmation modal
  useEffect(() => {
    const handler = (e: any) => {
      const node: LogframeNode = e.detail.node;
      setSelectedNode(node);
      // Open our modal (we centralize delete handling here)
      setIsNodeModalOpen(false);
      // open dedicated delete modal
      setIsDeleteModalOpen(true);
    };
    window.addEventListener('logframe-delete-request', handler as EventListener);
    return () => window.removeEventListener('logframe-delete-request', handler as EventListener);
  }, [project]);

  const handleDeleteNode = async (node: LogframeNode) => {
    // Deprecated: we now use modal-driven delete flow. Keep function for direct calls.
    if (!node) return;
    try {
      await api.deleteLogframeNode(node.id);
      alert('Node deleted');
      refreshData();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.status === 400) {
        alert('Cannot delete node: it has child nodes or indicators. Use cascade delete if you have permission.');
      } else {
        alert(`Failed to delete node: ${msg}`);
      }
    }
  };

  const handleAddIndicator = (node: LogframeNode) => {
    setSelectedNodeForIndicator(node);
    setIsWizardOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!project || isDeleting) return;
    const confirmed = window.confirm(
      `Delete project "${project.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.deleteProject(project.id);
      navigate("/projects");
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("Failed to delete project.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProject = async () => {
    if (!project || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const name = editForm.name.trim();
      if (!name) {
        setEditError("Project name is required.");
        return;
      }

      if (
        editForm.startDate &&
        editForm.endDate &&
        editForm.startDate > editForm.endDate
      ) {
        setEditError("End date must be on or after start date.");
        return;
      }

      const sectors = editForm.sectors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const budgetAmount =
        editForm.budgetAmount.trim() === ""
          ? undefined
          : Number(editForm.budgetAmount.replace(/,/g, ""));
      if (budgetAmount !== undefined && Number.isNaN(budgetAmount)) {
        setEditError("Budget amount must be a number.");
        return;
      }
      if (budgetAmount !== undefined && budgetAmount < 0) {
        setEditError("Budget amount cannot be negative.");
        return;
      }
      const budgetSpent =
        editForm.budgetSpent.trim() === ""
          ? undefined
          : Number(editForm.budgetSpent.replace(/,/g, ""));
      if (budgetSpent !== undefined && Number.isNaN(budgetSpent)) {
        setEditError("Budget spent must be a number.");
        return;
      }
      const budgetCurrency = editForm.budgetCurrency.trim().toUpperCase();
      if (budgetAmount !== undefined && !budgetCurrency) {
        setEditError("Budget currency is required when budget amount is set.");
        return;
      }
      const updated = await api.updateProject(project.id, {
        name,
        description: editForm.description.trim() || undefined,
        status: editForm.status as Project["status"],
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        sectors,
        location: editForm.location.trim() || undefined,
        donor: editForm.donor.trim() || undefined,
        budgetAmount,
        budgetSpent,
        budgetCurrency: budgetCurrency || undefined,
      });
      
      setProject(updated);
      
      // Update stats manually to reflect budget changes immediately in KPI cards
      if (stats) {
        setStats({
          ...stats,
          budgetSpent: updated.budgetSpent ?? stats.budgetSpent,
          budgetTotal: updated.budgetAmount ?? stats.budgetTotal,
        });
      }
      
      setIsEditOpen(false);
    } catch (error) {
      console.error("Failed to update project", error);
      setEditError(
        error instanceof Error ? error.message : "Failed to update project",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveNode = async (data: Partial<LogframeNode>) => {
    if (!project) return;

    try {
      if (nodeModalMode === "create") {
        const newNode: LogframeNode = {
          id: `node-${Date.now()}`,
          type: data.type as NodeType,
          title: data.title || "Untitled",
          description: data.description,
          assumptions: data.assumptions,
          risks: data.risks,
          verificationMethod: data.verificationMethod,
          children: [],
          indicatorCount: 0,
        };
        await api.addLogframeNode(project.id, {
          type: newNode.type,
          title: newNode.title,
          description: newNode.description,
          parentId: selectedNode ? selectedNode.id : null,
        });
      } else {
        if (selectedNode) {
          await api.updateLogframeNode(selectedNode.id, {
            title: data.title,
            description: data.description,
            type: data.type as NodeType,
          });
        }
      }
      setIsNodeModalOpen(false);
      refreshData();
    } catch (error) {
      console.error("Failed to save node", error);
      alert("Failed to save changes");
    }
  };

  const filteredIndicators = indicators.filter(
    (ind) =>
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPercent = (value: number, total: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
      return 0;
    }
    const percent = (value / total) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const nodeTypeById = useMemo(() => {
    const map = new Map<string, NodeType>();
    const walk = (nodes: LogframeNode[]) => {
      nodes.forEach((node) => {
        map.set(node.id, node.type);
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      });
    };
    if (project?.logframe) walk(project.logframe);
    return map;
  }, [project?.logframe]);

  const progressRows = useMemo(() => {
    const query = progressSearch.trim().toLowerCase();
    const rows = outcomeProgress.filter((row) => {
      const level = nodeTypeById.get(row.indicator.nodeId);
      const levelMatch =
        progressLevelFilter === "ALL" || level === progressLevelFilter;
      const queryMatch =
        query.length === 0 ||
        row.indicator.name.toLowerCase().includes(query) ||
        (row.indicator.description || "").toLowerCase().includes(query);
      return levelMatch && queryMatch;
    });
    return rows;
  }, [outcomeProgress, progressSearch, progressLevelFilter, nodeTypeById]);

  const totalProgressPages = Math.max(
    1,
    Math.ceil(progressRows.length / progressPageSize),
  );
  const paginatedProgressRows = progressRows.slice(
    (progressPage - 1) * progressPageSize,
    progressPage * progressPageSize,
  );

  useEffect(() => {
    if (progressPage > totalProgressPages) {
      setProgressPage(totalProgressPages);
    }
  }, [progressPage, totalProgressPages]);

  const levelBadgeClass = (level?: NodeType) => {
    switch (level) {
      case NodeType.GOAL:
        return "bg-violet-50 text-violet-700 border-violet-200";
      case NodeType.OUTCOME:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case NodeType.OUTPUT:
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case NodeType.ACTIVITY:
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const progressColorClass = (percent: number) => {
    if (percent >= 80) return "bg-emerald-500";
    if (percent >= 50) return "bg-blue-500";
    return "bg-amber-500";
  };

  if (loading)
    return (
        <div className="p-8 text-center text-slate-500">Loading Project...</div>
    );
  if (!project)
    return (
        <div className="p-8 text-center text-red-500">Project not found</div>
    );

  const projectNameMissing = editForm.name.trim().length === 0;
  const dateRangeInvalid =
    !!editForm.startDate &&
    !!editForm.endDate &&
    editForm.startDate > editForm.endDate;
  const parsedBudgetAmount =
    editForm.budgetAmount.trim() === ""
      ? undefined
      : Number(editForm.budgetAmount.replace(/,/g, ""));
  const budgetInvalid =
    parsedBudgetAmount !== undefined &&
    (Number.isNaN(parsedBudgetAmount) || parsedBudgetAmount < 0);
  const budgetCurrencyMissing =
    (parsedBudgetAmount !== undefined || (editForm.budgetSpent.trim() !== "" && !Number.isNaN(Number(editForm.budgetSpent)))) && editForm.budgetCurrency.trim() === "";
  const canSaveProject =
    !isSavingEdit &&
    !projectNameMissing &&
    !dateRangeInvalid &&
    !budgetInvalid &&
    !budgetCurrencyMissing;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        <div className="bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {project.name}
              </h1>
              <p className="text-slate-500 mt-1">
                {formatDate(project.startDate)} — {formatDate(project.endDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/data-entry?projectId=${project.id}`}>
                <Button variant="secondary">
                  <ClipboardCheck className="w-4 h-4 mr-2" /> Data Entry
                </Button>
              </Link>
              {isManagerOrAdmin && (
                <>
                  <Button variant="outline" onClick={() => openEditModal()}>
                    Edit Project
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteProject}
                    isLoading={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedNodeForIndicator(null);
                      setIsWizardOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Indicator
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Project"
        size="lg"
      >
        <div className="space-y-5">
          {editError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {editError}
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Basic Information
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Set the core identity and summary for this project.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 shadow-sm ${
                  projectNameMissing ? "border-red-300" : "border-slate-200"
                }`}
                placeholder="e.g., National Infrastructure Development Program"
              />
              {projectNameMissing && (
                <p className="text-xs text-red-600 mt-1">
                  Project name is required.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 shadow-sm"
                placeholder="What does this project deliver, where, and for whom?"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Schedule & Classification
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep timeline and program categorization aligned.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2.5 border rounded-xl bg-white text-slate-900 shadow-sm ${
                    dateRangeInvalid ? "border-red-300" : "border-slate-200"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className={`w-full px-3 py-2.5 border rounded-xl bg-white text-slate-900 shadow-sm ${
                    dateRangeInvalid ? "border-red-300" : "border-slate-200"
                  }`}
                />
              </div>
            </div>
            {dateRangeInvalid && (
              <p className="text-xs text-red-600 -mt-2">
                End date must be on or after start date.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sectors
                </label>
                <input
                  type="text"
                  value={editForm.sectors}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sectors: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                  placeholder="Agriculture, Education, Health"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use comma-separated values.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Stakeholders & Budget
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Capture ownership and financial context.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                  placeholder="e.g., National / Province / District"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Donor
                </label>
                <input
                  type="text"
                  value={editForm.donor}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, donor: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                  placeholder="e.g., World Bank"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Budget Total
                </label>
                <input
                  type="number"
                  name="budgetAmount"
                  min={0}
                  step="0.01"
                  value={editForm.budgetAmount}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      budgetAmount: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2.5 border rounded-xl bg-white text-slate-900 shadow-sm ${
                    budgetInvalid ? "border-red-300" : "border-slate-200"
                  }`}
                  placeholder="Total Budget"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Budget Utilized (Actual)
                </label>
                <input
                  type="number"
                  name="budgetSpent"
                  min={0}
                  step="0.01"
                  value={editForm.budgetSpent}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      budgetSpent: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                  placeholder="Actual Spent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={editForm.budgetCurrency}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      budgetCurrency: e.target.value.toUpperCase(),
                    }))
                  }
                  className={`w-full px-3 py-2.5 border rounded-xl bg-white text-slate-900 shadow-sm uppercase ${
                    budgetCurrencyMissing ? "border-red-300" : "border-slate-200"
                  }`}
                  placeholder="NPR"
                />
              </div>
            </div>
            {(budgetInvalid || budgetCurrencyMissing) && (
              <div className="space-y-1">
                {budgetInvalid && (
                  <p className="text-xs text-red-600">
                    Enter valid non-negative numbers for budget.
                  </p>
                )}
                {budgetCurrencyMissing && (
                  <p className="text-xs text-red-600">
                    Currency is required when budget is provided.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500">
              Fields marked with <span className="text-red-500">*</span> are
              required.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveProject}
                isLoading={isSavingEdit}
                disabled={!canSaveProject}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Tabs */}
      <div className="mb-8">
        <nav className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl p-1.5 shadow-sm">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "logframe", label: "Logframe", icon: GitBranch },
            { id: "indicators", label: "Indicators", icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                group inline-flex items-center px-4 py-2 rounded-xl font-medium text-sm transition-all
                ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }
              `}
            >
              <tab.icon
                className={`mr-2 w-5 h-5 ${activeTab === tab.id ? "text-blue-500" : "text-slate-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div 
                 onClick={isManagerOrAdmin ? () => openEditModal("budgetSpent") : undefined}
                 className={`bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm transition-all ${isManagerOrAdmin ? 'hover:shadow-md cursor-pointer group' : ''}`}
               >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                    Budget Utilized
                  </span>
                  <div className="p-2 bg-green-50 rounded-full text-green-600 group-hover:bg-green-100 transition-colors">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats.budgetSpent)}
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${getPercent(stats.budgetSpent, stats.budgetTotal)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex justify-between">
                  <span>of {formatCurrency(stats.budgetTotal)} total</span>
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 text-[10px] font-bold">EDIT</span>
                </p>
              </div>

               <div 
                 onClick={isManagerOrAdmin ? () => openEditModal("startDate") : undefined}
                 className={`bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm transition-all ${isManagerOrAdmin ? 'hover:shadow-md cursor-pointer group' : ''}`}
               >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                    Time Elapsed
                  </span>
                  <div className="p-2 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round(getPercent(stats.daysElapsed, stats.daysTotal))}%
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${getPercent(stats.daysElapsed, stats.daysTotal)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex justify-between">
                  <span>{stats.daysElapsed} days of {stats.daysTotal} days</span>
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 text-[10px] font-bold">EDIT</span>
                </p>
              </div>

               <div 
                 onClick={() => setActiveTab("indicators")}
                 className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer group"
               >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                    Reporting Status
                  </span>
                  <div className="p-2 bg-purple-50 rounded-full text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.indicatorsReporting} / {stats.indicatorsTotal}
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full"
                    style={{
                      width: `${getPercent(stats.indicatorsReporting, stats.indicatorsTotal)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Indicators with data reporting
                </p>
              </div>

              <div 
                onClick={() => navigate(`/data-entry?projectId=${project.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                    Data Entry Volume
                  </span>
                  <div className="p-2 bg-amber-50 rounded-full text-amber-600 group-hover:bg-amber-100 transition-colors">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.submissionsCount.toLocaleString()}
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full w-full opacity-30"
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Total data submissions recorded
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card title="All Indicator Progress">
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          value={progressSearch}
                          onChange={(e) => {
                            setProgressSearch(e.target.value);
                            setProgressPage(1);
                          }}
                          placeholder="Search indicators..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900"
                        />
                      </div>
                      <select
                        value={progressLevelFilter}
                        onChange={(e) => {
                          setProgressLevelFilter(
                            e.target.value as "ALL" | NodeType,
                          );
                          setProgressPage(1);
                        }}
                        className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
                      >
                        <option value="ALL">Level: All</option>
                        <option value={NodeType.GOAL}>Goal</option>
                        <option value={NodeType.OUTCOME}>Outcome</option>
                        <option value={NodeType.OUTPUT}>Output</option>
                        <option value={NodeType.ACTIVITY}>Activity</option>
                      </select>
                    </div>

                    {progressRows.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No indicators match the current filters.
                      </p>
                    ) : (
                      <>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full min-w-[900px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr className="text-xs uppercase tracking-wider text-slate-500">
                                <th className="text-left px-4 py-3 font-semibold">
                                  Indicator Name
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                  Level
                                </th>
                                <th className="text-right px-4 py-3 font-semibold">
                                  Baseline
                                </th>
                                <th className="text-right px-4 py-3 font-semibold">
                                  Target
                                </th>
                                <th className="text-left px-4 py-3 font-semibold">
                                  Current Progress
                                </th>
                                <th className="text-center px-4 py-3 font-semibold">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedProgressRows.map((row) => {
                                const percent = getPercent(
                                  row.currentNumeric ?? 0,
                                  row.targetNumeric ?? 0,
                                );
                                const level = nodeTypeById.get(
                                  row.indicator.nodeId,
                                );
                                return (
                                  <tr
                                    key={row.indicator.id}
                                    className="hover:bg-slate-50/70"
                                  >
                                    <td className="px-4 py-3">
                                      <div className="font-medium text-slate-900">
                                        {row.indicator.name}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5">
                                        {(project.sectors &&
                                        project.sectors.length > 0
                                          ? project.sectors[0]
                                          : "General") +
                                          " • " +
                                          project.name}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex text-xs font-semibold px-2 py-1 rounded-md border ${levelBadgeClass(level)}`}
                                      >
                                        {level || "N/A"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                                      {row.indicator.baseline !== undefined &&
                                      row.indicator.baseline !== null
                                        ? String(row.indicator.baseline)
                                        : "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                                      {row.targetNumeric !== undefined
                                        ? String(row.indicator.target)
                                        : "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full ${progressColorClass(percent)}`}
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                                          {row.targetNumeric !== undefined
                                            ? `${Math.round(percent)}%`
                                            : "N/A"}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                        <span>
                                          Latest:{" "}
                                          {row.latestValue !== null
                                            ? String(row.latestValue)
                                            : "N/A"}
                                        </span>
                                        <span>{formatDate(row.latestDate)}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <Link
                                        to={`/indicators/${row.indicator.id}`}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                                        title="Open indicator"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">
                            Showing{" "}
                            <span className="font-semibold text-slate-700">
                              {(progressPage - 1) * progressPageSize + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-slate-700">
                              {Math.min(
                                progressPage * progressPageSize,
                                progressRows.length,
                              )}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-slate-700">
                              {progressRows.length}
                            </span>{" "}
                            indicators
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setProgressPage((p) => Math.max(1, p - 1))
                              }
                              disabled={progressPage === 1}
                              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <span className="px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                              {progressPage}
                            </span>
                            <button
                              onClick={() =>
                                setProgressPage((p) =>
                                  Math.min(totalProgressPages, p + 1),
                                )
                              }
                              disabled={progressPage === totalProgressPages}
                              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                <Card title="Executive Summary">
                  <div className="text-slate-600 leading-relaxed space-y-4">
                    <p>{project.description}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        Sector: Agriculture
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        Region: Northern District
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        Donor: Global Fund
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Key Alerts Section - Actual Data Content */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Critical Attention Needed
                    </h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${alerts.length > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                      {alerts.length} {alerts.length === 1 ? "Issue" : "Issues"}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {alerts.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No critical alerts found. All systems healthy.</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div 
                          key={alert.id} 
                          className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/indicators/${alert.indicatorId}`)}
                        >
                          <div className={`p-2 rounded-full h-fit mt-1 ${alert.severity === 'danger' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                            {alert.type === 'anomaly' ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {alert.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(alert.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                <Card title="Recent Activity" className="h-full">
                  <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 py-2 ml-1">
                      {activities.map((activity) => (
                        <div key={activity.id} className="relative">
                          <div
                            className={`
                                   absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white
                                   ${activity.type === "danger" ? "bg-red-500" : activity.type === "success" ? "bg-green-500" : activity.type === "warning" ? "bg-amber-500" : "bg-blue-400"}
                                `}
                          ></div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 mb-0.5">
                              {activity.date}
                            </span>
                            <p className="text-sm text-slate-800 font-medium whitespace-normal break-words">
                              <span className="font-bold text-slate-900">
                                {activity.user}
                              </span>{" "}
                              {activity.action}
                            </p>
                            <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1 w-fit">
                              {activity.item}
                            </span>
                          </div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-400">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-slate-500 hover:text-blue-600"
                      onClick={() => navigate("/settings")}
                    >
                      View Full Audit Log
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logframe" && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-slate-200/70 min-h-[600px] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Logframe Matrix
              </h3>
                {project.logframe.length === 0 && isManagerOrAdmin && (
                  <div className="flex items-center gap-2">
                    <Button onClick={handleAddRootGoal} size="sm">
                      <Plus className="w-4 h-4 mr-2" /> Add Primary Goal
                    </Button>
                  </div>
                )}
            </div>

            {project.logframe.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <p className="text-slate-500 mb-4">
                  No logframe structure defined yet.
                </p>
                <Button onClick={handleAddRootGoal}>Create First Goal</Button>
              </div>
            ) : (
              <div className="space-y-6">
                 {project.logframe.map((node) => (
                   <LogframeTree
                     key={node.id}
                     node={node}
                     indicators={indicators}
                     onAddChild={isManagerOrAdmin ? handleAddChild : undefined}
                     onEdit={isManagerOrAdmin ? handleEditNode : undefined}
                     onAddIndicator={isManagerOrAdmin ? handleAddIndicator : undefined}
                     isRoot={true}
                   />
                 ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "indicators" && (
          <div className="space-y-6">
            {/* Search and Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200/70 shadow-sm">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search indicators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900 shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
                  All Categories
                </button>
                <button className="inline-flex items-center px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
                  All Status
                </button>
              </div>
            </div>

            {/* Indicators Grid */}
            {filteredIndicators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredIndicators.map((ind) => (
                  <IndicatorCard
                    key={ind.id}
                    indicator={ind}
                    canEdit={currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER"}
                    onEdit={(indicator) => {
                      setEditingIndicator(indicator);
                      setIsWizardOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">
                  No indicators found matching your search.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logframe Node Modal */}
      <Modal
        isOpen={isNodeModalOpen}
        onClose={() => setIsNodeModalOpen(false)}
        title={
          nodeModalMode === "create"
            ? "Add Logframe Component"
            : "Edit Component"
        }
      >
        <div className="p-6">
          <LogframeNodeForm
            mode={nodeModalMode}
            initialData={
              nodeModalMode === "edit" && selectedNode ? selectedNode : {}
            }
            parentType={
              nodeModalMode === "create" && selectedNode
                ? selectedNode.type
                : null
            }
            onSave={handleSaveNode}
            onCancel={() => setIsNodeModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Indicator Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => { setIsWizardOpen(false); }}
        title=""
        size="xl"
      >
        <IndicatorWizard
          project={project}
          initialNodeId={selectedNodeForIndicator?.id}
          editingIndicator={editingIndicator}
          onClose={() => {
            setIsWizardOpen(false);
            setEditingIndicator(null);
          }}
          canManage={isManagerOrAdmin}
        />
      </Modal>

      {/* Confirm Cascade Delete Modal */}
      <ConfirmCascadeModal
        isOpen={isDeleteModalOpen}
        node={selectedNode}
        indicators={indicators}
        onClose={() => setIsDeleteModalOpen(false)}
        onSafeDelete={async () => {
          if (!selectedNode) return;
          try {
            await api.deleteLogframeNode(selectedNode.id);
            alert('Node deleted');
            setIsDeleteModalOpen(false);
            refreshData();
          } catch (err: any) {
            if (err?.status === 400) {
              alert('Cannot delete node: it has child nodes or indicators. Remove them first or use cascade.');
            } else {
              alert('Failed to delete node');
            }
          }
        }}
        onCascadeDelete={async () => {
          if (!selectedNode) return;
          try {
            await api.deleteLogframeNodeCascade(selectedNode.id);
            alert('Node and descendants deleted');
            setIsDeleteModalOpen(false);
            refreshData();
          } catch (err: any) {
            console.error('Cascade delete failed', err);
            alert('Cascade delete failed');
          }
        }}
      />
    </>
  );
};
