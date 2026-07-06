/**
 * Transforms raw API scorecard + metrics into the OpsRecord shape
 * that all existing page components already consume.
 * Falls back to mock data when the API hasn't been called yet.
 */
import type { ScorecardRow, MetricRow } from "./api";
import type { OpsRecord, Status } from "./mockData";

// ── Status helpers ────────────────────────────────────────────────────────────

export function statusFromAttainment(pct: number | null): Status {
  if (pct === null) return "No Plan";
  const a = pct / 100;
  if (a >= 1.0) return "Above Plan";
  if (a >= 0.95) return "On Plan";
  if (a >= 0.8) return "Watchlist";
  return "Behind Plan";
}

// ── Scorecard → OpsRecord[] ───────────────────────────────────────────────────

export function scorecardToOpsRecords(rows: ScorecardRow[]): OpsRecord[] {
  return rows
    .filter((r) => r.plan !== null || r.actual !== null)
    .map((r, i) => {
      const plan   = r.plan   ?? 0;
      const actual = r.actual ?? 0;
      const gap    = actual - plan;
      const att    = plan > 0 ? actual / plan : actual > 0 ? 1.1 : 0;
      return {
        id:          `live-${i}`,
        region:      r.region,
        business:    r.business_unit   || "ALL",
        productLine: r.product_line    || "ALL",
        plant:       r.source_file     || "",
        reportMonth: r.report_month    || "2026-06",
        plan,
        actual,
        gap,
        attainment:  att,
        status:      statusFromAttainment(r.attainment_pct),
        sourceFile:  r.source_file,
        sourceSheet: r.source_sheet,
        metric:      r.metric_category,
      } satisfies OpsRecord;
    });
}

// ── Metrics → trend series ────────────────────────────────────────────────────

export interface TrendPoint {
  month: string;
  plan: number;
  actual: number;
  gap: number;
  forecast: number | null;
}

export function metricsToTrendSeries(rows: MetricRow[]): TrendPoint[] {
  const byPeriod = new Map<string, { plan: number; actual: number }>();
  for (const r of rows) {
    const key = r.period ?? "UNKNOWN";
    const cur = byPeriod.get(key) ?? { plan: 0, actual: 0 };
    if (["shipment_plan", "plan_qty", "month_target"].includes(r.metric_name)) {
      cur.plan += r.value;
    } else if (["actual_qty", "actual_mtd_cumulative"].includes(r.metric_name)) {
      cur.actual += r.value;
    }
    byPeriod.set(key, cur);
  }
  const sorted = Array.from(byPeriod.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([month, v], i, arr) => ({
    month,
    plan:   v.plan,
    actual: v.actual,
    gap:    v.actual - v.plan,
    forecast: i >= arr.length - 2 ? v.actual * 1.02 : null,
  }));
}

// ── Scorecard → region summary map ───────────────────────────────────────────

export interface LiveRegionSummary {
  region: string;
  plan: number;
  actual: number;
  gap: number;
  attainment: number;
  status: Status;
}

export function scorecardToRegionSummaries(rows: ScorecardRow[]): LiveRegionSummary[] {
  const map = new Map<string, { plan: number; actual: number }>();
  for (const r of rows) {
    const cur = map.get(r.region) ?? { plan: 0, actual: 0 };
    cur.plan   += r.plan   ?? 0;
    cur.actual += r.actual ?? 0;
    map.set(r.region, cur);
  }
  return Array.from(map.entries()).map(([region, v]) => {
    const att = v.plan > 0 ? v.actual / v.plan : 0;
    return {
      region,
      plan:       v.plan,
      actual:     v.actual,
      gap:        v.actual - v.plan,
      attainment: att,
      status:     statusFromAttainment(att * 100),
    };
  }).sort((a, b) => b.attainment - a.attainment);
}
