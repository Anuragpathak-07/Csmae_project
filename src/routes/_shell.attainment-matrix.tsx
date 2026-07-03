import { createFileRoute } from "@tanstack/react-router";
import { ALL_RECORDS, MONTH_LABELS, REGIONS, formatNumber, formatPct, type Status } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
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
  background: "rgba(10,15,31,0.97)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  color: "#FFFFFF",
  fontSize: 11,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
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

  const summary = useMemo(() => {
    const plan   = currentRecs.reduce((s, r) => s + r.plan, 0);
    const actual = currentRecs.reduce((s, r) => s + r.actual, 0);
    const gap    = actual - plan;
    const att    = plan ? actual / plan : 0;
    return { plan, actual, gap, att, status: attToStatus(att, plan) };
  }, [currentRecs]);

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

  return (
    <div className="flex flex-col gap-4" onClick={() => dropdownOpen && setDropdownOpen(false)}>

      {/* ── Header strip ─────────────────────────────────────────── */}
      <div
        className="glass-panel flex flex-wrap items-center justify-between gap-6 px-7 py-5"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
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
            className="flex min-w-[200px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-text-primary transition hover:border-accent-secondary/40 hover:bg-white/[0.08]"
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
              className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-white/10 py-1"
              style={{ background: "rgba(10,15,31,0.97)", backdropFilter: "blur(24px)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
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
                      active ? "bg-accent-secondary/10 text-text-primary" : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
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
        />
        <KpiTile
          label="Attainment"
          value={formatPct(summary.att)}
          valueColor={statusColor}
          sub={summary.status}
          subColor={statusColor}
        />
      </div>

      {/* ── 12-month trend ───────────────────────────────────────── */}
      <div className="glass-panel px-6 py-5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <SectionLabel>12-Month Attainment Trend</SectionLabel>
        <div className="mt-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} barSize={22} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 130]}
                tick={{ fill: "#64748B", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={36}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "rgba(59,130,246,0.05)" }}
                formatter={(v: number) => [`${v}%`, "Attainment"]}
              />
              <ReferenceLine y={95} stroke="#10B981" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={80} stroke="#F59E0B" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Bar
                dataKey="att"
                radius={[4, 4, 0, 0]}
                fill="#3B82F6"
                opacity={0.75}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-5 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 bg-status-onplan opacity-60" />On Plan ≥95%</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 bg-status-watchlist opacity-60" />Watchlist ≥80%</span>
        </div>
      </div>

      {/* ── Plant & Product breakdown ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Plants */}
        <div className="glass-panel overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="border-b border-white/[0.05] px-6 py-4">
            <SectionLabel>Plant Breakdown</SectionLabel>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
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
                  className={`transition-colors hover:bg-white/[0.025] ${i !== plants.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[p.status] }}
                      />
                      <span className="font-medium text-text-primary">{p.name}</span>
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
        <div className="glass-panel overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="border-b border-white/[0.05] px-6 py-4">
            <SectionLabel>Product Line Breakdown</SectionLabel>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
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
                  className={`transition-colors hover:bg-white/[0.025] ${i !== productLines.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[p.status] }}
                      />
                      <span className="font-medium text-text-primary">{p.name}</span>
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
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: React.ReactNode;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div
      className="glass-panel flex flex-col gap-1.5 px-5 py-4"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
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
      {sub && (
        <span className="text-[10px] font-medium" style={{ color: subColor ?? "var(--text-muted)" }}>
          {sub}
        </span>
      )}
    </div>
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
      <div className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: color, boxShadow: `0 0 4px ${color}60` }}
        />
      </div>
    </div>
  );
}
