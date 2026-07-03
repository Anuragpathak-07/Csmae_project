import { Link } from "@tanstack/react-router";
import { Bell, Download } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-4 z-40 mx-4 mt-4">
      <div className="glass-panel flex items-center gap-4 px-5 py-2.5">
        {/* Brand */}
        <Link to="/overview" className="flex items-center gap-2.5 shrink-0">
          <div
            className="h-6 w-6 rotate-45 rounded-sm"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              boxShadow: "0 0 18px var(--accent-glow)",
            }}
          />
          <span className="text-display text-[13px] font-semibold tracking-tight text-text-primary hidden sm:block">
            Carrier Operations
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Month chip */}
        <span className="hidden rounded-full border border-hairline bg-film px-3 py-1 text-[11px] font-medium text-text-secondary md:block">
          May 2026
        </span>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <IconBtn ariaLabel="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-status-behind" />
          </IconBtn>
          <IconBtn ariaLabel="Export">
            <Download className="h-4 w-4" />
          </IconBtn>
          <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-accent-primary/10 text-[11px] font-semibold text-accent-secondary">
            AK
          </div>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-film-strong hover:text-text-primary"
    >
      {children}
    </button>
  );
}