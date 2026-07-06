import { createFileRoute } from "@tanstack/react-router";
import {
  buildRegionSummaries,
  computeKpis,
  currentMonthRecords,
  formatPct,
  REGION_HIGHLIGHTS,
  type Status,
  type RegionSummary,
} from "@/lib/mockData";
import { RegionStatusRow } from "@/components/ui/region-status-row";
import { useScorecard } from "@/hooks/useApi";
import type { ScorecardRow } from "@/lib/api";

export const Route = createFileRoute("/_shell/overview")({
  head: () => ({
    meta: [
      { title: "Executive Overview — Operations Command Center" },
      { name: "description", content: "Global delivery and production status at a glance." },
    ],
  }),
  component: OverviewPage,
});

const STATUS_LABEL: Record<Status, string> = {
  "Behind Plan": "Behind Plan",
  Watchlist: "Watchlist",
  "On Plan": "On Plan",
  "Above Plan": "Above Plan",
  "No Plan": "No Plan",
};

const STATUS_COLOR: Record<Status, string> = {
  "Behind Plan": "#EF4444",
  Watchlist: "#F59E0B",
  "On Plan": "#10B981",
  "Above Plan": "#10B981",
  "No Plan": "#475569",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-1 border-b border-hairline pb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
        {title}
      </span>
    </div>
  );
}

function MetaBadge({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-2xl font-semibold tabular-nums leading-none tracking-tight"
        style={{ color: color ?? "var(--text-primary)", fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  );
}

function scorecardToSummaries(rows: ScorecardRow[]): RegionSummary[] {
  const byRegion = new Map<string, ScorecardRow[]>();
  for (const r of rows) {
    const list = byRegion.get(r.region) ?? [];
    list.push(r);
    byRegion.set(r.region, list);
  }
  return Array.from(byRegion.entries()).map(([region, regionRows]) => {
    const delivery   = regionRows.filter((r) => r.metric_category === "shipment");
    const production = regionRows.filter((r) => r.metric_category === "production");
    const attainment = (rows: ScorecardRow[]) => {
      if (!rows.length) return 0;
      const vals = rows.map((r) => r.attainment_pct ?? 0);
      return vals.reduce((a, b) => a + b, 0) / vals.length / 100;
    };
    const statusFrom = (a: number): Status => {
      if (a === 0) return "No Plan";
      if (a >= 1.0) return "Above Plan";
      if (a >= 0.95) return "On Plan";
      if (a >= 0.8) return "Watchlist";
      return "Behind Plan";
    };
    const da = attainment(delivery.length ? delivery : regionRows);
    const pa = attainment(production.length ? production : regionRows);
    const oa = (da + pa) / 2;
    const plans  = regionRows.map((r) => r.plan   ?? 0);
    const actuals = regionRows.map((r) => r.actual ?? 0);
    const totalPlan   = plans.reduce((a, b) => a + b, 0);
    const totalActual = actuals.reduce((a, b) => a + b, 0);
    return {
      region,
      deliveryAttainment:   da,
      deliveryStatus:       statusFrom(da),
      productionAttainment: pa,
      productionStatus:     statusFrom(pa),
      overallAttainment:    oa,
      overallStatus:        statusFrom(oa),
      plan:   totalPlan,
      actual: totalActual,
      gap:    totalActual - totalPlan,
    } satisfies RegionSummary;
  });
}

function OverviewPage() {
  const { data: scorecardData, isSuccess: hasLiveData } = useScorecard();

  // Use live API data if available, fall back to mock data
  const mockRecords = currentMonthRecords();
  const summaries: RegionSummary[] = hasLiveData && scorecardData!.data.length > 0
    ? scorecardToSummaries(scorecardData!.data)
    : buildRegionSummaries(mockRecords);

  const k = hasLiveData && scorecardData!.data.length > 0
    ? (() => {
        const totalPlan   = scorecardData!.data.reduce((s, r) => s + (r.plan   ?? 0), 0);
        const totalActual = scorecardData!.data.reduce((s, r) => s + (r.actual ?? 0), 0);
        return { attainment: totalPlan ? totalActual / totalPlan : 0 };
      })()
    : computeKpis(mockRecords);

  const behind   = summaries.filter((s) => s.overallStatus === "Behind Plan").length;
  const onPlan   = summaries.filter((s) => s.overallStatus === "On Plan" || s.overallStatus === "Above Plan").length;
  const watchlist = summaries.filter((s) => s.overallStatus === "Watchlist").length;

  const reportMonth = hasLiveData && scorecardData!.data[0]?.report_month
    ? scorecardData!.data[0].report_month
    : "May 2026";

  const overallColor =
    k.attainment >= 0.95
      ? "var(--status-onplan)"
      : k.attainment >= 0.8
        ? "var(--status-watchlist)"
        : "var(--status-behind)";

  return (
    <div className="flex flex-col gap-5">
      {/* ── Executive Header ─────────────────────────────────────────── */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-6 px-7 py-5">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-secondary">
            Global Operations · Executive Summary
          </div>
          <h1 className="text-display text-xl font-semibold text-text-primary">
            CSAME Delivery & Production · {reportMonth}
          </h1>
        </div>

        <div className="flex items-center gap-10">
          <MetaBadge value={formatPct(k.attainment)} label="Overall Attainment" color={overallColor} />
          <div className="h-8 w-px bg-hairline-strong" />
          <MetaBadge value={behind} label="Behind Plan" color="var(--status-behind)" />
          <MetaBadge value={watchlist} label="Watchlist" color="var(--status-watchlist)" />
          <MetaBadge value={onPlan} label="On Plan" color="var(--status-onplan)" />
          <div className="h-8 w-px bg-hairline-strong" />
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "var(--accent-secondary)", boxShadow: "0 0 8px var(--accent-secondary)" }}
            />
            Live · Refreshed just now
          </div>
        </div>
      </div>

      {/* ── 3-Column Executive Panel ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr] xl:grid-cols-[0.9fr_1.05fr_1.05fr]">

        {/* ── Column 1: Highlights ────────────────────────────────────── */}
        <div className="glass-panel flex flex-col px-6 py-5">
          <SectionHeader title="Highlights" />
          <ul className="mt-2 flex flex-col gap-3">
            {REGION_HIGHLIGHTS.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-snug">
                <span className="mt-[3px] shrink-0 text-accent-secondary">·</span>
                <span className="text-text-secondary">
                  <span className="font-semibold text-text-primary">{h.bold}</span>{" "}
                  {h.text}
                </span>
              </li>
            ))}
          </ul>

          {/* Footnote */}
          <div className="mt-auto pt-5 border-t border-hairline">
            <p className="text-xs leading-relaxed text-text-muted">
              <span className="font-semibold text-text-secondary">Procurement-driven regions:</span>{" "}
              Three days remaining in the quarter — all teams fully mobilised for a strong close.
            </p>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4">
            {(
              [
                ["On Plan", "var(--status-onplan)"],
                ["Watchlist", "var(--status-watchlist)"],
                ["Behind Plan", "var(--status-behind)"],
              ] as const
            ).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 5px ${color}80` }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Column 2: Delivery ──────────────────────────────────────── */}
        <div className="glass-panel px-6 py-5">
          <SectionHeader title="Delivery Attainment" />
          <div className="mt-2">
            {summaries.map((s) => (
              <RegionStatusRow
                key={s.region}
                region={s.region}
                pct={s.deliveryAttainment}
                status={s.deliveryStatus}
                showPct
              />
            ))}
          </div>

          {/* Summary bar */}
          <div className="mt-5 border-t border-hairline pt-4">
            <div className="mb-1.5 flex justify-between text-[10px] text-text-muted">
              <span>Delivery Attainment</span>
              <span className="font-semibold text-text-secondary">
                {formatPct(
                  summaries.reduce((s, r) => s + r.deliveryAttainment, 0) / summaries.length,
                )}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-film-strong overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (summaries.reduce((s, r) => s + r.deliveryAttainment, 0) / summaries.length) * 100,
                  ).toFixed(1)}%`,
                  background: "var(--status-onplan)",
                  boxShadow: "0 0 6px var(--status-onplan)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Column 3: Production ────────────────────────────────────── */}
        <div className="glass-panel px-6 py-5">
          <SectionHeader title="Production Status" />
          <div className="mt-2">
            {summaries.map((s) => (
              <RegionStatusRow
                key={s.region}
                region={s.region}
                pct={s.productionAttainment}
                status={s.productionStatus}
                showPct={false}
              />
            ))}
          </div>

          {/* Status tally */}
          <div className="mt-5 border-t border-hairline pt-4 grid grid-cols-2 gap-3">
            {(["Behind Plan", "Watchlist", "On Plan", "Above Plan"] as Status[]).map((st) => {
              const count = summaries.filter((s) => s.productionStatus === st).length;
              if (count === 0) return null;
              return (
                <div key={st} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: STATUS_COLOR[st], boxShadow: `0 0 5px ${STATUS_COLOR[st]}80` }}
                  />
                  <span className="text-[11px] text-text-muted">
                    {count} {STATUS_LABEL[st]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom insight strip ──────────────────────────────────────── */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 px-6 py-3">
        <span className="text-xs text-text-muted">
          Reporting period:{" "}
          <span className="font-medium text-text-secondary">{reportMonth}</span>{" "}
          · {summaries.length} Regions
          {hasLiveData && scorecardData!.data.length > 0
            ? ` · ${scorecardData!.total_rows} KPIs · Live data`
            : " · Mock data"}
        </span>
        <div className="flex gap-6">
          {summaries.map((s) => (
            <div key={s.region} className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: STATUS_COLOR[s.overallStatus] }}
              />
              <span className="text-text-secondary font-medium">{s.region.split(" ").slice(-1)[0]}</span>
              <span>{Math.round(s.overallAttainment * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
