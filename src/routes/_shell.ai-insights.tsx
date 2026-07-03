import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_shell/ai-insights")({
  head: () => ({ meta: [{ title: "AI Operations Intelligence — OCC" }, { name: "description", content: "AI-generated risks, watchlist items, highlights, opportunities, and anomalies." }] }),
  component: AIInsights,
});

const SECTIONS = [
  {
    icon: "🚨", title: "Critical Risks", tone: "behind",
    items: [
      { text: "Middle East shipment volume −61,683 units vs plan — supplier congestion at Dubai Hub.", link: "/map" },
      { text: "Japan Tsuyama production −188 units for third consecutive month.", link: "/plant-performance" },
    ],
  },
  {
    icon: "⚠", title: "Watchlist Areas", tone: "watch",
    items: [
      { text: "India Pune trending toward Behind Plan by end of month.", link: "/attainment-matrix" },
      { text: "North America Detroit inbound delays climbing week-over-week.", link: "/plan-vs-actual" },
    ],
  },
  {
    icon: "✅", title: "Positive Highlights", tone: "good",
    items: [
      { text: "Australia Perth exceeding plan by 12% — recovery from Q2 gap complete.", link: "/leaderboard" },
      { text: "Domestic Berlin attainment stable above 100% for 4 months.", link: "/leaderboard" },
    ],
  },
  {
    icon: "📈", title: "Recovery Opportunities", tone: "info",
    items: [
      { text: "Rebalancing shifts across Nagoya/Osaka could close 8% of Japan gap.", link: "/gap-recovery" },
      { text: "Secondary supplier route unlocks est. 12% Middle East recovery.", link: "/gap-recovery" },
    ],
  },
  {
    icon: "🔍", title: "Operational Anomalies", tone: "info",
    items: [
      { text: "Unusual variance detected in Chennai sensor module yield (past 7 days).", link: "/trends" },
      { text: "Riyadh Ops actuals oscillating outside normal band.", link: "/trends" },
    ],
  },
];

function AIInsights() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <div>
      <PageHeader eyebrow="AI Intelligence" title="Operations Intelligence" subtitle="AI-generated insights across risks, watchlist, wins, opportunities, and anomalies." />

      <div className="glass-panel p-6">
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-accent-secondary/30 bg-accent-secondary/5 p-3">
          <Sparkles className="h-5 w-5 text-accent-secondary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Ask the AI — e.g. "Why is Middle East behind plan this month?"'
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <button
            onClick={() => setAnswer(q ? `Based on current data, ${q.toLowerCase()} likely stems from Dubai Hub congestion and secondary supplier delays. Consider re-routing 3 shipments via Riyadh Ops.` : null)}
            className="shiny-cta rounded-full px-4 py-1.5 text-xs font-semibold"
          >
            Ask
          </button>
        </div>

        {answer && (
          <div className="mb-8 rounded-xl border border-border-subtle bg-scrim p-4 text-sm text-text-secondary">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-accent-secondary">Answer</span>
            {answer}
          </div>
        )}

        <div className="divide-y divide-border-subtle">
          {SECTIONS.map((s) => (
            <div key={s.title} className="py-6 first:pt-0 last:pb-0">
              <h3 className="text-display mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
                <span>{s.icon}</span> {s.title}
              </h3>
              <ul className="space-y-3">
                {s.items.map((it) => (
                  <li key={it.text} className="flex items-start justify-between gap-4 text-sm text-text-secondary">
                    <span>{it.text}</span>
                    <Link to={it.link} className="shrink-0 inline-flex items-center gap-1 text-xs text-accent-secondary hover:underline">
                      View data <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}