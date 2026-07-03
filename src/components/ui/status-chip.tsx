import type { Status } from "@/lib/mockData";
import { statusColor } from "@/lib/mockData";

export function StatusChip({ status, pulse }: { status: Status; pulse?: boolean }) {
  const color = statusColor(status);
  const shouldPulse = pulse ?? (status === "Behind Plan" || status === "Watchlist");
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${shouldPulse ? "animate-soft-pulse" : ""}`}
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {status}
    </span>
  );
}