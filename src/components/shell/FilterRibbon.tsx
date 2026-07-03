import { Star, RotateCcw, ChevronDown, X } from "lucide-react";
import { useState } from "react";

const FILTERS = [
  { key: "month", label: "Report Month", value: "May 2026" },
  { key: "status", label: "Status", value: "All" },
  { key: "region", label: "Region", value: "All" },
  { key: "metric", label: "Metric", value: "Shipment" },
  { key: "business", label: "Business", value: "All" },
  { key: "product", label: "Product Line", value: "All" },
  { key: "plant", label: "Plant", value: "All" },
];

export function FilterRibbon() {
  const [chips, setChips] = useState<string[]>(["Region: Middle East", "Status: Behind Plan"]);

  return (
    <div className="mx-4 mt-4">
      <div className="glass-panel flex flex-wrap items-center gap-2 px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="flex items-center gap-2 rounded-full border border-border-subtle bg-scrim px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent-secondary/40 hover:text-text-primary"
          >
            <span className="text-text-muted">{f.label}:</span>
            <span className="text-text-primary">{f.value}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        ))}

        {chips.length > 0 && (
          <div className="ml-2 flex items-center gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="flex items-center gap-1.5 rounded-full border border-accent-secondary/40 bg-accent-secondary/10 px-2.5 py-1 text-[11px] text-accent-secondary"
              >
                {c}
                <button
                  onClick={() => setChips((prev) => prev.filter((p) => p !== c))}
                  aria-label={`Remove ${c}`}
                  className="hover:text-text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-scrim px-3 py-1.5 text-xs text-text-secondary transition hover:text-text-primary">
            Saved Views <ChevronDown className="h-3 w-3" />
          </button>
          <button aria-label="Favorite" className="rounded-full border border-border-subtle bg-scrim p-1.5 text-text-secondary transition hover:text-status-watchlist">
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setChips([])}
            className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-scrim px-3 py-1.5 text-xs text-text-secondary transition hover:text-text-primary"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}