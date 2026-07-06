const BASE = import.meta.env.VITE_API_BASE_URL as string;
const KEY  = import.meta.env.VITE_API_KEY  as string;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  project: string;
  folder_reachable: boolean;
  timestamp: string;
  error?: string;
}

export interface FileEntry {
  path: string;
  name: string;
}

export interface FilesResponse {
  folder_id: string;
  count: number;
  files: FileEntry[];
}

export interface RunSummary {
  status: "completed";
  summary: {
    files: Record<string, { daily_metrics: number; shipment_detail: number; actions: number }>;
    skipped: Array<{ file: string; reason: string }>;
    totals: {
      daily_metrics: number;
      shipment_detail: number;
      actions: number;
      scorecard_rows: number;
    };
  };
}

export interface ScorecardRow {
  report_month: string;
  status: string;
  region: string;
  metric_category: string;
  business_unit: string;
  product_line: string;
  plan: number | null;
  actual: number | null;
  gap: number | null;
  attainment_pct: number | null;
  plan_available: string;
  unit_of_measure: string;
  source_file: string;
  source_sheet: string;
  source_metric: string;
  data_quality_notes: string;
}

export interface MetricRow {
  period: string;
  region: string;
  business_unit: string;
  product_line: string;
  plant: string;
  metric_category: string;
  metric_name: string;
  source_metric: string;
  granularity: string;
  date: string | null;
  value: number;
  unit: string;
  is_cumulative: boolean;
  source_file: string;
  source_sheet: string;
  remarks: string;
}

export interface PivotDay {
  date: string;
  plan: number | null;
  actual: number | null;
  gap: number | null;
  attainment: string;
}

export interface PivotBlock {
  group: string;
  plan_mtd: number | null;
  actual_mtd: number | null;
  gap_mtd: number | null;
  attainment_mtd: string | null;
  daily: PivotDay[];
}

export interface PivotResponse {
  region: string;
  groups: number;
  pivot_blocks: PivotBlock[];
}

export interface AllResultsResponse {
  last_run: {
    daily_metrics?: number;
    shipment_detail?: number;
    actions?: number;
    scorecard_rows?: number;
  };
  daily_metrics: MetricRow[];
  daily_metrics_total_rows?: number;
  shipment_detail: unknown[];
  actions: unknown[];
  scorecard: ScorecardRow[];
  scorecard_total_rows?: number;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const authHeader: Record<string, string> = KEY ? { Authorization: `Bearer ${KEY}` } : {};
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const api = {
  health: () =>
    apiFetch<HealthResponse>("/health"),

  files: () =>
    apiFetch<FilesResponse>("/api/files"),

  run: () =>
    apiFetch<RunSummary>("/api/run", { method: "POST", body: "{}" }),

  regions: () =>
    apiFetch<{ regions: string[] }>("/api/regions"),

  results: (limit = 500) =>
    apiFetch<AllResultsResponse>(`/api/results?limit=${limit}`),

  scorecard: (region?: string) =>
    apiFetch<{ total_rows: number; data: ScorecardRow[] }>(
      region ? `/api/results/scorecard?region=${encodeURIComponent(region)}` : "/api/results/scorecard"
    ),

  metrics: (params?: { region?: string; metric_category?: string; date_from?: string; date_to?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.region)          q.set("region",          params.region);
    if (params?.metric_category) q.set("metric_category", params.metric_category);
    if (params?.date_from)       q.set("date_from",       params.date_from);
    if (params?.date_to)         q.set("date_to",         params.date_to);
    if (params?.limit)           q.set("limit",           String(params.limit));
    return apiFetch<{ total_rows: number; returned: number; data: MetricRow[] }>(`/api/results/metrics?${q}`);
  },

  pivot: (region: string, metric_category?: string) => {
    const q = metric_category ? `?metric_category=${encodeURIComponent(metric_category)}` : "";
    return apiFetch<PivotResponse>(`/api/results/pivot/${encodeURIComponent(region)}${q}`);
  },

  deleteFile: (filename: string) =>
    apiFetch<{ deleted: string; status: string }>(
      `/api/files/${encodeURIComponent(filename)}`,
      { method: "DELETE" }
    ),

  uploadFiles: (files: File[]) => {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    const url = `${BASE}/api/upload`;
    return fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
      return res.json() as Promise<{ uploaded: number; total: number; results: Array<{ file: string; status: string; reason?: string }> }>;
    });
  },
};
