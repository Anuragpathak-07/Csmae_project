import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { ALL_RECORDS, formatNumber } from "@/lib/mockData";
import { StatusChip } from "@/components/ui/status-chip";
import { useMemo, useState } from "react";
import { AlertTriangle, Target, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_shell/gap-recovery")({
  head: () => ({ meta: [{ title: "Gap Recovery War Room — OCC" }, { name: "description", content: "Ranked recovery opportunities by business impact and risk." }] }),
  component: WarRoom,
});

function riskLabel(gap: number, plan: number) {
  const ratio = plan ? gap / plan : 0;
  if (ratio <= -0.4) return "Critical";
  if (ratio <= -0.15) return "High";
  if (ratio < 0) return "Medium";
  return "Low";
}

const AI_LINES = [
  "Accelerate Q3 output by 12% via secondary supplier route.",
  "Reallocate 3 shifts from Nagoya to Osaka to close 8% of gap.",
  "Defer non-critical maintenance window; unlock 1,200 units.",
  "Escalate Middle East hub logistics review — 4 shipments blocked.",
  "Rebalance Detroit inventory to reduce inbound wait times.",
];

function WarRoom() {
  const [risk, setRisk] = useState<string>("All");

  const items = useMemo(() => {
    return ALL_RECORDS.filter((r) => r.gap < 0)
      .map((r) => ({ r, risk: riskLabel(r.gap, r.plan) }))
      .filter((x) => risk === "All" || x.risk === risk)
      .sort((a, b) => a.r.gap - b.r.gap)
      .slice(0, 8)
      .map((x, i) => ({
        ...x,
        rank: i + 1,
        score: Math.round(100 - i * 8 - Math.random() * 4),
        ai: AI_LINES[i % AI_LINES.length],
      }));
  }, [risk]);

  return (
    <div>
      <PageHeader eyebrow="Gap Recovery" title="War Room" subtitle="Highest business-impact recoveries ranked by score. Focus on the top 3–6 to move the number." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["All", "Critical", "High", "Medium"].map((r) => (
          <button
            key={r}
            onClick={() => setRisk(r)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              risk === r ? "border-accent-secondary/60 bg-accent-secondary/15 text-text-primary" : "border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const critical = item.risk === "Critical";
          return (
            <div
              key={item.r.id}
              className="glass-card hover-lift flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
              style={
                critical
                  ? { boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.3), 0 0 60px -20px rgba(239,68,68,0.35)" }
                  : undefined
              }
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-semibold"
                style={{
                  background: critical ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
                  color: critical ? "var(--status-behind)" : "var(--accent-secondary)",
                }}
              >
                #{item.rank}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <span className="text-display truncate text-base font-semibold text-text-primary">
                    {item.r.region} · {item.r.plant} — {item.r.metric}
                  </span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      color: critical ? "var(--status-behind)" : "var(--status-watchlist)",
                      borderColor: critical ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)",
                      background: critical ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.08)",
                    }}
                  >
                    {item.risk}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Sparkles className="h-3.5 w-3.5 text-accent-secondary" /> {item.ai}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                <Metric icon={<Target className="h-3.5 w-3.5" />} label="Recovery Score" value={String(item.score)} />
                <Metric icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Business Impact" value={formatNumber(item.r.gap, { sign: true })} tone="neg" />
                <div className="hidden sm:block">
                  <StatusChip status={item.r.status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "neg" }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
        {icon} {label}
      </div>
      <div className="kpi-number text-xl" style={{ color: tone === "neg" ? "var(--status-behind)" : undefined }}>
        {value}
      </div>
    </div>
  );
}