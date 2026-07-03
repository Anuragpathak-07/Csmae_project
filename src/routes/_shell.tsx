import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppBackground } from "@/components/shell/Background";
import { AppHeader } from "@/components/shell/Header";
import { AppSidebar } from "@/components/shell/Sidebar";
import { FilterRibbon } from "@/components/shell/FilterRibbon";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

const HIDE_FILTER_ROUTES = new Set(["/settings", "/overview", "/attainment-matrix", "/map"]);

function ShellLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideFilters = HIDE_FILTER_ROUTES.has(pathname);

  return (
    <div className="relative min-h-screen text-text-primary">
      <AppBackground />
      <div className="flex">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <AppHeader />
          {!hideFilters && <FilterRibbon />}
          <main className={`mx-4 mb-12 lg:mr-6 ${hideFilters ? "mt-5" : "mt-4"}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}