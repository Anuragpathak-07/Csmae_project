import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { currentMonthRecords, formatNumber, formatPct } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_shell/plant-performance")({
  head: () => ({ meta: [{ title: "Plant Performance Treemap — OCC" }, { name: "description", content: "Hierarchical treemap of plant-level performance across regions." }] }),
  component: Treemap,
});

interface Node {
  name: string;
  value: number;
  actual: number;
  plan: number;
  gap: number;
  att: number;
  children?: Node[];
}

function buildTree(records = currentMonthRecords()): Node {
  const byRegion = new Map<string, Map<string, Map<string, Map<string, { plan: number; actual: number }>>>>();
  for (const r of records) {
    if (!byRegion.has(r.region)) byRegion.set(r.region, new Map());
    const bMap = byRegion.get(r.region)!;
    if (!bMap.has(r.business)) bMap.set(r.business, new Map());
    const plMap = bMap.get(r.business)!;
    if (!plMap.has(r.productLine)) plMap.set(r.productLine, new Map());
    const pMap = plMap.get(r.productLine)!;
    const cur = pMap.get(r.plant) ?? { plan: 0, actual: 0 };
    cur.plan += r.plan; cur.actual += r.actual;
    pMap.set(r.plant, cur);
  }
  const root: Node = {
    name: "Global", value: 0, actual: 0, plan: 0, gap: 0, att: 0,
    children: Array.from(byRegion, ([region, bMap]) => ({
      name: region, value: 0, actual: 0, plan: 0, gap: 0, att: 0,
      children: Array.from(bMap, ([business, plMap]) => ({
        name: business, value: 0, actual: 0, plan: 0, gap: 0, att: 0,
        children: Array.from(plMap, ([productLine, pMap]) => ({
          name: productLine, value: 0, actual: 0, plan: 0, gap: 0, att: 0,
          children: Array.from(pMap, ([plant, v]) => ({
            name: plant, value: v.actual, actual: v.actual, plan: v.plan,
            gap: v.actual - v.plan, att: v.plan ? v.actual / v.plan : 0,
          })),
        })),
      })),
    })),
  };
  const roll = (n: Node) => {
    if (n.children) {
      n.children.forEach(roll);
      n.actual = n.children.reduce((s, c) => s + c.actual, 0);
      n.plan = n.children.reduce((s, c) => s + c.plan, 0);
      n.value = n.actual;
      n.gap = n.actual - n.plan;
      n.att = n.plan ? n.actual / n.plan : 0;
    }
    return n;
  };
  return roll(root);
}

function gapColor(att: number) {
  if (att >= 1.05) return "#3B82F6";
  if (att >= 1) return "#10B981";
  if (att >= 0.9) return "#F59E0B";
  return "#EF4444";
}

function squarify(nodes: Node[], x: number, y: number, w: number, h: number) {
  const total = nodes.reduce((s, n) => s + n.value, 0);
  if (total === 0) return [] as { n: Node; x: number; y: number; w: number; h: number }[];
  const out: { n: Node; x: number; y: number; w: number; h: number }[] = [];
  let cx = x, cy = y, cw = w, ch = h;
  const items = [...nodes].sort((a, b) => b.value - a.value);
  for (const n of items) {
    const frac = n.value / total;
    if (cw > ch) {
      const nw = cw * frac;
      out.push({ n, x: cx, y: cy, w: nw, h: ch });
      cx += nw; cw -= nw;
    } else {
      const nh = ch * frac;
      out.push({ n, x: cx, y: cy, w: cw, h: nh });
      cy += nh; ch -= nh;
    }
  }
  return out;
}

function Treemap() {
  const tree = useMemo(() => buildTree(), []);
  const [path, setPath] = useState<string[]>([]);

  let node: Node = tree;
  for (const p of path) {
    const next = node.children?.find((c) => c.name === p);
    if (!next) break;
    node = next;
  }
  const rects = node.children ? squarify(node.children, 0, 0, 1000, 560) : [];

  return (
    <div>
      <PageHeader eyebrow="Plant Performance" title="Hierarchical Treemap" subtitle="Region → Business → Product Line → Plant. Size = actual volume. Color = attainment." />

      <div className="glass-panel p-6">
        <div className="mb-4 flex items-center gap-2 text-xs text-text-secondary">
          <button onClick={() => setPath([])} className="hover:text-text-primary">Global</button>
          {path.map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-text-muted" />
              <button onClick={() => setPath(path.slice(0, i + 1))} className="hover:text-text-primary">{p}</button>
            </span>
          ))}
        </div>

        <div className="relative w-full overflow-hidden rounded-xl border border-border-subtle bg-scrim">
          <svg viewBox="0 0 1000 560" className="h-[560px] w-full">
            {rects.map(({ n, x, y, w, h }) => (
              <g
                key={n.name}
                style={{ cursor: n.children ? "pointer" : "default" }}
                onClick={() => n.children && setPath([...path, n.name])}
              >
                <rect x={x + 2} y={y + 2} width={Math.max(0, w - 4)} height={Math.max(0, h - 4)} rx={8}
                  fill={gapColor(n.att)} fillOpacity={0.7} stroke="rgba(255,255,255,0.08)">
                  <title>{`${n.name}\nPlan ${formatNumber(n.plan)} / Actual ${formatNumber(n.actual)} · ${formatPct(n.att)}`}</title>
                </rect>
                {w > 80 && h > 40 && (
                  <>
                    <text x={x + 12} y={y + 22} fill="#FFFFFF" fontSize="12" fontFamily="Manrope" fontWeight={600}>{n.name}</text>
                    <text x={x + 12} y={y + 40} fill="rgba(255,255,255,0.75)" fontSize="10" fontFamily="Inter">
                      {formatNumber(n.actual)} · {formatPct(n.att, 0)}
                    </text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}