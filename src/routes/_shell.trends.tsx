import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { trendSeries, formatNumber } from "@/lib/mockData";
import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Area, ComposedChart,
} from "recharts";

export const Route = createFileRoute("/_shell/trends")({
  head: () => ({ meta: [{ title: "Trend & Forecast — OCC" }, { name: "description", content: "Execution trends with forecast overlay and month-end projections." }] }),
  component: TrendPage,
});

function TrendPage() {
  const [range, setRange] = useState<"Q" | "H" | "Y">("Y");
  const raw = useMemo(() => trendSeries(), []);
  const data = range === "Q" ? raw.slice(-3) : range === "H" ? raw.slice(-6) : raw;

  return (
    <div>
      <PageHeader
        eyebrow="Trend & Forecast"
        title="Execution Trend Analytics"
        subtitle="Historical performance with model-driven forecast."
        actions={
          <div className="inline-flex rounded-full border border-border-subtle bg-black/30 p-1 text-xs">
            {(["Q", "H", "Y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 transition ${range === r ? "bg-accent-secondary/20 text-text-primary" : "text-text-secondary hover:text-text-primary"}`}
              >
                {r === "Q" ? "Quarter" : r === "H" ? "Half" : "Year"}
              </button>
            ))}
          </div>
        }
      />

      <div className="glass-panel p-6">
        <div className="h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3B82F6" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#FFF", fontSize: 12 }} formatter={(v: number) => formatNumber(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
              <Area type="monotone" dataKey="actual" name="Actual" stroke="#3B82F6" fill="url(#actGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="plan" name="Plan" stroke="#94A3B8" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="gap" name="Gap" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <ForecastTile label="Recovery Velocity" value="+8.4%" hint="per week required" />
        <ForecastTile label="Month-End Projection" value={formatNumber(1_240_000)} hint="units" />
        <ForecastTile label="Target Probability" value="72%" hint="model confidence" />
        <ForecastTile label="Forecast Confidence" value="High" hint="last 4 wks stable" />
      </div>
    </div>
  );
}

function ForecastTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass-card hover-lift p-5">
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="kpi-number mt-2 text-3xl">{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{hint}</div>
    </div>
  );
}