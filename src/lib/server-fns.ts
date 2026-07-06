"use server";
import { createServerFn } from "@tanstack/react-start";

// Vite loads .env into process.env on the server side
const DATAIKU_BASE: string =
  (process.env["VITE_API_BASE_URL"] as string) ||
  (import.meta.env["VITE_API_BASE_URL"] as string) ||
  "https://dss-12105a11-1a862179-dku.us-east-1.app.dataiku.io/web-apps-backends/CSAME_DAILY_OPERATIONS/KDCvPHn";

const API_KEY: string =
  (process.env["VITE_API_KEY"] as string) ||
  (import.meta.env["VITE_API_KEY"] as string) ||
  "";

async function dkuFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${DATAIKU_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Debug (remove after confirming env vars work) ─────────────────────────────
export const serverDebugEnv = createServerFn({ method: "GET" }).handler(() => ({
  base_url:     DATAIKU_BASE,
  key_length:   API_KEY.length,
  key_preview:  API_KEY ? `${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)}` : "EMPTY",
}));

// ── GET endpoints ─────────────────────────────────────────────────────────────

export const serverGetHealth = createServerFn({ method: "GET" }).handler(() =>
  dkuFetch("/health")
);

export const serverGetFiles = createServerFn({ method: "GET" }).handler(() =>
  dkuFetch("/api/files")
);

export const serverGetRegions = createServerFn({ method: "GET" }).handler(() =>
  dkuFetch("/api/regions")
);

export const serverGetResults = createServerFn({ method: "GET" })
  .validator((limit: number) => limit)
  .handler(({ data: limit }) => dkuFetch(`/api/results?limit=${limit}`));

export const serverGetScorecard = createServerFn({ method: "GET" })
  .validator((region: string | undefined) => region)
  .handler(({ data: region }) =>
    dkuFetch(region ? `/api/results/scorecard?region=${encodeURIComponent(region)}` : "/api/results/scorecard")
  );

export const serverGetMetrics = createServerFn({ method: "GET" })
  .validator((params: { region?: string; metric_category?: string; date_from?: string; date_to?: string; limit?: number }) => params)
  .handler(({ data: params }) => {
    const q = new URLSearchParams();
    if (params.region)          q.set("region",          params.region);
    if (params.metric_category) q.set("metric_category", params.metric_category);
    if (params.date_from)       q.set("date_from",       params.date_from);
    if (params.date_to)         q.set("date_to",         params.date_to);
    if (params.limit)           q.set("limit",           String(params.limit));
    return dkuFetch(`/api/results/metrics?${q}`);
  });

export const serverGetPivot = createServerFn({ method: "GET" })
  .validator((params: { region: string; metric_category?: string }) => params)
  .handler(({ data: { region, metric_category } }) => {
    const q = metric_category ? `?metric_category=${encodeURIComponent(metric_category)}` : "";
    return dkuFetch(`/api/results/pivot/${encodeURIComponent(region)}${q}`);
  });

// ── POST / DELETE endpoints ───────────────────────────────────────────────────

export const serverRunPipeline = createServerFn({ method: "POST" }).handler(() =>
  dkuFetch("/api/run", { method: "POST", body: "{}" })
);

export const serverDeleteFile = createServerFn({ method: "POST" })
  .validator((filename: string) => filename)
  .handler(({ data: filename }) =>
    dkuFetch(`/api/files/${encodeURIComponent(filename)}`, { method: "DELETE" })
  );

// ── File upload (base64 → multipart on server) ────────────────────────────────

export const serverUploadFiles = createServerFn({ method: "POST" })
  .validator((files: Array<{ name: string; type: string; base64: string }>) => files)
  .handler(async ({ data: files }) => {
    const { FormData, Blob } = await import("node:buffer").then(() => globalThis);
    const form = new FormData();
    for (const f of files) {
      const bytes  = Buffer.from(f.base64, "base64");
      const blob   = new Blob([bytes], { type: f.type });
      form.append("files", blob, f.name);
    }
    const res = await fetch(`${DATAIKU_BASE}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Upload ${res.status}: ${await res.text()}`);
    return res.json();
  });
