import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Globe2,
  BarChart3,
  ShieldAlert,
  Sparkles,
  Trophy,
  TrendingUp,
  GitBranch,
  Settings,
  ChevronsLeft,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/map", label: "Global Map", icon: Globe2 },
  { to: "/attainment-matrix", label: "Performance", icon: BarChart3 },
  { to: "/gap-recovery", label: "Gap Recovery", icon: ShieldAlert },
  { to: "/ai-insights", label: "AI Insights", icon: Sparkles },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/trends", label: "Trend & Forecast", icon: TrendingUp },
  { to: "/traceability", label: "Source Traceability", icon: GitBranch },
] as const;

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={`sticky top-4 z-30 mt-4 ml-4 hidden shrink-0 self-start lg:block`}
      style={{ height: "calc(100vh - 2rem)" }}
    >
      <div
        className={`glass-panel flex h-full flex-col p-3 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-accent-secondary/10 text-text-primary"
                    : "text-text-secondary hover:bg-film-strong hover:text-text-primary"
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r"
                    style={{
                      background: "var(--accent-primary)",
                      boxShadow: "0 0 12px var(--accent-glow)",
                    }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 border-t border-border-subtle pt-2">
          <Link
            to="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              pathname === "/settings"
                ? "bg-accent-secondary/10 text-text-primary"
                : "text-text-secondary hover:bg-film-strong hover:text-text-primary"
            }`}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-muted transition hover:text-text-primary"
            aria-label="Toggle sidebar"
          >
            <ChevronsLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span className="text-[11px]">Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}