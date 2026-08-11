export enum NodeType {
  GOAL = "Goal",
  OUTCOME = "Outcome",
  OUTPUT = "Output",
  ACTIVITY = "Activity",
}

export enum IndicatorType {
  NUMBER = "Number",
  PERCENTAGE = "Percentage",
  CURRENCY = "Currency",
  TEXT = "Text",
  BOOLEAN = "Boolean",
  CATEGORICAL = "Categorical",
}

export interface LogframeNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  children?: LogframeNode[];
  indicatorCount?: number;
  // Extended fields for Logframe Builder
  assumptions?: string;
  risks?: string;
  verificationMethod?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Draft" | "Archived" | "Completed";
  sectors: string[];
  location?: string;
  donor?: string;
  budgetAmount?: number;
  budgetSpent?: number;
  budgetCurrency?: string;
  logframe: LogframeNode[]; // Root nodes (usually Goals)
  _count?: {
    indicators: number;
  };
}

export interface IndicatorValue {
  id: string;
  indicatorId?: string;
  date: string;
  value: number | string;
  categoryValue?: string; // Optional compatibility mirror of categorical value
  disaggregationKey?: string; // Added for dimensional filtering
  isAnomaly: boolean;
  anomalyReason?: string;
  anomalyScore?: number;
  anomalyThreshold?: number;
  anomalyMethod?: string;
  anomalyMeta?: Record<string, any>;
  comment?: string;
  evidence?: string; // Added for verification source/notes
  createdByUserId?: string;
  createdAt?: string;
  deletedAt?: string;
  deletedByUserId?: string;
  updatedAt?: string;
  updatedByUserId?: string;
}

export interface AnomalyConfig {
  enabled?: boolean;
  mode?: "RULES" | "ML";
  rules?: {
    range?: boolean;
    maxChangePercent?: number;
  };
  outlier?: {
    method?: "MAD" | "IQR";
    threshold?: number;
    windowSize?: number;
    minPoints?: number;
  };
  trend?: {
    method?: "SLOPE_SHIFT" | "MEAN_SHIFT";
    threshold?: number;
    windowSize?: number;
  };
  ml?: {
    method?: "ISOLATION_FOREST" | "Z_SCORE" | "LOF" | "DBSCAN";
    contamination?: number;
    windowSize?: number;
    minPoints?: number;
    seed?: number;
    zscore_threshold?: number;
  };
  fallback?: {
    useRangeChecks?: boolean;
    useRulesWhenInsufficientData?: boolean;
    useRulesOnServiceError?: boolean;
  };
}

export interface MLEvaluationResult {
  method: string;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

export interface CategoryDefinition {
  id: string;
  label: string;
  color?: string;
  description?: string;
}

export interface DisaggregationDimension {
  key: string;
  label: string;
  description?: string;
  values: string[];
  required?: boolean;
}

export interface CategoryConfig {
  allowMultiple?: boolean;
  maxSelections?: number;
  required?: boolean;
  allowOther?: boolean;
  disaggregationDimensions?: DisaggregationDimension[];
  expectedReportingEntities?: number;
}

export interface IndicatorVersion {
  version: number;
  createdAt: string;
  changes: string;
  active: boolean;
}

export interface Indicator {
  id: string;
  projectId: string;
  nodeId: string;
  name: string;
  code?: string; // Added
  description?: string;
  status?: "Active" | "Inactive" | "Under Review";
  type: IndicatorType;

  // Target & Validation
  target: number | string; // Updated to support non-numeric
  baseline: number | string;
  baselineCategory?: string; // For categorical baseline
  targetCategory?: string; // For categorical target
  minExpected?: number;
  maxExpected?: number;
  anomalyConfig?: AnomalyConfig;

  // Formatting rules
  unit?: string; // e.g., "kg", "households"
  decimals?: number;
  booleanLabels?: { true: string; false: string }; // For Boolean
  categories?: CategoryDefinition[]; // For Categorical
  categoryConfig?: CategoryConfig; // For Categorical

  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
  currentVersion: number;
  versions: IndicatorVersion[];
  values: IndicatorValue[];

  // Reminder fields
  reminderEnabled?: boolean;
  reminderDaysBeforeDue?: number | null;
  reminderDaysAfterDue?: number | null;
  reminderRecipients?: string[] | null;
}

export interface ActivityLog {
  id: string;
  user: string;
  userInitials: string;
  action: string;
  item: string;
  date: string;
  type: "info" | "warning" | "success" | "danger";
}

export interface ProjectStats {
  budgetTotal: number;
  budgetSpent: number;
  daysTotal: number;
  daysElapsed: number;
  indicatorsTotal: number;
  indicatorsReporting: number;
  submissionsCount: number;
  submissionsTarget?: number; // Optional for now
}

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  organizationId: number;
  createdAt?: string;
  name?: string | null;
  jobTitle?: string | null;
  organization?: string | null;
  organizationProfile?: {
    name: string;
    taxpayerNumber?: string | null;
    registrationNumber?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    invoiceFooter?: string | null;
    resetSalesInvoiceSequenceEachFiscalYear: boolean;
    nextSalesInvoiceNumber: number;
  } | null;
  avatar?: string | null;
}

export interface AnomalyNotification {
  id: string;
  submissionId: number;
  indicatorId: number;
  indicatorName: string;
  projectId: number;
  projectName: string;
  anomalyReason: string | null;
  anomalyStatus: string | null;
  value: string;
  reportedAt: string;
}
