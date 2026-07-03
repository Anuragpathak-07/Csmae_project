import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({ meta: [{ title: "Settings — OCC" }, { name: "description", content: "Manage account, notification preferences, saved views, and workspace settings." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings" title="Workspace Preferences" subtitle="Manage your account, notifications, and saved views." />

      <div className="space-y-6">
        <Section title="Account">
          <Field label="Name" value="Alex Kim" />
          <Field label="Email" value="alex.kim@company.com" />
          <Field label="Role" value="Global Operations Lead · SSO" />
        </Section>

        <Section title="Notification Preferences">
          <Toggle label="Behind Plan alerts" defaultOn />
          <Toggle label="Watchlist digest (daily)" defaultOn />
          <Toggle label="Recovery opportunity nudges" />
          <Toggle label="AI anomaly notifications" defaultOn />
        </Section>

        <Section title="Saved Views">
          <div className="text-sm text-text-secondary">No saved views yet. Favorite a filter combination from any page to save it here.</div>
        </Section>

        <Section title="Theme">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-primary">Dark Blue Noir</div>
              <div className="text-xs text-text-muted">Locked as default — more themes coming soon</div>
            </div>
            <div className="cursor-not-allowed rounded-full border border-border-subtle bg-scrim px-3 py-1 text-xs text-text-muted" title="More themes coming soon">
              Locked
            </div>
          </div>
        </Section>

        <Section title="Export / API Access">
          <div className="text-sm text-text-secondary">Programmatic access and scheduled exports coming soon.</div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-6">
      <h2 className="text-display mb-4 text-base font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3 last:border-0 last:pb-0">
      <div className="text-sm text-text-muted">{label}</div>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-text-primary">{label}</div>
      <div className={`relative h-5 w-9 rounded-full transition ${defaultOn ? "bg-accent-primary" : "bg-hairline-strong"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${defaultOn ? "left-4" : "left-0.5"}`} />
      </div>
    </div>
  );
}