import { createFileRoute } from "@tanstack/react-router";
import { ALL_RECORDS, MONTH_LABELS, REGIONS, formatNumber, formatPct, type Status } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp, Minus, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/_shell/attainment-matrix")({
  head: () => ({
    meta: [
      { title: "Country Performance — Operations Command Center" },
      { name: "description", content: "Detailed metrics by country — plans, actuals, gaps, and plant-level breakdown." },
    ],
  }),
  component: CountryPerformance,
});

/* ─── helpers ────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<Status, string> = {
  "Behind Plan": "#EF4444",
  Watchlist:     "#F59E0B",
  "On Plan":     "#10B981",
  "Above Plan":  "#10B981",
  "No Plan":     "#475569",
};

function attToStatus(att: number, plan: number): Status {
  if (plan === 0) return "No Plan";
  if (att >= 1.0)  return "Above Plan";
  if (att >= 0.95) return "On Plan";
  if (att >= 0.8)  return "Watchlist";
  return "Behind Plan";
}

function monthLabel(m: string) {
  const [, mm] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[parseInt(mm, 10) - 1] ?? mm;
}

const TOOLTIP_STYLE = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--hairline)",
  borderRadius: 10,
  color: "var(--text-primary)",
  fontSize: 11,
  boxShadow: "var(--glass-shadow)",
};

/* ─── component ─────────────────────────────────────────────────── */

function CountryPerformance() {
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].name);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* current month summary for selected region */
  const CURRENT_MONTH = MONTH_LABELS[MONTH_LABELS.length - 1];

  const currentRecs = useMemo(
    () => ALL_RECORDS.filter((r) => r.region === selectedRegion && r.reportMonth === CURRENT_MONTH),
    [selectedRegion],
  );

  const PREV_MONTH = MONTH_LABELS[MONTH_LABELS.length - 2];

  const summary = useMemo(() => {
    const plan   = currentRecs.reduce((s, r) => s + r.plan, 0);
    const actual = currentRecs.reduce((s, r) => s + r.actual, 0);
    const gap    = actual - plan;
    const att    = plan ? actual / plan : 0;

    const prevRecs = ALL_RECORDS.filter((r) => r.region === selectedRegion && r.reportMonth === PREV_MONTH);
    const prevPlan   = prevRecs.reduce((s, r) => s + r.plan, 0);
    const prevActual = prevRecs.reduce((s, r) => s + r.actual, 0);
    const prevAtt    = prevPlan ? prevActual / prevPlan : 0;

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

  /* 12-month trend for selected region */
  const trendData = useMemo(
    () =>
      MONTH_LABELS.map((m) => {
        const recs   = ALL_RECORDS.filter((r) => r.region === selectedRegion && r.reportMonth === m);
        const plan   = recs.reduce((s, r) => s + r.plan, 0);
        const actual = recs.reduce((s, r) => s + r.actual, 0);
        const att    = plan ? (actual / plan) * 100 : 0;
        return { month: monthLabel(m), att: parseFloat(att.toFixed(1)), plan, actual };
      }),
    [selectedRegion],
  );

  /* plant-level breakdown for current month */
  const plants = useMemo(() => {
    const map = new Map<string, { plan: number; actual: number }>();
    for (const r of currentRecs) {
      const cur = map.get(r.plant) ?? { plan: 0, actual: 0 };
      cur.plan   += r.plan;
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

  /* product-line breakdown */
  const productLines = useMemo(() => {
    const map = new Map<string, { plan: number; actual: number }>();
    for (const r of currentRecs) {
      const cur = map.get(r.productLine) ?? { plan: 0, actual: 0 };
      cur.plan   += r.plan;
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

  const GapIcon = summary.gap > 0 ? TrendingUp : summary.gap < 0 ? TrendingDown : Minus;
  const gapColor = summary.gap >= 0 ? "var(--status-onplan)" : "var(--status-behind)";
  const statusColor = STATUS_COLOR[summary.status];

  /* worst offenders + trend stats for the insight banner */
  const worstPlant = plants[0];
  const worstLine = productLines[0];
  const trendAvg = trendData.reduce((s, t) => s + t.att, 0) / (trendData.length || 1);
  const trendCurrent = trendData[trendData.length - 1]?.att ?? 0;
  const improving = summary.deltaPts >= 0;

  return (
    <div className="flex flex-col gap-4" onClick={() => dropdownOpen && setDropdownOpen(false)}>

      {/* ── Header strip ─────────────────────────────────────────── */}
      <div
        className="glass-panel flex flex-wrap items-center justify-between gap-6 px-7 py-5"
      >
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-secondary">
            Country wise Performance
          </div>
          <h1 className="text-display text-xl font-semibold text-text-primary">
            Regional Metrics · May 2026
          </h1>
        </div>

        {/* Country selector */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex min-w-[200px] items-center justify-between gap-3 rounded-xl border border-hairline bg-film px-4 py-3 text-sm font-medium text-text-primary transition hover:border-accent-secondary/40 hover:bg-film-strong"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
              />
              {selectedRegion}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-text-muted transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-hairline py-1"
              style={{ background: "var(--dropdown-bg)", backdropFilter: "blur(24px)", boxShadow: "var(--glass-shadow)" }}
            >
              {REGIONS.map((reg) => {
                const recs  = ALL_RECORDS.filter((r) => r.region === reg.name && r.reportMonth === CURRENT_MONTH);
                const plan  = recs.reduce((s, r) => s + r.plan, 0);
                const actual = recs.reduce((s, r) => s + r.actual, 0);
                const att   = plan ? actual / plan : 0;
                const st    = attToStatus(att, plan);
                const col   = STATUS_COLOR[st];
                const active = reg.name === selectedRegion;
                return (
                  <button
                    key={reg.name}
                    onClick={() => { setSelectedRegion(reg.name); setDropdownOpen(false); }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition ${
                      active ? "bg-accent-secondary/10 text-text-primary" : "text-text-secondary hover:bg-film hover:text-text-primary"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: col }} />
                      {reg.name}
                    </span>
                    <span className="text-[11px] text-text-muted">{formatPct(att, 0)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Plan" value={formatNumber(summary.plan)} />
        <KpiTile label="Actual" value={formatNumber(summary.actual)} />
        <KpiTile
          label="Gap"
          value={formatNumber(summary.gap, { sign: true })}
          valueColor={gapColor}
          icon={<GapIcon className="h-3.5 w-3.5" style={{ color: gapColor }} />}
          sub={`${formatPct(summary.gapPct)} of plan`}
        />
        <KpiTile
          label="Attainment"
          value={formatPct(summary.att)}
          valueColor={statusColor}
          delta={summary.deltaPts}
          deltaSuffix=" pts MoM"
        />
      </div>

      {/* ── Insight banner ───────────────────────────────────────── */}
      <InsightBanner
        positive={summary.status === "On Plan" || summary.status === "Above Plan"}
        text={
          <>
            {selectedRegion} is at{" "}
            <strong className="font-semibold text-text-primary">{formatPct(summary.att)}</strong> attainment —{" "}
            <span className="font-semibold" style={{ color: improving ? "var(--status-onplan)" : "var(--status-behind)" }}>
              {improving ? "up" : "down"} {Math.abs(summary.deltaPts).toFixed(1)} pts
            </span>{" "}
            vs last month.
            {worstPlant && worstPlant.gap < 0 && (
              <>
                {" "}Biggest drags:{" "}
                <strong className="font-semibold text-text-primary">{worstPlant.name}</strong> (
                <span style={{ color: "var(--status-behind)" }}>{formatNumber(worstPlant.gap, { sign: true })}</span>)
                {worstLine && worstLine.gap < 0 && (
                  <> and <strong className="font-semibold text-text-primary">{worstLine.name}</strong></>
                )}
                .
              </>
            )}
          </>
        }
      />

      {/* ── 12-month trend ───────────────────────────────────────── */}
        <div className="glass-panel px-6 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <SectionLabel>12-Month Attainment Trend</SectionLabel>
            <p className="mt-1 text-xs text-text-muted">Rolling monthly performance vs. target</p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">12-mo avg</div>
              <div className="text-sm font-semibold tabular-nums text-text-secondary">{trendAvg.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Current</div>
              <div className="text-lg font-semibold tabular-nums leading-none" style={{ color: statusColor, fontFamily: "var(--font-display)" }}>
                {trendCurrent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="attTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={statusColor} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3B82F6" strokeOpacity={0.06} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[(min: number) => Math.max(0, Math.floor((min - 10) / 10) * 10), (max: number) => Math.ceil((max + 10) / 10) * 10]}
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
                  const tone = v >= 95 ? "#10B981" : v >= 80 ? "#F59E0B" : "#EF4444";
                  return (
                    <div style={TOOLTIP_STYLE} className="px-3 py-2">
                      <div className="text-text-muted">{label}</div>
                      <div className="mt-0.5 font-semibold tabular-nums" style={{ color: tone }}>{v}% attainment</div>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={95} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "95% target", position: "insideTopRight", fill: "#10B981", fontSize: 10, opacity: 0.7 }} />
              <ReferenceLine y={80} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.35} />
              <Area
                type="monotone"
                dataKey="att"
                stroke={statusColor}
                strokeWidth={2}
                fill="url(#attTrendFill)"
                dot={false}
                activeDot={{ r: 4, fill: statusColor, stroke: "#fff", strokeWidth: 1.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-5 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 border-t border-dashed border-status-onplan/70" />On Plan ≥95%</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 border-t border-dashed border-status-watchlist/70" />Watchlist ≥80%</span>
        </div>
      </div>

      {/* ── Plant & Product breakdown ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Plants */}
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <SectionLabel>Plant Breakdown</SectionLabel>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {["Plant", "Plan", "Actual", "Gap", "%"].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted ${h === "Plant" ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plants.map((p, i) => (
                <tr
                  key={p.name}
                  className={`transition-colors hover:bg-film ${i !== plants.length - 1 ? "border-b border-hairline" : ""}`}
                  style={i === 0 && p.gap < 0 ? { background: "color-mix(in oklab, var(--status-behind) 7%, transparent)" } : undefined}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[p.status] }}
                      />
                      <span className="font-medium text-text-primary">{p.name}</span>
                      {i === 0 && p.gap < 0 && <TopDragTag />}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">{formatNumber(p.plan)}</td>
                  <td className="px-5 py-3 text-right text-text-secondary">{formatNumber(p.actual)}</td>
                  <td
                    className="px-5 py-3 text-right text-xs font-medium"
                    style={{ color: p.gap < 0 ? "var(--status-behind)" : "var(--status-onplan)" }}
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

        {/* Product lines */}
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-hairline px-6 py-4">
            <SectionLabel>Product Line Breakdown</SectionLabel>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {["Product Line", "Plan", "Actual", "Gap", "%"].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted ${h === "Product Line" ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productLines.map((p, i) => (
                <tr
                  key={p.name}
                  className={`transition-colors hover:bg-film ${i !== productLines.length - 1 ? "border-b border-hairline" : ""}`}
                  style={i === 0 && p.gap < 0 ? { background: "color-mix(in oklab, var(--status-behind) 7%, transparent)" } : undefined}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[p.status] }}
                      />
                      <span className="font-medium text-text-primary">{p.name}</span>
                      {i === 0 && p.gap < 0 && <TopDragTag />}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">{formatNumber(p.plan)}</td>
                  <td className="px-5 py-3 text-right text-text-secondary">{formatNumber(p.actual)}</td>
                  <td
                    className="px-5 py-3 text-right text-xs font-medium"
                    style={{ color: p.gap < 0 ? "var(--status-behind)" : "var(--status-onplan)" }}
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
      </div>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
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
  icon,
  sub,
  subColor,
  delta,
  deltaSuffix = "",
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: React.ReactNode;
  sub?: string;
  subColor?: string;
  delta?: number;
  deltaSuffix?: string;
}) {
  const up = (delta ?? 0) >= 0;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;
  const deltaColor = up ? "var(--status-onplan)" : "var(--status-behind)";
  return (
    <div
      className="glass-panel flex flex-col gap-1.5 px-5 py-4"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon}
        <span
          className="text-2xl font-semibold tabular-nums leading-none tracking-tight"
          style={{ color: valueColor ?? "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          {value}
        </span>
      </div>
      {delta !== undefined && (
        <span className="flex items-center gap-1 text-[11px] font-medium tabular-nums" style={{ color: deltaColor }}>
          <DeltaIcon className="h-3 w-3" />
          {Math.abs(delta).toFixed(1)}{deltaSuffix}
        </span>
      )}
      {sub && (
        <span className="text-[10px] font-medium" style={{ color: subColor ?? "var(--text-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function InsightBanner({ text, positive }: { text: React.ReactNode; positive: boolean }) {
  const color = positive ? "var(--status-onplan)" : "var(--status-behind)";
  const Icon = positive ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className="glass-panel flex items-center gap-3 px-5 py-3.5"
      style={{ borderColor: `color-mix(in oklab, ${color} 22%, var(--hairline))` }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-sm text-text-secondary">{text}</p>
    </div>
  );
}

function TopDragTag() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{ background: "color-mix(in oklab, var(--status-behind) 16%, transparent)", color: "var(--status-behind)" }}
    >
      Top drag
    </span>
  );
}

function AttainmentBar({ att, status }: { att: number; status: Status }) {
  const color = STATUS_COLOR[status];
  const pct = Math.min(100, Math.round(att * 100));
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
        {pct}%
      </span>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-film-strong">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: color, boxShadow: `0 0 4px ${color}60` }}
        />
      </div>
    </div>
  );
}
