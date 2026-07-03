import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { REGIONS, currentMonthRecords, computeKpis, formatNumber, formatPct } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { StatusChip } from "@/components/ui/status-chip";
import type { Status } from "@/lib/mockData";

export const Route = createFileRoute("/_shell/map")({
  head: () => ({ meta: [{ title: "Global Operations Map — OCC" }, { name: "description", content: "Interactive world map of global operations performance." }] }),
  component: MapPage,
});

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

function attToStatus(a: number): Status {
  if (a >= 1) return "Above Plan";
  if (a >= 0.95) return "On Plan";
  if (a >= 0.8) return "Watchlist";
  return "Behind Plan";
}

function attToColor(a: number): string {
  if (a >= 1) return "var(--status-info)";
  if (a >= 0.95) return "var(--status-onplan)";
  if (a >= 0.8) return "var(--status-watchlist)";
  return "var(--status-behind)";
}

function MapPage() {
  const records = currentMonthRecords();
  const regionData = useMemo(() => {
    return REGIONS.map((r) => {
      const rows = records.filter((x) => x.region === r.name);
      const k = computeKpis(rows);
      return { ...r, ...k, plantCount: new Set(rows.map((x) => x.plant)).size };
    });
  }, [records]);

  const [selected, setSelected] = useState<string | null>("Middle East");
  const active = regionData.find((r) => r.name === selected) ?? null;

  const W = 1000;
  const H = 500;

  return (
    <div>
      <PageHeader eyebrow="Global Map" title="Regional Operations Footprint" subtitle="Bubble size reflects actual volume. Color reflects attainment vs plan." />

      <div className="glass-panel relative overflow-hidden p-6">
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[520px] w-full">
            {/* stylized world silhouette via grid + latitude arcs */}
            <defs>
              <radialGradient id="ocean" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#0F172A" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} fill="url(#ocean)" />
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v-${i}`} x1={(i / 10) * W} y1={0} x2={(i / 10) * W} y2={H} stroke="#3B82F6" strokeOpacity="0.06" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={`h-${i}`} x1={0} y1={(i / 6) * H} x2={W} y2={(i / 6) * H} stroke="#3B82F6" strokeOpacity="0.06" />
            ))}
            {/* connection lines */}
            {regionData.map((a, i) =>
              regionData.slice(i + 1).map((b) => {
                const pa = project(a.lat, a.lng, W, H);
                const pb = project(b.lat, b.lng, W, H);
                return (
                  <line
                    key={`${a.name}-${b.name}`}
                    x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                    stroke="#3B82F6" strokeOpacity="0.08" strokeDasharray="2 4"
                  />
                );
              })
            )}
            {/* bubbles */}
            {regionData.map((r) => {
              const p = project(r.lat, r.lng, W, H);
              const size = 14 + Math.sqrt(r.totalActual) / 25;
              const color = attToColor(r.attainment);
              const isActive = selected === r.name;
              return (
                <g key={r.name} style={{ cursor: "pointer" }} onClick={() => setSelected(r.name)}>
                  <circle cx={p.x} cy={p.y} r={size + 12} fill={color} opacity={0.12} />
                  <circle cx={p.x} cy={p.y} r={size} fill={color} opacity={0.85}>
                    <animate attributeName="r" values={`${size};${size + 4};${size}`} dur="3s" repeatCount="indefinite" />
                  </circle>
                  {isActive && <circle cx={p.x} cy={p.y} r={size + 8} fill="none" stroke={color} strokeWidth="2" />}
                  <text x={p.x} y={p.y + size + 16} textAnchor="middle" fill="#E2E8F0" fontSize="12" fontFamily="Manrope">
                    {r.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* legend */}
          <div className="glass-card absolute bottom-3 left-3 p-3 text-[11px] text-text-secondary">
            <div className="mb-1 font-medium text-text-primary">Legend</div>
            <div>Size = Actual Volume</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-info)" }} /> Above
              <span className="ml-2 inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-onplan)" }} /> On
              <span className="ml-2 inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-watchlist)" }} /> Watch
              <span className="ml-2 inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-behind)" }} /> Behind
            </div>
          </div>
        </div>
      </div>

      {active && (
        <div className="glass-panel mt-6 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-accent-secondary">Region Detail</div>
              <h3 className="text-display mt-1 text-2xl font-semibold">{active.name}</h3>
            </div>
            <StatusChip status={attToStatus(active.attainment)} />
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            <Metric label="Plan" value={formatNumber(active.totalPlan)} />
            <Metric label="Actual" value={formatNumber(active.totalActual)} />
            <Metric label="Gap" value={formatNumber(active.totalGap, { sign: true })} tone={active.totalGap < 0 ? "neg" : "pos"} />
            <Metric label="Attainment" value={formatPct(active.attainment)} />
            <Metric label="Plants" value={String(active.plantCount)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div
        className="kpi-number mt-1 text-2xl"
        style={{ color: tone === "neg" ? "var(--status-behind)" : tone === "pos" ? "var(--status-onplan)" : undefined }}
      >
        {value}
      </div>
    </div>
  );
}