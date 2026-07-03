import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { REGIONS, currentMonthRecords, computeKpis, formatNumber, formatPct } from "@/lib/mockData";
import { StatusChip } from "@/components/ui/status-chip";
import { useMemo } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { Status } from "@/lib/mockData";

export const Route = createFileRoute("/_shell/leaderboard")({
  head: () => ({ meta: [{ title: "Regional Leaderboard — OCC" }, { name: "description", content: "Ranked regional performance across plan, actual, gap, and attainment." }] }),
  component: Leaderboard,
});

function statusOf(att: number): Status {
  if (att >= 1) return "Above Plan";
  if (att >= 0.95) return "On Plan";
  if (att >= 0.8) return "Watchlist";
  return "Behind Plan";
}

function Leaderboard() {
  const records = currentMonthRecords();
  const rows = useMemo(() => {
    return REGIONS.map((r, i) => {
      const k = computeKpis(records.filter((x) => x.region === r.name));
      const prevRank = (i + 2) % REGIONS.length;
      return { name: r.name, ...k, prevRank };
    })
      .sort((a, b) => b.attainment - a.attainment)
      .map((r, i) => ({ ...r, rank: i + 1, delta: r.prevRank - (i + 1) }));
  }, [records]);

  return (
    <div>
      <PageHeader eyebrow="Leaderboard" title="Regional Performance Rankings" subtitle="Trading-terminal-style view of regional attainment vs plan." />

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th className="w-16 px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Plan</th>
              <th className="px-4 py-3 text-right">Actual</th>
              <th className="px-4 py-3 text-right">Gap</th>
              <th className="px-4 py-3 text-right">Attainment</th>
              <th className="w-48 px-4 py-3">Progress</th>
              <th className="w-24 px-4 py-3 text-center">Δ Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="group border-b border-border-subtle/50 last:border-0 transition hover:bg-accent-secondary/[0.04]">
                <td className="px-4 py-4 text-center">
                  <span className="kpi-number text-xl">{r.rank}</span>
                </td>
                <td className="px-4 py-4 font-medium text-text-primary">{r.name}</td>
                <td className="px-4 py-4"><StatusChip status={statusOf(r.attainment)} /></td>
                <td className="px-4 py-4 text-right text-text-secondary">{formatNumber(r.totalPlan)}</td>
                <td className="px-4 py-4 text-right text-text-primary">{formatNumber(r.totalActual)}</td>
                <td className="px-4 py-4 text-right" style={{ color: r.totalGap < 0 ? "var(--status-behind)" : "var(--status-onplan)" }}>
                  {formatNumber(r.totalGap, { sign: true })}
                </td>
                <td className="px-4 py-4 text-right text-text-primary">{formatPct(r.attainment)}</td>
                <td className="px-4 py-4">
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-film-strong">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.min(100, r.attainment * 100)}%`,
                        background: r.attainment >= 1 ? "var(--status-info)" : r.attainment >= 0.95 ? "var(--status-onplan)" : r.attainment >= 0.8 ? "var(--status-watchlist)" : "var(--status-behind)",
                        boxShadow: "0 0 12px currentColor",
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  {r.delta > 0 && <span className="inline-flex items-center gap-1 text-xs text-status-onplan"><ArrowUp className="h-3 w-3" />{r.delta}</span>}
                  {r.delta < 0 && <span className="inline-flex items-center gap-1 text-xs text-status-behind"><ArrowDown className="h-3 w-3" />{Math.abs(r.delta)}</span>}
                  {r.delta === 0 && <span className="inline-flex items-center gap-1 text-xs text-text-muted"><Minus className="h-3 w-3" /></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}