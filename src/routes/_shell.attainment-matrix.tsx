import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { ALL_RECORDS, MONTH_LABELS, REGIONS, formatPct, formatNumber } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_shell/attainment-matrix")({
  head: () => ({ meta: [{ title: "Attainment Matrix — OCC" }, { name: "description", content: "Pattern spotting across time and region for execution attainment." }] }),
  component: MatrixPage,
});

function colorFor(att: number): string {
  if (att >= 1) return "#3B82F6";
  if (att >= 0.95) return "#10B981";
  if (att >= 0.8) return "#F59E0B";
  if (att >= 0.5) return "#FB923C";
  return "#EF4444";
}

function MatrixPage() {
  const [expanded, setExpanded] = useState<string[]>(["Middle East"]);

  const rows = useMemo(() => {
    const result: { key: string; label: string; depth: number; region: string }[] = [];
    for (const r of REGIONS) {
      result.push({ key: r.name, label: r.name, depth: 0, region: r.name });
      if (expanded.includes(r.name)) {
        const plants = Array.from(new Set(ALL_RECORDS.filter((x) => x.region === r.name).map((x) => x.plant)));
        for (const p of plants) {
          result.push({ key: `${r.name}::${p}`, label: p, depth: 1, region: r.name });
        }
      }
    }
    return result;
  }, [expanded]);

  const cellData = useMemo(() => {
    return rows.map((row) => ({
      row,
      months: MONTH_LABELS.map((m) => {
        const recs = ALL_RECORDS.filter((x) => {
          if (x.reportMonth !== m) return false;
          if (row.depth === 0) return x.region === row.region;
          return x.region === row.region && x.plant === row.label;
        });
        const plan = recs.reduce((s, x) => s + x.plan, 0);
        const actual = recs.reduce((s, x) => s + x.actual, 0);
        const att = plan ? actual / plan : 0;
        return { month: m, plan, actual, gap: actual - plan, att };
      }),
    }));
  }, [rows]);

  return (
    <div>
      <PageHeader eyebrow="Attainment Matrix" title="Performance Heatmap Across Time" subtitle="Spot patterns across regions, plants, and months. Click a region to expand plants." />

      <div className="glass-panel relative overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-end gap-3 text-[11px] text-text-secondary">
          <Legend color="#EF4444" label="0-50% Critical" />
          <Legend color="#FB923C" label="50-80%" />
          <Legend color="#F59E0B" label="80-95%" />
          <Legend color="#10B981" label="95-100%" />
          <Legend color="#3B82F6" label="100%+" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-text-muted" />
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="text-center text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    {m.slice(5)}/{m.slice(2, 4)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cellData.map(({ row, months }) => (
                <tr key={row.key}>
                  <td className="pr-3">
                    <button
                      onClick={() => row.depth === 0 && setExpanded((prev) => (prev.includes(row.label) ? prev.filter((x) => x !== row.label) : [...prev, row.label]))}
                      className={`flex items-center gap-1 text-sm ${row.depth === 0 ? "font-medium text-text-primary" : "pl-4 text-text-secondary"}`}
                    >
                      {row.depth === 0 && (
                        <ChevronRight className={`h-3 w-3 transition ${expanded.includes(row.label) ? "rotate-90" : ""}`} />
                      )}
                      {row.label}
                    </button>
                  </td>
                  {months.map((c) => (
                    <td key={c.month} className="p-0">
                      <div
                        className="group relative h-9 rounded-md"
                        style={{ background: `color-mix(in oklab, ${colorFor(c.att)} 65%, transparent)` }}
                        title={`${row.label} · ${c.month}: ${formatPct(c.att)} (Plan ${formatNumber(c.plan)} / Actual ${formatNumber(c.actual)})`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90">
                          {c.plan ? formatPct(c.att, 0) : "—"}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}