import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { ALL_RECORDS } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { Search, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/_shell/traceability")({
  head: () => ({ meta: [{ title: "Source Traceability — OCC" }, { name: "description", content: "Data lineage explorer for every operational metric." }] }),
  component: Traceability,
});

function Traceability() {
  const [q, setQ] = useState("");
  const metrics = useMemo(() => {
    const seen = new Map<string, typeof ALL_RECORDS[number]>();
    for (const r of ALL_RECORDS) {
      const k = `${r.region}/${r.plant}/${r.metric}`;
      if (!seen.has(k)) seen.set(k, r);
    }
    return Array.from(seen.values()).filter((m) =>
      q ? (m.metric + m.plant + m.region + m.sourceFile).toLowerCase().includes(q.toLowerCase()) : true
    ).slice(0, 40);
  }, [q]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = metrics.find((m) => `${m.region}-${m.plant}-${m.metric}` === selectedKey) ?? metrics[0];

  return (
    <div>
      <PageHeader eyebrow="Governance" title="Source Traceability Center" subtitle="Every metric traced back to its source file, sheet, and reporting period." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="glass-panel p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search metrics..."
              className="w-full rounded-lg border border-border-subtle bg-scrim py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-secondary/60"
            />
          </div>
          <div className="max-h-[560px] space-y-1 overflow-auto pr-1">
            {metrics.map((m) => {
              const key = `${m.region}-${m.plant}-${m.metric}`;
              const active = selected && `${selected.region}-${selected.plant}-${selected.metric}` === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                    active
                      ? "border-accent-secondary/50 bg-accent-secondary/10 text-text-primary"
                      : "border-transparent text-text-secondary hover:bg-film hover:text-text-primary"
                  }`}
                >
                  <div className="truncate font-medium">{m.metric}</div>
                  <div className="mt-0.5 truncate text-[10px] text-text-muted">{m.region} · {m.plant}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-6">
          {selected && (
            <>
              <div className="mb-6">
                <div className="text-[11px] uppercase tracking-[0.2em] text-accent-secondary">Metric Detail</div>
                <h3 className="text-display mt-1 text-2xl font-semibold">{selected.metric}</h3>
              </div>

              <dl className="grid grid-cols-2 gap-y-4 text-sm">
                <Row label="Source Metric" value={selected.metric} />
                <Row label="Source File" value={selected.sourceFile} icon={<FileSpreadsheet className="h-3.5 w-3.5" />} />
                <Row label="Source Sheet" value={selected.sourceSheet} />
                <Row label="Report Month" value={selected.reportMonth} />
                <Row label="Region" value={selected.region} />
                <Row label="Plant" value={selected.plant} />
                <Row label="Dimension Count" value="6" />
              </dl>

              <div className="mt-8">
                <div className="mb-3 text-[11px] uppercase tracking-wider text-text-muted">Lineage</div>
                <svg viewBox="0 0 800 160" className="h-40 w-full">
                  {[
                    { x: 40, label: selected.sourceFile, sub: "File" },
                    { x: 300, label: selected.sourceSheet, sub: "Sheet" },
                    { x: 560, label: selected.metric, sub: "Metric" },
                  ].map((n, i, arr) => (
                    <g key={n.label}>
                      {i < arr.length - 1 && (
                        <line x1={n.x + 180} y1={80} x2={arr[i + 1].x} y2={80} stroke="#3B82F6" strokeOpacity={0.35} strokeDasharray="4 4" />
                      )}
                      <rect x={n.x} y={50} width={180} height={60} rx={10} fill="rgba(15,23,42,0.7)" stroke="rgba(59,130,246,0.35)" />
                      <text x={n.x + 12} y={75} fill="#FFF" fontSize={11} fontFamily="Manrope" fontWeight={600}>{n.label.length > 22 ? n.label.slice(0, 22) + "…" : n.label}</text>
                      <text x={n.x + 12} y={92} fill="#94A3B8" fontSize={10}>{n.sub}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-text-primary">{icon}{value}</dd>
    </>
  );
}