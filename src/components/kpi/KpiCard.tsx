import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";

const TONE_COLOR = {
  neutral: "#3B82F6",
  positive: "#10B981",
  negative: "#EF4444",
  warning: "#F59E0B",
} as const;

const TONE_BORDER = {
  neutral: "rgba(59,130,246,0.3)",
  positive: "rgba(16,185,129,0.3)",
  negative: "rgba(239,68,68,0.3)",
  warning: "rgba(245,158,11,0.3)",
} as const;

export function KpiCard({
  label,
  value,
  delta,
  spark,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: string;
  spark?: number[];
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const toneColor = TONE_COLOR[tone];
  const positive = delta?.startsWith("+");

  return (
    <div
      className="glass-card hover-lift animate-count-in flex flex-col gap-2.5 p-4"
      style={{ borderTopColor: TONE_BORDER[tone], borderTopWidth: "1px" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
      <div className="kpi-number text-3xl leading-none sm:text-4xl">{value}</div>
      <div className="flex items-center justify-between gap-3">
        {delta && (
          <div
            className="flex items-center gap-1 text-[11px] font-medium"
            style={{ color: positive ? "var(--status-onplan)" : "var(--status-behind)" }}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta}
          </div>
        )}
        {spark && (
          <div className="h-6 flex-1">
            <Sparkline data={spark} color={toneColor} />
          </div>
        )}
      </div>
    </div>
  );
}