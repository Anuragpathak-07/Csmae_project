import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import {
  ALL_RECORDS,
  CURRENT_MONTH,
  MONTH_LABELS,
  currentMonthRecords,
  formatNumber,
  formatPct,
} from "@/lib/mockData";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
  ComposedChart, ReferenceLine,
} from "recharts";
import { StatusChip } from "@/components/ui/status-chip";
import { ArrowDownRight, ArrowUpRight, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Status } from "@/lib/mockData";

export const Route = createFileRoute("/_shell/plan-vs-actual")({
  head: () => ({ meta: [{ title: "Plan vs Actual — OCC" }, { name: "description", content: "Plan vs actual command center with dimension switching and drill-down." }] }),
  component: PvAPage,
});

const DIMS = ["region", "business", "productLine", "plant"] as const;
type Dim = (typeof DIMS)[number];
const DIM_LABEL: Record<Dim, string> = { region: "Region", business: "Business", productLine: "Product Line", plant: "Plant" };

/* Hex colors for recharts (CSS vars don't resolve in SVG fill attributes). */
const STATUS_HEX: Record<Status, string> = {
  "Behind Plan": "#EF4444",
  Watchlist:     "#F59E0B",
  "On Plan":     "#10B981",
  "Above Plan":  "#10B981",
  "No Plan":     "#475569",
};

function statusOf(att: number): Status {
  if (att >= 1) return "Above Plan";
  if (att >= 0.95) return "On Plan";
  if (att >= 0.8) return "Watchlist";
  return "Behind Plan";
}

function PvAPage() {
  const records = currentMonthRecords();
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
      .map((r) => ({ ...r, gap: r.actual - r.plan, attainment: r.plan ? r.actual / r.plan : 0 }))
      .sort(sort === "gap" ? (a, b) => a.gap - b.gap : (a, b) => b.plan - a.plan);
  }, [records, dim, sort]);

  /* Company-wide totals + month-over-month attainment shift. */
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

  const behindCount = data.filter((d) => d.attainment < 0.8).length;

  /* Insight: which segments drive the shortfall. */
  const insight = useMemo(() => {
    const behind = data.filter((d) => d.gap < 0).sort((a, b) => a.gap - b.gap);
    const totalShort = behind.reduce((s, d) => s + d.gap, 0);
    const top = behind.slice(0, 2);
    const share = totalShort ? top.reduce((s, d) => s + d.gap, 0) / totalShort : 0;
    return { behind, top, totalShort, share };
  }, [data]);

  return (
    <div>
      <PageHeader
        eyebrow="Plan vs Actual"
        title="Execution Command Center"
        subtitle="Compare plan, actual, gap, and attainment across any dimension. Click a bar to drill in."
        actions={
          <SegControl
            value={mode}
            onChange={(v) => setMode(v as "grouped" | "variance")}
            options={[{ v: "grouped", l: "Plan vs Actual" }, { v: "variance", l: "Gap View" }]}
          />
        }
      />

      {/* ── KPI band ─────────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Total Plan" value={formatNumber(overall.plan)} />
        <KpiTile label="Total Actual" value={formatNumber(overall.actual)} />
        <KpiTile
          label="Overall Attainment"
          value={formatPct(overall.att)}
          valueColor={STATUS_HEX[statusOf(overall.att)]}
          delta={overall.deltaPts}
          deltaSuffix=" pts MoM"
        />
        <KpiTile
          label={`${DIM_LABEL[dim]}s Behind`}
          value={`${behindCount}`}
          sub={`of ${data.length} · <80% attainment`}
          valueColor={behindCount > 0 ? STATUS_HEX["Behind Plan"] : STATUS_HEX["On Plan"]}
        />
      </div>

      {/* ── Insight banner ───────────────────────────────────────── */}
      <InsightBanner
        positive={insight.behind.length === 0}
        text={
          insight.behind.length === 0 ? (
            <>All {DIM_LABEL[dim].toLowerCase()}s are meeting or exceeding plan this month — no active shortfall.</>
          ) : (
            <>
              <strong className="font-semibold text-text-primary">
                {insight.top.map((d) => d.name).join(" & ")}
              </strong>{" "}
              drive {Math.round(insight.share * 100)}% of the total shortfall (
              <span className="font-semibold" style={{ color: STATUS_HEX["Behind Plan"] }}>
                {formatNumber(insight.totalShort, { sign: true })}
              </span>
              ) — prioritize recovery here.
            </>
          )
        }
      />

      {/* ── Controls row ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DIMS.map((d) => (
          <button
            key={d}
            onClick={() => setDim(d)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              dim === d
                ? "border-accent-secondary/60 bg-accent-secondary/15 text-text-primary"
                : "border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
          >
            {DIM_LABEL[d]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <SegControl
            value={sort}
            onChange={(v) => setSort(v as "gap" | "size")}
            options={[{ v: "gap", l: "Worst first" }, { v: "size", l: "By size" }]}
          />
          <button
            onClick={() => setShowTable((v) => !v)}
            className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            {showTable ? "Hide table" : "View as table"}
          </button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "grouped" ? (
              <BarChart data={data} margin={{ left: 8, right: 16, top: 24, bottom: 8 }}>
                <CartesianGrid stroke="#3B82F6" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(59,130,246,0.06)" }}
                  formatter={(v: number, n: string) => [formatNumber(v), n]}
                />
                <Bar dataKey="plan" name="Plan (target)" fill="#475569" opacity={0.5} radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={STATUS_HEX[statusOf(d.attainment)]} />
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
              <ComposedChart data={data} margin={{ left: 8, right: 16, top: 24, bottom: 8 }}>
                <CartesianGrid stroke="#3B82F6" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,0.06)" }} formatter={(v: number) => [formatNumber(v, { sign: true }), "Gap vs plan"]} />
                <ReferenceLine y={0} stroke="#94A3B8" strokeOpacity={0.5} />
                <Bar dataKey="gap" name="Gap vs plan" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.gap >= 0 ? STATUS_HEX["On Plan"] : STATUS_HEX["Behind Plan"]} />
                  ))}
                  <LabelList dataKey="gap" position="top" fill="#94A3B8" fontSize={10} formatter={(v: number) => formatNumber(v, { sign: true })} />
                </Bar>
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-text-muted">
          {mode === "grouped" ? (
            <>
              <LegendSwatch color="#475569" label="Plan (target)" />
              <span className="h-3 w-px bg-hairline-strong" />
              <LegendSwatch color={STATUS_HEX["On Plan"]} label="On plan ≥95%" />
              <LegendSwatch color={STATUS_HEX["Watchlist"]} label="Watchlist ≥80%" />
              <LegendSwatch color={STATUS_HEX["Behind Plan"]} label="Behind <80%" />
            </>
          ) : (
            <>
              <LegendSwatch color={STATUS_HEX["On Plan"]} label="Above plan" />
              <LegendSwatch color={STATUS_HEX["Behind Plan"]} label="Below plan" />
            </>
          )}
        </div>
      </div>

      {showTable && (
        <div className="glass-panel mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[11px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">{DIM_LABEL[dim]}</th>
                <th className="px-4 py-3 text-right">Plan</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Gap</th>
                <th className="px-4 py-3 text-right">Attainment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.name} className="border-b border-border-subtle/50 last:border-0 hover:bg-film">
                  <td className="px-4 py-3 text-text-primary">{row.name}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{formatNumber(row.plan)}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{formatNumber(row.actual)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: row.gap < 0 ? "var(--status-behind)" : "var(--status-onplan)" }}>
                    {formatNumber(row.gap, { sign: true })}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">{formatPct(row.attainment)}</td>
                  <td className="px-4 py-3"><StatusChip status={statusOf(row.attainment)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  color: "var(--text-primary)",
  fontSize: 12,
};

/* ─── sub-components ─────────────────────────────────────────────── */

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
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <span
        className="text-2xl font-semibold tabular-nums leading-none tracking-tight"
        style={{ color: valueColor ?? "var(--text-primary)", fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
      {delta !== undefined && (
        <span className="flex items-center gap-1 text-[11px] font-medium tabular-nums" style={{ color: deltaColor }}>
          <DeltaIcon className="h-3 w-3" />
          {Math.abs(delta).toFixed(1)}{deltaSuffix}
        </span>
      )}
      {sub && <span className="text-[11px] text-text-muted">{sub}</span>}
    </div>
  );
}

function InsightBanner({ text, positive }: { text: ReactNode; positive: boolean }) {
  const color = positive ? "var(--status-onplan)" : "var(--status-behind)";
  const Icon = positive ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className="glass-panel mb-4 flex items-center gap-3 px-5 py-3.5"
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

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function SegControl({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="inline-flex rounded-full border border-border-subtle bg-scrim p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs transition ${
            value === o.v ? "bg-accent-secondary/20 text-text-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
