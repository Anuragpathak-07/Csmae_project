import { createFileRoute } from "@tanstack/react-router";
import {
  ALL_RECORDS,
  MONTH_LABELS,
  REGIONS,
  formatNumber,
  formatPct,
  type Status,
  currentMonthRecords,
  CURRENT_MONTH,
} from "@/lib/mockData";
import { useScorecard } from "@/hooks/useApi";
import { scorecardToOpsRecords } from "@/lib/liveData";
import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Globe2,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
  BarChart,
  Cell,
  LabelList,
} from "recharts";
import { StatusChip } from "@/components/ui/status-chip";

export const Route = createFileRoute("/_shell/attainment-matrix")({
  head: () => ({
    meta: [
      { title: "Performance Intelligence — Operations Command Center" },
      {
        name: "description",
        content:
          "Unified plan vs actual execution view and country-level attainment matrix.",
      },
    ],
  }),
  component: PerformanceIntelligence,
});

/* ─── constants ──────────────────────────────────────────────────── */

const STATUS_COLOR: Record<Status, string> = {
  "Behind Plan": "#EF4444",
  Watchlist: "#F59E0B",
  "On Plan": "#10B981",
  "Above Plan": "#10B981",
  "No Plan": "#475569",
};

const DIMS = ["region", "business", "productLine", "plant"] as const;
type Dim = (typeof DIMS)[number];
const DIM_LABEL: Record<Dim, string> = {
  region: "Region",
  business: "Business",
  productLine: "Product Line",
  plant: "Plant",
};

const TOOLTIP_STYLE = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--hairline)",
  borderRadius: 10,
  color: "var(--text-primary)",
  fontSize: 11,
  boxShadow: "var(--glass-shadow)",
};

/* ─── helpers ────────────────────────────────────────────────────── */

function attToStatus(att: number, plan: number): Status {
  if (plan === 0) return "No Plan";
  if (att >= 1.0) return "Above Plan";
  if (att >= 0.95) return "On Plan";
  if (att >= 0.8) return "Watchlist";
  return "Behind Plan";
}

function monthLabel(m: string) {
  const [, mm] = m.split("-");
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return names[parseInt(mm, 10) - 1] ?? mm;
}

/* ─── main component ─────────────────────────────────────────────── */

function PerformanceIntelligence() {
  const [activeTab, setActiveTab] = useState<"execution" | "country">(
    "execution"
  );

  const { data: scorecardData } = useScorecard();

  /* ── overall company KPIs ── */
  const records = scorecardData?.data?.length
    ? scorecardToOpsRecords(scorecardData.data)
    : currentMonthRecords();
  const overall = useMemo(() => {
    const idx = MONTH_LABELS.indexOf(CURRENT_MONTH);
    const prevMonth = MONTH_LABELS[idx - 1];
    const agg = (rows: typeof records) => {
      const plan = rows.reduce((s, r) => s + r.plan, 0);
      const actual = rows.reduce((s, r) => s + r.actual, 0);
      return { plan, actual, gap: actual - plan, att: plan ? actual / plan : 0 };
    };
    const cur = agg(records);
    const prev = agg(ALL_RECORDS.filter((r) => r.reportMonth === prevMonth));
    return { ...cur, deltaPts: (cur.att - prev.att) * 100 };
  }, [records]);

  const overallStatus = attToStatus(overall.att, overall.plan);
  const overallColor = STATUS_COLOR[overallStatus];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="glass-panel px-7 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-secondary">
                Performance Intelligence
              </span>
              <span className="h-3.5 w-px bg-hairline-strong" />
              <span className="text-[10px] text-text-muted">May 2026</span>
            </div>
            <h1
              className="text-2xl font-semibold leading-tight text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Plan vs Actual · Attainment Matrix
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Unified execution overview and country-level drill-down
            </p>
          </div>

          {/* overall attainment badge */}
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{
              background: `color-mix(in oklab, ${overallColor} 10%, var(--glass-bg))`,
              border: `1px solid color-mix(in oklab, ${overallColor} 30%, var(--hairline))`,
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${overallColor} 18%, transparent)`,
              }}
            >
              {overall.att >= 0.95 ? (
                <TrendingUp
                  className="h-4.5 w-4.5"
                  style={{ color: overallColor }}
                />
              ) : (
                <TrendingDown
                  className="h-4.5 w-4.5"
                  style={{ color: overallColor }}
                />
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">
                Company-wide
              </div>
              <div
                className="text-xl font-bold tabular-nums leading-none"
                style={{
                  color: overallColor,
                  fontFamily: "var(--font-display)",
                }}
              >
                {formatPct(overall.att)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI band ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total Plan" value={formatNumber(overall.plan)} />
        <KpiTile label="Total Actual" value={formatNumber(overall.actual)} />
        <KpiTile
          label="Overall Gap"
          value={formatNumber(overall.gap, { sign: true })}
          valueColor={
            overall.gap >= 0
              ? "var(--status-onplan)"
              : "var(--status-behind)"
          }
          sub={`${formatPct(overall.plan ? overall.gap / overall.plan : 0)} of plan`}
        />
        <KpiTile
          label="Attainment"
          value={formatPct(overall.att)}
          valueColor={overallColor}
          delta={overall.deltaPts}
          deltaSuffix=" pts MoM"
        />
      </div>

      {/* ── Global insight banner ─────────────────────────────────── */}
      <GlobalInsightBanner records={records} overall={overall} />

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="glass-panel flex items-center gap-1 p-1.5">
        <TabButton
          active={activeTab === "execution"}
          onClick={() => setActiveTab("execution")}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          label="Execution View"
          sub="Plan vs Actual by dimension"
        />
        <TabButton
          active={activeTab === "country"}
          onClick={() => setActiveTab("country")}
          icon={<Globe2 className="h-3.5 w-3.5" />}
          label="Country Drill-Down"
          sub="Regional attainment & trend"
        />
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      {activeTab === "execution" ? (
        <ExecutionView records={records} />
      ) : (
        <CountryDrillDown />
      )}
    </div>
  );
}

/* ─── Execution View ─────────────────────────────────────────────── */

function ExecutionView({
  records,
}: {
  records: ReturnType<typeof currentMonthRecords>;
}) {
  const [dim, setDim] = useState<Dim>("region");
  const [mode, setMode] = useState<"grouped" | "variance">("grouped");
  const [sort, setSort] = useState<"gap" | "size">("gap");
  const [showTable, setShowTable] = useState(false);

  const data = useMemo(() => {
    const map = new Map<string, { name: string; plan: number; actual: number }>();
    for (const r of records) {
      const key = r[dim];
      const cur = map.get(key) ?? { name: key, plan: 0, actual: 0 };
      cur.plan += r.plan;
      cur.actual += r.actual;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        gap: r.actual - r.plan,
        attainment: r.plan ? r.actual / r.plan : 0,
      }))
      .sort(
        sort === "gap"
          ? (a, b) => a.gap - b.gap
          : (a, b) => b.plan - a.plan
      );
  }, [records, dim, sort]);

  const behindCount = data.filter((d) => d.attainment < 0.8).length;

  return (
    <div className="flex flex-col gap-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {DIMS.map((d) => (
            <button
              key={d}
              onClick={() => setDim(d)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                dim === d
                  ? "border-accent-secondary/60 bg-accent-secondary/15 text-text-primary"
                  : "border-hairline text-text-secondary hover:border-accent-secondary/30 hover:text-text-primary"
              }`}
            >
              {DIM_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SegControl
            value={mode}
            onChange={(v) => setMode(v as "grouped" | "variance")}
            options={[
              { v: "grouped", l: "Plan vs Actual" },
              { v: "variance", l: "Gap View" },
            ]}
          />
          <SegControl
            value={sort}
            onChange={(v) => setSort(v as "gap" | "size")}
            options={[
              { v: "gap", l: "Worst first" },
              { v: "size", l: "By size" },
            ]}
          />
          <button
            onClick={() => setShowTable((v) => !v)}
            className="rounded-full border border-hairline px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent-secondary/30 hover:text-text-primary"
          >
            {showTable ? "Hide table" : "View table"}
          </button>
        </div>
      </div>

      {/* behind count badge */}
      {behindCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-status-behind/20 bg-[color-mix(in_oklab,#EF4444_6%,transparent)] px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-status-behind" />
          <span className="text-xs text-text-secondary">
            <span className="font-semibold text-status-behind">
              {behindCount} {DIM_LABEL[dim].toLowerCase()}
              {behindCount !== 1 ? "s" : ""}
            </span>{" "}
            below 80% attainment — immediate attention required.
          </span>
        </div>
      )}

      {/* chart */}
      <div className="glass-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>
            {mode === "grouped"
              ? `Plan vs Actual by ${DIM_LABEL[dim]}`
              : `Gap Variance by ${DIM_LABEL[dim]}`}
          </SectionLabel>
          <span className="text-[11px] text-text-muted">
            {data.length} {DIM_LABEL[dim].toLowerCase()}s · May 2026
          </span>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "grouped" ? (
              <BarChart
                data={data}
                margin={{ left: 8, right: 16, top: 24, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#3B82F6"
                  strokeOpacity={0.07}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(59,130,246,0.06)" }}
                  formatter={(v: number, n: string) => [formatNumber(v), n]}
                />
                <Bar
                  dataKey="plan"
                  name="Plan (target)"
                  fill="#475569"
                  opacity={0.45}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((d) => (
                    <Cell
                      key={d.name}
                      fill={STATUS_COLOR[attToStatus(d.attainment, d.plan)]}
                    />
                  ))}
                  <LabelList
                    dataKey="attainment"
                    position="top"
                    fontSize={10}
                    fill="#94A3B8"
                    formatter={(v: number) => formatPct(v, 0)}
                  />
                </Bar>
              </BarChart>
            ) : (
              <ComposedChart
                data={data}
                margin={{ left: 8, right: 16, top: 24, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#3B82F6"
                  strokeOpacity={0.07}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(59,130,246,0.06)" }}
                  formatter={(v: number) => [
                    formatNumber(v, { sign: true }),
                    "Gap vs plan",
                  ]}
                />
                <ReferenceLine y={0} stroke="#94A3B8" strokeOpacity={0.4} />
                <Bar dataKey="gap" name="Gap vs plan" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell
                      key={d.name}
                      fill={
                        d.gap >= 0
                          ? STATUS_COLOR["On Plan"]
                          : STATUS_COLOR["Behind Plan"]
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="gap"
                    position="top"
                    fill="#94A3B8"
                    fontSize={10}
                    formatter={(v: number) => formatNumber(v, { sign: true })}
                  />
                </Bar>
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-text-muted">
          {mode === "grouped" ? (
            <>
              <LegendSwatch color="#475569" label="Plan (target)" />
              <span className="h-3 w-px bg-hairline-strong" />
              <LegendSwatch color={STATUS_COLOR["On Plan"]} label="On plan ≥95%" />
              <LegendSwatch
                color={STATUS_COLOR["Watchlist"]}
                label="Watchlist ≥80%"
              />
              <LegendSwatch
                color={STATUS_COLOR["Behind Plan"]}
                label="Behind <80%"
              />
            </>
          ) : (
            <>
              <LegendSwatch color={STATUS_COLOR["On Plan"]} label="Above plan" />
              <LegendSwatch
                color={STATUS_COLOR["Behind Plan"]}
                label="Below plan"
              />
            </>
          )}
        </div>
      </div>

      {/* table */}
      {showTable && (
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <SectionLabel>
              {DIM_LABEL[dim]} Detail — May 2026
            </SectionLabel>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-5 py-3">{DIM_LABEL[dim]}</th>
                <th className="px-5 py-3 text-right">Plan</th>
                <th className="px-5 py-3 text-right">Actual</th>
                <th className="px-5 py-3 text-right">Gap</th>
                <th className="px-5 py-3 text-right">Attainment</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-hairline/50 last:border-0 hover:bg-film transition-colors"
                >
                  <td className="px-5 py-3 text-text-primary font-medium">
                    {row.name}
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">
                    {formatNumber(row.plan)}
                  </td>
                  <td className="px-5 py-3 text-right text-text-secondary">
                    {formatNumber(row.actual)}
                  </td>
                  <td
                    className="px-5 py-3 text-right text-xs font-medium"
                    style={{
                      color:
                        row.gap < 0
                          ? "var(--status-behind)"
                          : "var(--status-onplan)",
                    }}
                  >
                    {formatNumber(row.gap, { sign: true })}
                  </td>
                  <td className="px-5 py-3 text-right text-text-primary">
                    {formatPct(row.attainment)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusChip status={attToStatus(row.attainment, row.plan)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Country Drill-Down ─────────────────────────────────────────── */

function CountryDrillDown() {
  const { data: scorecardData } = useScorecard();
  const liveRecords = scorecardData?.data?.length
    ? scorecardToOpsRecords(scorecardData.data)
    : null;
  const allRecords  = liveRecords ?? ALL_RECORDS;
  const currentMonth = liveRecords
    ? (liveRecords[0]?.reportMonth ?? CURRENT_MONTH)
    : CURRENT_MONTH;
  const liveRegions  = liveRecords
    ? Array.from(new Set(liveRecords.map((r) => r.region))).map((name) => ({ name, lat: 0, lng: 0 }))
    : REGIONS;

  const [selectedRegion, setSelectedRegion] = useState(() => liveRegions[0]?.name ?? REGIONS[0].name);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const PREV_MONTH = MONTH_LABELS[MONTH_LABELS.length - 2];

  const currentRecs = useMemo(
    () =>
      allRecords.filter(
        (r) => r.region === selectedRegion && r.reportMonth === currentMonth
      ),
    [selectedRegion, allRecords, currentMonth]
  );

  const summary = useMemo(() => {
    const plan = currentRecs.reduce((s, r) => s + r.plan, 0);
    const actual = currentRecs.reduce((s, r) => s + r.actual, 0);
    const gap = actual - plan;
    const att = plan ? actual / plan : 0;
    const prevRecs = ALL_RECORDS.filter(
      (r) => r.region === selectedRegion && r.reportMonth === PREV_MONTH
    );
    const prevPlan = prevRecs.reduce((s, r) => s + r.plan, 0);
    const prevActual = prevRecs.reduce((s, r) => s + r.actual, 0);
    const prevAtt = prevPlan ? prevActual / prevPlan : 0;
    return {
      plan,
      actual,
      gap,
      att,
      status: attToStatus(att, plan),
      deltaPts: (att - prevAtt) * 100,
      gapPct: plan ? gap / plan : 0,
    };
  }, [currentRecs, selectedRegion, PREV_MONTH]);

  const trendData = useMemo(() => {
    const months = Array.from(new Set(allRecords.map((r) => r.reportMonth))).sort();
    const source = months.length ? months : MONTH_LABELS;
    return source.map((m) => {
      const recs = allRecords.filter(
        (r) => r.region === selectedRegion && r.reportMonth === m
      );
      const plan = recs.reduce((s, r) => s + r.plan, 0);
      const actual = recs.reduce((s, r) => s + r.actual, 0);
      const att = plan ? (actual / plan) * 100 : 0;
      return {
        month: monthLabel(m),
        att: parseFloat(att.toFixed(1)),
        plan,
        actual,
      };
    });
  }, [selectedRegion, allRecords]);

  const plants = useMemo(() => {
    const map = new Map<string, { plan: number; actual: number }>();
    for (const r of currentRecs) {
      const cur = map.get(r.plant) ?? { plan: 0, actual: 0 };
      cur.plan += r.plan;
      cur.actual += r.actual;
      map.set(r.plant, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        plan: v.plan,
        actual: v.actual,
        gap: v.actual - v.plan,
        att: v.plan ? v.actual / v.plan : 0,
        status: attToStatus(v.plan ? v.actual / v.plan : 0, v.plan),
      }))
      .sort((a, b) => a.att - b.att);
  }, [currentRecs]);

  const productLines = useMemo(() => {
    const map = new Map<string, { plan: number; actual: number }>();
    for (const r of currentRecs) {
      const cur = map.get(r.productLine) ?? { plan: 0, actual: 0 };
      cur.plan += r.plan;
      cur.actual += r.actual;
      map.set(r.productLine, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        plan: v.plan,
        actual: v.actual,
        gap: v.actual - v.plan,
        att: v.plan ? v.actual / v.plan : 0,
        status: attToStatus(v.plan ? v.actual / v.plan : 0, v.plan),
      }))
      .sort((a, b) => a.att - b.att);
  }, [currentRecs]);

  const statusColor = STATUS_COLOR[summary.status];
  const trendAvg =
    trendData.reduce((s, t) => s + t.att, 0) / (trendData.length || 1);
  const trendCurrent = trendData[trendData.length - 1]?.att ?? 0;
  const GapIcon =
    summary.gap > 0 ? TrendingUp : summary.gap < 0 ? TrendingDown : Minus;
  const gapColor =
    summary.gap >= 0 ? "var(--status-onplan)" : "var(--status-behind)";

  return (
    <div
      className="flex flex-col gap-4"
      onClick={() => dropdownOpen && setDropdownOpen(false)}
    >
      {/* region selector + mini KPIs */}
      <div className="glass-panel px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionLabel>Region Analysis</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">
              Select a region to drill into plant & product-line detail
            </p>
          </div>

          {/* region dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex min-w-[210px] items-center justify-between gap-3 rounded-xl border border-hairline bg-film px-4 py-3 text-sm font-medium text-text-primary transition hover:border-accent-secondary/40 hover:bg-film-strong"
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: statusColor,
                    boxShadow: `0 0 6px ${statusColor}`,
                  }}
                />
                {selectedRegion}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-text-muted transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[210px] overflow-hidden rounded-xl border border-hairline py-1"
                style={{
                  background: "var(--dropdown-bg)",
                  backdropFilter: "blur(24px)",
                  boxShadow: "var(--glass-shadow)",
                }}
              >
                {liveRegions.map((reg) => {
                  const recs = allRecords.filter(
                    (r) =>
                      r.region === reg.name && r.reportMonth === currentMonth
                  );
                  const plan = recs.reduce((s, r) => s + r.plan, 0);
                  const actual = recs.reduce((s, r) => s + r.actual, 0);
                  const att = plan ? actual / plan : 0;
                  const st = attToStatus(att, plan);
                  const col = STATUS_COLOR[st];
                  const active = reg.name === selectedRegion;
                  return (
                    <button
                      key={reg.name}
                      onClick={() => {
                        setSelectedRegion(reg.name);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition ${
                        active
                          ? "bg-accent-secondary/10 text-text-primary"
                          : "text-text-secondary hover:bg-film hover:text-text-primary"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: col }}
                        />
                        {reg.name}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {formatPct(att, 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* region KPI mini-strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniKpi label="Plan" value={formatNumber(summary.plan)} />
          <MiniKpi label="Actual" value={formatNumber(summary.actual)} />
          <MiniKpi
            label="Gap"
            value={formatNumber(summary.gap, { sign: true })}
            valueColor={gapColor}
            icon={
              <GapIcon
                className="h-3 w-3 shrink-0"
                style={{ color: gapColor }}
              />
            }
          />
          <MiniKpi
            label="Attainment"
            value={formatPct(summary.att)}
            valueColor={statusColor}
            delta={summary.deltaPts}
          />
        </div>
      </div>

      {/* 12-month trend */}
      <div className="glass-panel px-6 py-5">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <SectionLabel>12-Month Attainment Trend</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">
              Rolling monthly performance vs. target
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">
                12-mo avg
              </div>
              <div className="text-sm font-semibold tabular-nums text-text-secondary">
                {trendAvg.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">
                Current
              </div>
              <div
                className="text-xl font-semibold tabular-nums leading-none"
                style={{
                  color: statusColor,
                  fontFamily: "var(--font-display)",
                }}
              >
                {trendCurrent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trendData}
              margin={{ left: -8, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="attTrendFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={statusColor} stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor={statusColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#3B82F6"
                strokeOpacity={0.06}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[
                  (min: number) =>
                    Math.max(0, Math.floor((min - 10) / 10) * 10),
                  (max: number) => Math.ceil((max + 10) / 10) * 10,
                ]}
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "var(--hairline-strong)", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]?.value as number;
                  const tone =
                    v >= 95 ? "#10B981" : v >= 80 ? "#F59E0B" : "#EF4444";
                  return (
                    <div style={TOOLTIP_STYLE} className="px-3 py-2">
                      <div className="text-text-muted">{label}</div>
                      <div
                        className="mt-0.5 font-semibold tabular-nums"
                        style={{ color: tone }}
                      >
                        {v}% attainment
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={95}
                stroke="#10B981"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: "95% target",
                  position: "insideTopRight",
                  fill: "#10B981",
                  fontSize: 10,
                  opacity: 0.7,
                }}
              />
              <ReferenceLine
                y={80}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="att"
                stroke={statusColor}
                strokeWidth={2.5}
                fill="url(#attTrendFill2)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: statusColor,
                  stroke: "#fff",
                  strokeWidth: 1.5,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-5 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-5 border-t border-dashed border-status-onplan/70" />
            On Plan ≥95%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-5 border-t border-dashed border-status-watchlist/70" />
            Watchlist ≥80%
          </span>
        </div>
      </div>

      {/* plant & product breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownTable title="Plant Breakdown" rows={plants} colLabel="Plant" />
        <BreakdownTable
          title="Product Line Breakdown"
          rows={productLines}
          colLabel="Product Line"
        />
      </div>
    </div>
  );
}

/* ─── shared sub-components ──────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center gap-3 rounded-xl px-5 py-3 text-left transition-all duration-200 ${
        active
          ? "bg-accent-secondary/15 text-text-primary"
          : "text-text-secondary hover:bg-film hover:text-text-primary"
      }`}
      style={
        active
          ? {
              boxShadow:
                "inset 0 0 0 1px color-mix(in oklab, var(--accent-secondary) 30%, transparent)",
            }
          : undefined
      }
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-accent-secondary/20 text-accent-secondary"
            : "bg-film text-text-muted"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight">
          {label}
        </span>
        <span className="block text-[11px] text-text-muted">{sub}</span>
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
      {children}
    </span>
  );
}

function KpiTile({
  label,
  value,
  valueColor,
  sub,
  delta,
  deltaSuffix = "",
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  delta?: number;
  deltaSuffix?: string;
}) {
  const up = (delta ?? 0) >= 0;
  const DeltaIcon = delta === undefined ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const deltaColor = up ? "var(--status-onplan)" : "var(--status-behind)";
  return (
    <div className="glass-panel flex flex-col gap-1.5 px-5 py-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </span>
      <span
        className="text-2xl font-semibold tabular-nums leading-none tracking-tight"
        style={{
          color: valueColor ?? "var(--text-primary)",
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </span>
      {delta !== undefined && (
        <span
          className="flex items-center gap-1 text-[11px] font-medium tabular-nums"
          style={{ color: deltaColor }}
        >
          <DeltaIcon className="h-3 w-3" />
          {Math.abs(delta).toFixed(1)}
          {deltaSuffix}
        </span>
      )}
      {sub && (
        <span className="text-[10px] text-text-muted">{sub}</span>
      )}
    </div>
  );
}

function MiniKpi({
  label,
  value,
  valueColor,
  icon,
  delta,
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: ReactNode;
  delta?: number;
}) {
  const up = (delta ?? 0) >= 0;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;
  const deltaColor = up ? "var(--status-onplan)" : "var(--status-behind)";
  return (
    <div
      className="rounded-xl border border-hairline px-4 py-3"
      style={{ background: "var(--film)" }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {icon}
        <span
          className="text-lg font-semibold tabular-nums leading-none"
          style={{
            color: valueColor ?? "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {value}
        </span>
      </div>
      {delta !== undefined && (
        <span
          className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium"
          style={{ color: deltaColor }}
        >
          <DeltaIcon className="h-3 w-3" />
          {Math.abs(delta).toFixed(1)} pts
        </span>
      )}
    </div>
  );
}

function GlobalInsightBanner({
  records,
  overall,
}: {
  records: ReturnType<typeof currentMonthRecords>;
  overall: { gap: number; att: number; deltaPts: number };
}) {
  const insight = useMemo(() => {
    const map = new Map<string, { name: string; gap: number }>();
    for (const r of records) {
      const cur = map.get(r.region) ?? { name: r.region, gap: 0 };
      cur.gap += r.actual - r.plan;
      map.set(r.region, cur);
    }
    const behind = Array.from(map.values())
      .filter((d) => d.gap < 0)
      .sort((a, b) => a.gap - b.gap);
    const top = behind.slice(0, 2);
    const totalShort = behind.reduce((s, d) => s + d.gap, 0);
    const share = totalShort
      ? top.reduce((s, d) => s + d.gap, 0) / totalShort
      : 0;
    return { behind, top, totalShort, share };
  }, [records]);

  const positive = insight.behind.length === 0;
  const color = positive ? "var(--status-onplan)" : "var(--status-behind)";
  const Icon = positive ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className="glass-panel flex items-center gap-3 px-5 py-3.5"
      style={{
        borderColor: `color-mix(in oklab, ${color} 22%, var(--hairline))`,
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `color-mix(in oklab, ${color} 14%, transparent)`,
          color,
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-sm text-text-secondary">
        {positive ? (
          <>
            All regions are meeting or exceeding plan this month — company-wide
            attainment at{" "}
            <strong className="font-semibold text-text-primary">
              {formatPct(overall.att)}
            </strong>
            .
          </>
        ) : (
          <>
            <strong className="font-semibold text-text-primary">
              {insight.top.map((d) => d.name).join(" & ")}
            </strong>{" "}
            drive {Math.round(insight.share * 100)}% of the total shortfall (
            <span
              className="font-semibold"
              style={{ color: "var(--status-behind)" }}
            >
              {formatNumber(insight.totalShort, { sign: true })}
            </span>
            ) — use Country Drill-Down to investigate.
          </>
        )}
      </p>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  colLabel,
}: {
  title: string;
  rows: {
    name: string;
    plan: number;
    actual: number;
    gap: number;
    att: number;
    status: Status;
  }[];
  colLabel: string;
}) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-hairline px-6 py-4">
        <SectionLabel>{title}</SectionLabel>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline">
            {[colLabel, "Plan", "Actual", "Gap", "%"].map((h) => (
              <th
                key={h}
                className={`px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted ${
                  h === colLabel ? "text-left" : "text-right"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr
              key={p.name}
              className={`transition-colors hover:bg-film ${
                i !== rows.length - 1 ? "border-b border-hairline" : ""
              }`}
              style={
                i === 0 && p.gap < 0
                  ? {
                      background:
                        "color-mix(in oklab, var(--status-behind) 7%, transparent)",
                    }
                  : undefined
              }
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: STATUS_COLOR[p.status] }}
                  />
                  <span className="font-medium text-text-primary">{p.name}</span>
                  {i === 0 && p.gap < 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        background:
                          "color-mix(in oklab, var(--status-behind) 16%, transparent)",
                        color: "var(--status-behind)",
                      }}
                    >
                      Top drag
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3 text-right text-text-muted">
                {formatNumber(p.plan)}
              </td>
              <td className="px-5 py-3 text-right text-text-secondary">
                {formatNumber(p.actual)}
              </td>
              <td
                className="px-5 py-3 text-right text-xs font-medium"
                style={{
                  color:
                    p.gap < 0
                      ? "var(--status-behind)"
                      : "var(--status-onplan)",
                }}
              >
                {formatNumber(p.gap, { sign: true })}
              </td>
              <td className="px-5 py-3 text-right">
                <AttainmentBar att={p.att} status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttainmentBar({ att, status }: { att: number; status: Status }) {
  const color = STATUS_COLOR[status];
  const pct = Math.min(100, Math.round(att * 100));
  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className="text-[11px] font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-film-strong">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: color,
            boxShadow: `0 0 4px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function SegControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="inline-flex rounded-full border border-hairline bg-scrim p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs transition ${
            value === o.v
              ? "bg-accent-secondary/20 text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
