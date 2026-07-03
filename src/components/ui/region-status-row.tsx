import type { Status } from "@/lib/mockData";

/** Tiny architectural SVG silhouette per region */
function RegionIcon({ region }: { region: string }) {
  const icons: Record<string, React.ReactNode> = {
    Japan: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="13" y="18" width="6" height="10" fill="currentColor" opacity="0.7" />
        <rect x="10" y="14" width="12" height="5" fill="currentColor" opacity="0.6" />
        <path d="M8 14 L16 7 L24 14Z" fill="currentColor" opacity="0.8" />
        <path d="M6 10 L16 2 L26 10Z" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    "Middle East": (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="14" y="4" width="4" height="24" fill="currentColor" opacity="0.85" />
        <rect x="11" y="14" width="10" height="14" fill="currentColor" opacity="0.6" />
        <ellipse cx="16" cy="4" rx="2" ry="3" fill="currentColor" opacity="0.5" />
        <rect x="8" y="22" width="16" height="6" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    "North America": (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="5" y="16" width="22" height="12" fill="currentColor" opacity="0.55" />
        <rect x="9" y="10" width="14" height="6" fill="currentColor" opacity="0.65" />
        <rect x="13" y="4" width="6" height="6" fill="currentColor" opacity="0.8" />
        <rect x="9" y="18" width="3" height="10" fill="currentColor" opacity="0.9" />
        <rect x="20" y="18" width="3" height="10" fill="currentColor" opacity="0.9" />
      </svg>
    ),
    India: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="13" y="18" width="6" height="10" fill="currentColor" opacity="0.7" />
        <path d="M10 18 Q16 8 22 18Z" fill="currentColor" opacity="0.8" />
        <circle cx="16" cy="8" r="2.5" fill="currentColor" opacity="0.5" />
        <rect x="6" y="22" width="4" height="6" fill="currentColor" opacity="0.5" />
        <rect x="22" y="22" width="4" height="6" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    Australia: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="6" y="20" width="20" height="8" fill="currentColor" opacity="0.55" />
        <rect x="9" y="14" width="14" height="7" fill="currentColor" opacity="0.65" />
        <path d="M9 14 L16 6 L23 14Z" fill="currentColor" opacity="0.75" />
        <path d="M3 20 Q10 15 16 20 Q22 15 29 20" stroke="currentColor" strokeWidth="1" opacity="0.35" fill="none" />
      </svg>
    ),
    Domestic: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="4" y="16" width="24" height="12" fill="currentColor" opacity="0.5" />
        <rect x="7" y="12" width="8" height="4" fill="currentColor" opacity="0.65" />
        <rect x="17" y="10" width="8" height="6" fill="currentColor" opacity="0.7" />
        <rect x="10" y="20" width="4" height="8" fill="currentColor" opacity="0.8" />
        <rect x="18" y="20" width="4" height="8" fill="currentColor" opacity="0.8" />
        <circle cx="22" cy="7" r="2" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  };

  return (
    <div className="h-8 w-8 shrink-0 text-text-muted">
      {icons[region] ?? (
        <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
          <rect x="8" y="12" width="16" height="16" fill="currentColor" opacity="0.6" />
          <path d="M6 12 L16 4 L26 12Z" fill="currentColor" opacity="0.8" />
        </svg>
      )}
    </div>
  );
}

const STATUS_DOT: Record<Status, { color: string; glow: boolean }> = {
  "Behind Plan": { color: "#EF4444", glow: true },
  Watchlist:     { color: "#F59E0B", glow: false },
  "On Plan":     { color: "#10B981", glow: false },
  "Above Plan":  { color: "#10B981", glow: false },
  "No Plan":     { color: "#475569", glow: false },
};

function StatusDot({ status }: { status: Status }) {
  const { color, glow } = STATUS_DOT[status] ?? STATUS_DOT["No Plan"];
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: glow ? `0 0 8px ${color}, 0 0 16px ${color}40` : `0 0 5px ${color}80`,
      }}
    />
  );
}

/** A single region row: [icon] [name] [optional %] [dot] */
export function RegionStatusRow({
  region,
  pct,
  status,
  showPct = true,
}: {
  region: string;
  pct?: number;
  status: Status;
  showPct?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-hairline last:border-0">
      <RegionIcon region={region} />
      <span className="flex-1 text-sm font-medium text-text-primary truncate">{region}</span>
      {showPct && pct !== undefined && (
        <span className="text-sm font-semibold tabular-nums text-text-secondary min-w-[42px] text-right">
          {Math.round(pct * 100)}%
        </span>
      )}
      <StatusDot status={status} />
    </div>
  );
}
