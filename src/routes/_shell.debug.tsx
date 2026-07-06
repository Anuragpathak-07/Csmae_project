import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { serverDebugEnv } from "@/lib/server-fns";

export const Route = createFileRoute("/_shell/debug")({
  component: DebugPage,
});

function DebugPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["debug-env"],
    queryFn: () => serverDebugEnv(),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-xl p-8 font-mono text-sm">
      <h1 className="mb-4 text-lg font-bold text-text-primary">Server Env Debug</h1>
      {isLoading && <p className="text-text-muted">Loading…</p>}
      {error && <p className="text-red-500">Error: {String(error)}</p>}
      {data && (
        <pre className="rounded-lg bg-film p-4 text-text-secondary whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <p className="mt-4 text-xs text-text-muted">
        key_length should be &gt; 0. If EMPTY, the .env file is not being read.
      </p>
    </div>
  );
}
