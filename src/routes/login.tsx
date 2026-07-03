import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppBackground } from "@/components/shell/Background";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Operations Command Center" },
      { name: "description", content: "SSO sign-in for the Global Operations Command Center." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 text-text-primary">
      <AppBackground />
      <div className="glass-panel relative w-full max-w-md p-10">
        <div className="mb-8 flex items-center gap-3">
          <div
            className="h-9 w-9 rotate-45 rounded-md"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              boxShadow: "0 0 32px var(--accent-glow)",
            }}
          />
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent-secondary">
              Enterprise Access
            </div>
            <div className="text-display text-lg font-semibold">Operations Command Center</div>
          </div>
        </div>

        <h1 className="text-display gradient-text-blue text-3xl font-semibold tracking-tight">
          Sign in to your global operations workspace
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Continue with your organization's single sign-on to access live production, shipment, and execution intelligence.
        </p>

        <button
          onClick={() => navigate({ to: "/overview" })}
          className="shiny-cta mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
        >
          Continue with SSO <ArrowRight className="h-4 w-4" />
        </button>

        {/* TODO: Replace with real SSO/OAuth provider integration (Azure AD / Okta / SAML) */}

        <p className="mt-6 text-center text-xs text-text-muted">
          Trouble signing in?{" "}
          <a href="#" className="text-accent-secondary hover:underline">
            Contact IT Support
          </a>
        </p>
      </div>
    </div>
  );
}