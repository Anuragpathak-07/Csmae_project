import { createFileRoute } from "@tanstack/react-router";
import { ALL_RECORDS, formatNumber, type Status } from "@/lib/mockData";
import { Sparkles, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_shell/gap-recovery")({
  head: () => ({
    meta: [
      { title: "Gap Recovery — Operations Command Center" },
      { name: "description", content: "Ranked recovery opportunities by business impact." },
    ],
  }),
  component: GapRecovery,
});

/* ─── helpers ────────────────────────────────────────────────────── */

function riskLevel(gap: number, plan: number): "Critical" | "High" | "Medium" {
  const ratio = plan ? gap / plan : 0;
  if (ratio <= -0.4) return "Critical";
  if (ratio <= -0.15) return "High";
  return "Medium";
}

const RISK_STYLE = {
  Critical: { color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)" },
  High:     { color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  Medium:   { color: "#3B82F6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)" },
};

const STATUS_DOT: Record<Status, string> = {
  "Behind Plan": "#EF4444",
  Watchlist:     "#F59E0B",
  "On Plan":     "#10B981",
  "Above Plan":  "#10B981",
  "No Plan":     "#475569",
};

const AI_LINES = [
  "Accelerate Q3 output via secondary supplier route — estimated +12% capacity.",
  "Reallocate 3 shifts from Nagoya to Osaka to close ~8% of the gap.",
  "Defer non-critical maintenance window to unlock approx. 1,200 units.",
  "Escalate Middle East hub logistics review — 4 shipments currently blocked.",
  "Rebalance Detroit inventory to reduce inbound wait times and free capacity.",
  "Engage spot-buy approval for 500 units; cover 40% of current shortfall.",
  "Accelerate Chennai sub-assembly line; recovery window closes in 6 days.",
  "Pull-in scheduled shipment from Perth; reduces gap by estimated 18%.",
];

const RISK_FILTERS = ["All", "Critical", "High", "Medium"] as const;
type RiskFilter = (typeof RISK_FILTERS)[number];

/* ─── component ─────────────────────────────────────────────────── */

function GapRecovery() {
  const [activeFilter, setActiveFilter] = useState<RiskFilter>("All");

  const items = useMemo(() => {
    return ALL_RECORDS.filter((r) => r.gap < 0)
      .map((r) => ({ r, risk: riskLevel(r.gap, r.plan) }))
      .filter((x) => activeFilter === "All" || x.risk === activeFilter)
      .sort((a, b) => a.r.gap - b.r.gap)
      .slice(0, 8)
      .map((x, i) => ({
        ...x,
        rank: i + 1,
        score: 98 - i * 9,
        ai: AI_LINES[i % AI_LINES.length],
      }));
  }, [activeFilter]);

  /* summary stats */
  const allGapItems = ALL_RECORDS.filter((r) => r.gap < 0).map((r) => ({
    r,
    risk: riskLevel(r.gap, r.plan),
  }));
  const totalGap = allGapItems.reduce((s, x) => s + x.r.gap, 0);
  const criticalCount = allGapItems.filter((x) => x.risk === "Critical").length;
  const highCount     = allGapItems.filter((x) => x.risk === "High").length;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header strip ─────────────────────────────────────────── */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-6 px-7 py-5">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-secondary">
            Gap Recovery
          </div>
          <h1 className="text-display text-xl font-semibold text-text-primary">
            Recovery Priorities · May 2026
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <Stat label="Total Gap" value={formatNumber(totalGap, { sign: true })} color="var(--status-behind)" />
          <div className="h-7 w-px bg-hairline-strong" />
          <Stat label="Critical" value={String(criticalCount)} color={RISK_STYLE.Critical.color} />
          <Stat label="High"     value={String(highCount)}     color={RISK_STYLE.High.color} />
          <Stat label="Medium"   value={String(allGapItems.filter((x) => x.risk === "Medium").length)} color={RISK_STYLE.Medium.color} />
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {RISK_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition ${
              activeFilter === f
                ? "border-accent-secondary/50 bg-accent-secondary/12 text-text-primary"
                : "border-border-subtle text-text-muted hover:border-hairline-strong hover:text-text-secondary"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-text-muted">
          {items.length} item{items.length !== 1 ? "s" : ""} · sorted by impact
        </span>
      </div>

      {/* ── Recovery list ─────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">
        {items.length === 0 && (
          <div className="py-16 text-center text-sm text-text-muted">
            No items match the selected filter.
          </div>
        )}

        {items.map((item, idx) => {
          const rs = RISK_STYLE[item.risk];
          const isLast = idx === items.length - 1;
          const scorePct = `${item.score}%`;

          return (
            <div
              key={item.r.id}
              className={`flex flex-col gap-3 px-6 py-5 transition-colors hover:bg-film sm:flex-row sm:items-center sm:gap-5 ${
                !isLast ? "border-b border-hairline" : ""
              }`}
            >
              {/* Rank + dot */}
              <div className="flex shrink-0 items-center gap-3 sm:w-10 sm:flex-col sm:items-center sm:gap-1">
                <span className="text-[11px] font-bold text-text-muted">#{item.rank}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: STATUS_DOT[item.r.status],
                    boxShadow: `0 0 6px ${STATUS_DOT[item.r.status]}`,
                  }}
                />
              </div>

              {/* Main content */}
              <div className="min-w-0 flex-1">
                {/* Title row */}
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    {item.r.region}
                  </span>
                  <span className="text-text-muted">·</span>
                  <span className="text-sm text-text-secondary">{item.r.plant}</span>
                  <span className="text-text-muted">—</span>
                  <span className="text-xs text-text-muted">{item.r.metric}</span>

                  {/* Risk badge */}
                  <span
                    className="ml-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{ color: rs.color, borderColor: rs.border, background: rs.bg }}
                  >
                    {item.risk}
                  </span>
                </div>

                {/* AI recommendation */}
                <div className="flex items-start gap-1.5 text-[11px] text-text-muted">
                  <Sparkles className="mt-px h-3 w-3 shrink-0 text-accent-secondary/60" />
                  <span className="italic leading-snug">{item.ai}</span>
                </div>
              </div>

              {/* Metrics cluster */}
              <div className="flex shrink-0 items-center gap-6">
                {/* Gap */}
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Gap</div>
                  <div
                    className="text-base font-semibold tabular-nums"
                    style={{ color: "var(--status-behind)" }}
                  >
                    {formatNumber(item.r.gap, { sign: true })}
                  </div>
                </div>

                {/* Score */}
                <div className="hidden sm:block">
                  <div className="mb-1 flex items-center justify-between gap-4 text-[10px] text-text-muted">
                    <span className="uppercase tracking-wider">Score</span>
                    <span className="font-semibold text-text-secondary">{item.score}</span>
                  </div>
                  <div className="h-1 w-20 overflow-hidden rounded-full bg-film-strong">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: scorePct,
                        background: rs.color,
                        boxShadow: `0 0 6px ${rs.color}80`,
                      }}
                    />
                  </div>
                </div>

                {/* Attainment */}
                <div className="hidden text-right lg:block">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Attainment</div>
                  <div className="text-base font-semibold tabular-nums text-text-secondary">
                    {Math.round(item.r.attainment * 100)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1 text-[11px] text-text-muted">
        <TrendingDown className="h-3.5 w-3.5 shrink-0 text-status-behind" />
        Focus on the top 3–6 items to move the needle before quarter close.
        AI recommendations are generated from production and logistics telemetry.
      </div>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────── */

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-2xl font-semibold tabular-nums leading-none"
        style={{ color, fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  );
}
