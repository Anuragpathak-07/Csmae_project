import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { currentMonthRecords, formatNumber, formatPct } from "@/lib/mockData";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, LabelList,
  ComposedChart, Line,
} from "recharts";
import { StatusChip } from "@/components/ui/status-chip";
import type { Status } from "@/lib/mockData";

export const Route = createFileRoute("/_shell/plan-vs-actual")({
  head: () => ({ meta: [{ title: "Plan vs Actual — OCC" }, { name: "description", content: "Plan vs actual command center with dimension switching and drill-down." }] }),
  component: PvAPage,
});

const DIMS = ["region", "business", "productLine", "plant"] as const;
type Dim = (typeof DIMS)[number];
const DIM_LABEL: Record<Dim, string> = { region: "Region", business: "Business", productLine: "Product Line", plant: "Plant" };

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
      .sort((a, b) => b.plan - a.plan);
  }, [records, dim]);

  return (
    <div>
      <PageHeader
        eyebrow="Plan vs Actual"
        title="Execution Command Center"
        subtitle="Compare plan, actual, gap, and attainment across any dimension. Click a bar to drill in."
        actions={
          <div className="flex items-center gap-2">
            <SegControl
              value={mode}
              onChange={(v) => setMode(v as "grouped" | "variance")}
              options={[{ v: "grouped", l: "Grouped Bars" }, { v: "variance", l: "Variance" }]}
            />
          </div>
        }
      />

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
        <button
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>

      <div className="glass-panel p-6">
        <div className="h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "grouped" ? (
              <BarChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
                <CartesianGrid stroke="#3B82F6" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,0.06)" }} formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                <Bar dataKey="plan" name="Plan" fill="#3B82F6" opacity={0.4} radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <ComposedChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
                <CartesianGrid stroke="#3B82F6" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,0.06)" }} formatter={(v: number) => formatNumber(v)} />
                <Bar dataKey="gap" name="Gap" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="gap" position="top" fill="#94A3B8" fontSize={10} formatter={(v: number) => formatNumber(v, { sign: true })} />
                </Bar>
                <Line type="monotone" dataKey="plan" stroke="#94A3B8" strokeWidth={1.5} dot={false} name="Plan baseline" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
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
                <tr key={row.name} className="border-b border-border-subtle/50 last:border-0 hover:bg-white/[0.02]">
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
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#FFFFFF",
  fontSize: 12,
};

function SegControl({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="inline-flex rounded-full border border-border-subtle bg-black/30 p-1">
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