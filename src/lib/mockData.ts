export type Status = "Behind Plan" | "Watchlist" | "On Plan" | "Above Plan" | "No Plan";

export interface OpsRecord {
  id: string;
  region: string;
  business: string;
  productLine: string;
  plant: string;
  reportMonth: string; // YYYY-MM
  plan: number;
  actual: number;
  gap: number;
  attainment: number; // 0..1.2
  status: Status;
  sourceFile: string;
  sourceSheet: string;
  metric: string;
}

export const REGIONS = [
  { name: "Japan", lat: 36, lng: 138 },
  { name: "Middle East", lat: 24, lng: 45 },
  { name: "North America", lat: 39, lng: -98 },
  { name: "India", lat: 22, lng: 78 },
  { name: "Australia", lat: -25, lng: 133 },
  { name: "Domestic", lat: 51, lng: 10 },
];

const BUSINESSES = ["Industrial", "Consumer", "Energy", "Aerospace"];
const PRODUCT_LINES = ["Precision Motors", "Turbine Components", "Sensor Modules", "Assembly Kits", "Control Systems"];
const PLANTS_BY_REGION: Record<string, string[]> = {
  Japan: ["Tsuyama", "Nagoya", "Osaka"],
  "Middle East": ["Dubai Hub", "Riyadh Ops"],
  "North America": ["Detroit", "Monterrey", "Ontario"],
  India: ["Pune", "Chennai"],
  Australia: ["Perth"],
  Domestic: ["Berlin", "Munich", "Stuttgart"],
};

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function statusFrom(attainment: number, plan: number): Status {
  if (plan === 0) return "No Plan";
  if (attainment >= 1.0) return "Above Plan";
  if (attainment >= 0.95) return "On Plan";
  if (attainment >= 0.8) return "Watchlist";
  return "Behind Plan";
}

const MONTHS = ["2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];

function buildRecords(): OpsRecord[] {
  const r = rand(42);
  const records: OpsRecord[] = [];
  let idx = 0;
  for (const region of REGIONS) {
    for (const plant of PLANTS_BY_REGION[region.name]) {
      const business = BUSINESSES[Math.floor(r() * BUSINESSES.length)];
      const productLine = PRODUCT_LINES[Math.floor(r() * PRODUCT_LINES.length)];
      for (const month of MONTHS) {
        const plan = Math.round(2000 + r() * 18000);
        const perf = 0.55 + r() * 0.7; // 0.55 - 1.25
        const actual = Math.round(plan * perf);
        const gap = actual - plan;
        const attainment = actual / plan;
        records.push({
          id: `rec-${idx++}`,
          region: region.name,
          business,
          productLine,
          plant,
          reportMonth: month,
          plan,
          actual,
          gap,
          attainment,
          status: statusFrom(attainment, plan),
          sourceFile: `${region.name.replace(/\s/g, "_")}_Ops_${month}.xlsx`,
          sourceSheet: `${plant}_Detail`,
          metric: `${productLine} Shipment`,
        });
      }
    }
  }
  return records;
}

export const ALL_RECORDS: OpsRecord[] = buildRecords();

export const CURRENT_MONTH = "2026-05";

export function currentMonthRecords(): OpsRecord[] {
  return ALL_RECORDS.filter((r) => r.reportMonth === CURRENT_MONTH);
}

export interface Kpis {
  totalPlan: number;
  totalActual: number;
  totalGap: number;
  attainment: number;
  regionsAtRisk: number;
  plantsAtRisk: number;
  watchlist: number;
}

export function computeKpis(records: OpsRecord[]): Kpis {
  const totalPlan = records.reduce((s, r) => s + r.plan, 0);
  const totalActual = records.reduce((s, r) => s + r.actual, 0);
  const totalGap = totalActual - totalPlan;
  const attainment = totalPlan ? totalActual / totalPlan : 0;
  const regionMap = new Map<string, number>();
  const plantSet = new Set<string>();
  let watchlist = 0;
  for (const r of records) {
    if (r.status === "Behind Plan") {
      regionMap.set(r.region, (regionMap.get(r.region) ?? 0) + 1);
      plantSet.add(r.plant);
    }
    if (r.status === "Watchlist") watchlist++;
  }
  return {
    totalPlan,
    totalActual,
    totalGap,
    attainment,
    regionsAtRisk: regionMap.size,
    plantsAtRisk: plantSet.size,
    watchlist,
  };
}

export function formatNumber(n: number, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const { compact = true, sign = false } = opts;
  const abs = Math.abs(n);
  let str: string;
  if (compact && abs >= 1_000_000) str = (n / 1_000_000).toFixed(1) + "M";
  else if (compact && abs >= 1_000) str = (n / 1_000).toFixed(1) + "K";
  else str = Math.round(n).toLocaleString();
  if (sign && n > 0) str = "+" + str;
  return str;
}

export function formatPct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

export const STATUS_COLORS: Record<Status, string> = {
  "Behind Plan": "var(--status-behind)",
  Watchlist: "var(--status-watchlist)",
  "On Plan": "var(--status-onplan)",
  "Above Plan": "var(--status-info)",
  "No Plan": "var(--status-noplan)",
};

export function statusColor(status: Status): string {
  return STATUS_COLORS[status];
}

export const MONTH_LABELS = MONTHS;

export function trendSeries(): { month: string; plan: number; actual: number; gap: number; forecast: number | null }[] {
  return MONTHS.map((m) => {
    const rows = ALL_RECORDS.filter((r) => r.reportMonth === m);
    const plan = rows.reduce((s, r) => s + r.plan, 0);
    const actual = rows.reduce((s, r) => s + r.actual, 0);
    const gap = actual - plan;
    return { month: m, plan, actual, gap, forecast: null };
  }).map((r, i, arr) => {
    // add forecast for last 3 months as dashed continuation
    if (i >= arr.length - 3) return { ...r, forecast: r.actual * (0.98 + (i - arr.length + 3) * 0.01) };
    return r;
  });
}

export function miniSpark(seed: number, len = 12): number[] {
  const r = rand(seed);
  return Array.from({ length: len }, () => 40 + r() * 60);
}

/** Delivery product lines (customer-facing shipment) */
const DELIVERY_LINES = new Set(["Assembly Kits", "Control Systems"]);
/** Production product lines (manufacturing output) */
const PRODUCTION_LINES = new Set(["Precision Motors", "Turbine Components", "Sensor Modules"]);

export interface RegionSummary {
  region: string;
  deliveryAttainment: number;
  deliveryStatus: Status;
  productionAttainment: number;
  productionStatus: Status;
  overallAttainment: number;
  overallStatus: Status;
  plan: number;
  actual: number;
  gap: number;
}

export function buildRegionSummaries(records: OpsRecord[]): RegionSummary[] {
  return REGIONS.map((reg) => {
    const all = records.filter((r) => r.region === reg.name);
    const delivery = all.filter((r) => DELIVERY_LINES.has(r.productLine));
    const production = all.filter((r) => PRODUCTION_LINES.has(r.productLine));

    const sum = (arr: OpsRecord[]) => {
      const plan = arr.reduce((s, r) => s + r.plan, 0);
      const actual = arr.reduce((s, r) => s + r.actual, 0);
      return { plan, actual, att: plan > 0 ? actual / plan : 0 };
    };

    const d = sum(delivery.length ? delivery : all);
    const p = sum(production.length ? production : all);
    const o = sum(all);

    return {
      region: reg.name,
      deliveryAttainment: d.att,
      deliveryStatus: statusFrom(d.att, d.plan),
      productionAttainment: p.att,
      productionStatus: statusFrom(p.att, p.plan),
      overallAttainment: o.att,
      overallStatus: statusFrom(o.att, o.plan),
      plan: o.plan,
      actual: o.actual,
      gap: o.actual - o.plan,
    };
  });
}

export const REGION_HIGHLIGHTS: { bold: string; text: string }[] = [
  { bold: "Japan:", text: "Production on track; delivery timelines under daily monitoring." },
  { bold: "Middle East:", text: "Port congestion flagged; teams mobilized to ensure timely clearance." },
  { bold: "North America:", text: "Turbine components gap under active recovery — $1M supply risk on watch." },
  { bold: "India:", text: "Assembly kit production resumes this week; recovery expected by month-end." },
  { bold: "Australia:", text: "All metrics performing above plan; strong quarter close anticipated." },
  { bold: "Domestic:", text: "Supply risk reduced; pull-in opportunity under evaluation." },
];