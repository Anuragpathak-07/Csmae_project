import { createFileRoute } from "@tanstack/react-router";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { useState, useMemo, useRef, useEffect, useCallback, type ReactNode } from "react";
import { X, TrendingUp, TrendingDown, Minus, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ALL_RECORDS,
  MONTH_LABELS,
  REGIONS,
  currentMonthRecords,
  formatNumber,
  formatPct,
  type Status,
} from "@/lib/mockData";

export const Route = createFileRoute("/_shell/map")({
  head: () => ({
    meta: [
      { title: "Global Map — Operations Command Center" },
      { name: "description", content: "Interactive world map of regional operations performance." },
    ],
  }),
  component: MapPage,
});

/* ─── constants ─────────────────────────────────────────────────── */

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const STATUS_COLOR: Record<Status, string> = {
  "Behind Plan": "#EF4444",
  Watchlist:     "#F59E0B",
  "On Plan":     "#10B981",
  "Above Plan":  "#10B981",
  "No Plan":     "#475569",
};

const STATUS_LABEL: Record<Status, string> = {
  "Behind Plan": "Behind Plan",
  Watchlist:     "Watchlist",
  "On Plan":     "On Plan",
  "Above Plan":  "Above Plan",
  "No Plan":     "No Plan",
};

/* ─── helpers ────────────────────────────────────────────────────── */

function attToStatus(att: number, plan: number): Status {
  if (plan === 0)   return "No Plan";
  if (att >= 1.0)   return "Above Plan";
  if (att >= 0.95)  return "On Plan";
  if (att >= 0.8)   return "Watchlist";
  return "Behind Plan";
}

function monthShort(m: string) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[parseInt(m.split("-")[1], 10) - 1] ?? m;
}

/* ─── component ─────────────────────────────────────────────────── */

const MAP_MIN_ZOOM = 1;
const MAP_MAX_ZOOM = 6;

function MapPage() {
  const [selected, setSelected]   = useState<string | null>(null);
  const [zoom, setZoom]           = useState(MAP_MIN_ZOOM);
  const [center, setCenter]       = useState<[number, number]>([15, 20]);
  const mapContainerRef           = useRef<HTMLDivElement>(null);

  /* Keep wheel events on the map so d3-zoom can handle smooth scroll zoom. */
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const blockPageScroll = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", blockPageScroll, { passive: false });
    return () => el.removeEventListener("wheel", blockPageScroll);
  }, []);

  const handleMoveEnd = useCallback(
    ({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
      setZoom(z);
      setCenter(coordinates);
    },
    [],
  );

  const records = currentMonthRecords();

  /* per-region summary */
  const regionData = useMemo(() => {
    return REGIONS.map((reg) => {
      const rows    = records.filter((r) => r.region === reg.name);
      const plan    = rows.reduce((s, r) => s + r.plan, 0);
      const actual  = rows.reduce((s, r) => s + r.actual, 0);
      const gap     = actual - plan;
      const att     = plan ? actual / plan : 0;
      const status  = attToStatus(att, plan);
      const plants  = Array.from(new Set(rows.map((r) => r.plant)));
      const productLines = Array.from(new Set(rows.map((r) => r.productLine)));

      /* plant-level detail */
      const plantDetail = plants.map((p) => {
        const pr   = rows.filter((r) => r.plant === p);
        const pp   = pr.reduce((s, r) => s + r.plan, 0);
        const pa   = pr.reduce((s, r) => s + r.actual, 0);
        const patt = pp ? pa / pp : 0;
        return { name: p, plan: pp, actual: pa, gap: pa - pp, att: patt, status: attToStatus(patt, pp) };
      }).sort((a, b) => a.att - b.att);

      /* 12-month trend (overall attainment %) */
      const trend = MONTH_LABELS.map((m) => {
        const mr   = ALL_RECORDS.filter((r) => r.region === reg.name && r.reportMonth === m);
        const mp   = mr.reduce((s, r) => s + r.plan, 0);
        const ma   = mr.reduce((s, r) => s + r.actual, 0);
        return { month: monthShort(m), att: mp ? (ma / mp) * 100 : 0 };
      });

      return { ...reg, plan, actual, gap, att, status, plants, plantDetail, productLines, trend };
    });
  }, [records]);

  const activeRegion = regionData.find((r) => r.name === selected) ?? null;

  /* global summary */
  const totalPlan   = regionData.reduce((s, r) => s + r.plan, 0);
  const totalActual = regionData.reduce((s, r) => s + r.actual, 0);
  const behind      = regionData.filter((r) => r.status === "Behind Plan").length;
  const onPlan      = regionData.filter((r) => r.status === "On Plan" || r.status === "Above Plan").length;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header strip ─────────────────────────────────────────── */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-6 px-7 py-5">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-secondary">
            Global Map
          </div>
          <h1 className="text-display text-xl font-semibold text-text-primary">
            Regional Operations Footprint · May 2026
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <HeaderStat label="Total Plan"   value={formatNumber(totalPlan)} />
          <div className="h-7 w-px bg-hairline-strong" />
          <HeaderStat label="Total Actual" value={formatNumber(totalActual)} />
          <div className="h-7 w-px bg-hairline-strong" />
          <HeaderStat label="On Plan"      value={String(onPlan)}   color="var(--status-onplan)" />
          <HeaderStat label="Behind Plan"  value={String(behind)}   color="var(--status-behind)" />
        </div>
      </div>

      {/* ── Map ──────────────────────────────────────────────────── */}
      <div
        ref={mapContainerRef}
        className="glass-panel relative overflow-hidden"
        style={{
          height: 500,
          background: "var(--map-bg)",
          touchAction: "none",
        }}
      >
        {/* Zoom controls */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-1">
          {[
            { icon: <ZoomIn className="h-3.5 w-3.5" />,  action: () => setZoom((z) => Math.min(z + 0.5, MAP_MAX_ZOOM)), label: "Zoom in" },
            { icon: <ZoomOut className="h-3.5 w-3.5" />, action: () => setZoom((z) => Math.max(z - 0.5, MAP_MIN_ZOOM)), label: "Zoom out" },
            { icon: <RotateCcw className="h-3.5 w-3.5" />, action: () => { setZoom(MAP_MIN_ZOOM); setCenter([15, 20]); }, label: "Reset" },
          ].map(({ icon, action, label }) => (
            <button
              key={label}
              onClick={action}
              aria-label={label}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-scrim text-text-muted backdrop-blur transition hover:border-accent-secondary/40 hover:text-text-primary"
            >
              {icon}
            </button>
          ))}
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            filterZoomEvent={(event) => {
              if (!event) return false;
              if (event.type === "wheel") return true;
              return !event.ctrlKey && event.button === 0;
            }}
            onMoveEnd={handleMoveEnd}
          >
            {/* Country fills */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    stroke="var(--map-stroke)"
                    strokeWidth={0.4}
                    style={{
                      default:  { outline: "none", fill: "var(--map-land)" },
                      hover:    { outline: "none", fill: "var(--map-land-hover)" },
                      pressed:  { outline: "none", fill: "var(--map-land-hover)" },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Region markers */}
            {regionData.map((reg) => {
              const isSelected = selected === reg.name;
              const color      = STATUS_COLOR[reg.status];
              const isBehind   = reg.status === "Behind Plan";

              return (
                <Marker
                  key={reg.name}
                  coordinates={[reg.lng, reg.lat]}
                  onClick={() => setSelected(isSelected ? null : reg.name)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer pulse ring for behind-plan */}
                  {isBehind && (
                    <circle
                      r={22}
                      fill={color}
                      opacity={0.08}
                      style={{ animation: "soft-pulse 2.4s ease-in-out infinite" }}
                    />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      r={18}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      opacity={0.7}
                    />
                  )}

                  {/* Glow halo */}
                  <circle r={11} fill={color} opacity={0.15} />

                  {/* Main dot */}
                  <circle
                    r={7}
                    fill={color}
                    strokeWidth={isSelected ? 1.5 : 0}
                    style={{
                      filter: `drop-shadow(0 0 6px ${color})`,
                      stroke: isSelected ? "var(--text-primary)" : "transparent",
                    }}
                  />

                  {/* Attainment badge */}
                  <text
                    textAnchor="middle"
                    y={-14}
                    fill={color}
                    fontSize={9}
                    fontFamily="Inter, sans-serif"
                    fontWeight="600"
                    style={{ pointerEvents: "none" }}
                  >
                    {Math.round(reg.att * 100)}%
                  </text>

                  {/* Region name */}
                  <text
                    textAnchor="middle"
                    y={22}
                    fontSize={10}
                    fontFamily="Inter, sans-serif"
                    fontWeight={isSelected ? "600" : "400"}
                    style={{
                      pointerEvents: "none",
                      fill: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {reg.name}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        <div
          className="absolute bottom-4 left-4 rounded-xl border border-hairline px-4 py-3 text-[10px]"
          style={{ background: "var(--map-panel-scrim)", backdropFilter: "blur(12px)" }}
        >
          <div className="mb-2 font-semibold uppercase tracking-widest text-text-muted">Status</div>
          <div className="flex flex-col gap-1.5">
            {([
              ["On Plan / Above", "var(--status-onplan)"],
              ["Watchlist",       "var(--status-watchlist)"],
              ["Behind Plan",     "var(--status-behind)"],
            ] as const).map(([label, color]) => (
              <div key={label} className="flex items-center gap-2 text-text-secondary">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                {label}
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-hairline pt-2 text-text-muted">
            Click a marker to inspect
          </div>
        </div>

        {/* Click-hint when nothing selected */}
        {!selected && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <div className="rounded-full border border-hairline bg-scrim px-4 py-1.5 text-[11px] text-text-muted backdrop-blur">
              Click any region marker for details
            </div>
          </div>
        )}
      </div>

      {/* ── Detail card ──────────────────────────────────────────── */}
      {activeRegion && (
        <RegionDetailPanel
          region={activeRegion}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────── */

function RegionDetailPanel({
  region,
  onClose,
}: {
  region: {
    name: string;
    plan: number;
    actual: number;
    gap: number;
    att: number;
    status: Status;
    plantDetail: Array<{
      name: string;
      gap: number;
      att: number;
      status: Status;
    }>;
    productLines: string[];
    trend: Array<{ month: string; att: number }>;
  };
  onClose: () => void;
}) {
  const accent = STATUS_COLOR[region.status];
  const metrics = [
    { label: "Plan", value: formatNumber(region.plan) },
    { label: "Actual", value: formatNumber(region.actual) },
    {
      label: "Gap",
      value: formatNumber(region.gap, { sign: true }),
      color: region.gap < 0 ? "var(--status-behind)" : "var(--status-onplan)",
      icon: region.gap < 0
        ? <TrendingDown className="h-3.5 w-3.5" />
        : region.gap > 0
          ? <TrendingUp className="h-3.5 w-3.5" />
          : <Minus className="h-3.5 w-3.5" />,
    },
    {
      label: "Attainment",
      value: formatPct(region.att),
      color: accent,
    },
  ];

  return (
    <div
      className="glass-panel overflow-hidden"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 22%, var(--hairline))`,
        background: `linear-gradient(165deg, color-mix(in oklab, ${accent} 6%, transparent) 0%, transparent 42%)`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-6 px-8 py-6">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="mt-1.5 h-11 w-1 shrink-0 rounded-full"
            style={{ background: accent, boxShadow: `0 0 14px ${accent}55` }}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-secondary/75">
              Region Detail
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-display text-[1.65rem] font-semibold tracking-tight text-text-primary">
                {region.name}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  color: accent,
                  background: `color-mix(in oklab, ${accent} 12%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${accent} 28%, transparent)`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {STATUS_LABEL[region.status]}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-text-muted">
              {region.plantDetail.length} plants · {region.productLines.length} product lines
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-film text-text-muted transition hover:border-hairline-strong hover:bg-film-strong hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 px-8 pb-6 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-hairline bg-film px-4 py-3.5"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
              {m.label}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              {"icon" in m && m.icon && (
                <span style={{ color: m.color ?? "var(--text-muted)" }}>{m.icon}</span>
              )}
              <span
                className="text-xl font-semibold tabular-nums leading-none tracking-tight"
                style={{ color: m.color ?? "var(--text-primary)", fontFamily: "var(--font-display)" }}
              >
                {m.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Plants + trend */}
      <div className="grid grid-cols-1 gap-6 border-t border-hairline px-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1.15fr)]">
        <section>
          <SectionLabel>Plant Breakdown</SectionLabel>
          <div className="mt-4 space-y-2.5">
            {region.plantDetail.map((p) => (
              <PlantRow key={p.name} plant={p} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-hairline bg-film p-5">
          <AttainmentTrendChart
            trend={region.trend}
            accent={accent}
            regionKey={region.name.replace(/\s+/g, "-").toLowerCase()}
          />
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
      {children}
    </h3>
  );
}

function PlantRow({
  plant,
}: {
  plant: { name: string; gap: number; att: number; status: Status };
}) {
  const color = STATUS_COLOR[plant.status];
  const pct = Math.round(plant.att * 100);
  const fill = Math.min(100, pct);

  return (
    <div className="rounded-xl border border-hairline bg-film px-4 py-3.5 transition-colors hover:bg-film-strong">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
          />
          <span className="truncate text-sm font-medium text-text-primary">{plant.name}</span>
        </div>
        <div className="flex shrink-0 items-baseline gap-3">
          <span className="text-sm font-semibold tabular-nums" style={{ color }}>
            {pct}%
          </span>
          <span
            className="text-xs tabular-nums text-text-muted"
            style={{ color: plant.gap < 0 ? "var(--status-behind)" : "var(--status-onplan)" }}
          >
            {formatNumber(plant.gap, { sign: true })}
          </span>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-film-strong">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${fill}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            boxShadow: `0 0 8px ${color}44`,
          }}
        />
      </div>
    </div>
  );
}

function AttainmentTrendChart({
  trend,
  accent,
  regionKey,
}: {
  trend: Array<{ month: string; att: number }>;
  accent: string;
  regionKey: string;
}) {
  const gradId = `attainment-${regionKey}`;
  const latest = trend[trend.length - 1]?.att ?? 0;
  const avg = trend.reduce((s, t) => s + t.att, 0) / (trend.length || 1);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <SectionLabel>12-Month Attainment</SectionLabel>
          <p className="mt-1 text-xs text-text-muted">Rolling monthly performance vs. target</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-text-muted">Current</div>
          <div
            className="text-lg font-semibold tabular-nums leading-none"
            style={{ color: accent, fontFamily: "var(--font-display)" }}
          >
            {latest.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="h-[168px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748B", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              domain={[60, "auto"]}
              tick={{ fill: "#64748B", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={36}
            />
            <Tooltip
              cursor={{ stroke: "var(--hairline-strong)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload[0]?.value as number;
                const tone = value >= 95 ? "#10B981" : value >= 80 ? "#F59E0B" : "#EF4444";
                return (
                  <div
                    className="rounded-lg border border-hairline px-3 py-2 text-xs shadow-xl backdrop-blur"
                    style={{ background: "var(--tooltip-bg)" }}
                  >
                    <div className="text-text-muted">{label}</div>
                    <div className="mt-0.5 font-semibold tabular-nums" style={{ color: tone }}>
                      {value.toFixed(1)}% attainment
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={95}
              stroke="#10B981"
              strokeOpacity={0.45}
              strokeDasharray="4 4"
              label={{
                value: "95% target",
                position: "insideTopRight",
                fill: "#10B981",
                fontSize: 10,
                opacity: 0.7,
              }}
            />
            <ReferenceLine
              y={80}
              stroke="#F59E0B"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="att"
              stroke={accent}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: accent, stroke: "#fff", strokeWidth: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-5 border-t border-dashed border-status-onplan/70" />
          ≥95% on plan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-5 border-t border-dashed border-status-watchlist/70" />
          ≥80% watchlist
        </span>
        <span className="ml-auto tabular-nums text-text-secondary">
          12-mo avg · {avg.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
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
