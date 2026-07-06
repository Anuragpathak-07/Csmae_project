import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  serverGetHealth,
  serverGetFiles,
  serverGetRegions,
  serverGetScorecard,
  serverGetMetrics,
  serverGetPivot,
  serverGetResults,
  serverRunPipeline,
  serverDeleteFile,
  serverUploadFiles,
} from "@/lib/server-fns";

const IS_DEV = import.meta.env.DEV;

// ── Query keys ────────────────────────────────────────────────────────────────
export const QK = {
  health:    ["health"]                                 as const,
  files:     ["files"]                                  as const,
  regions:   ["regions"]                                as const,
  results:   ["results"]                                as const,
  scorecard: (region?: string) => ["scorecard", region] as const,
  metrics:   (params?: object) => ["metrics",   params] as const,
  pivot:     (region: string)  => ["pivot",     region] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useHealth() {
  return useQuery({
    queryKey: QK.health,
    queryFn:  IS_DEV ? () => serverGetHealth() : api.health,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useFiles() {
  return useQuery({
    queryKey: QK.files,
    queryFn:  IS_DEV ? () => serverGetFiles() : api.files,
    staleTime: 30_000,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: QK.regions,
    queryFn:  IS_DEV ? () => serverGetRegions() : api.regions,
    staleTime: 5 * 60_000,
  });
}

export function useScorecard(region?: string) {
  return useQuery({
    queryKey: QK.scorecard(region),
    queryFn:  IS_DEV ? () => serverGetScorecard({ data: region }) : () => api.scorecard(region),
    staleTime: 2 * 60_000,
  });
}

export function useMetrics(params?: Parameters<typeof api.metrics>[0]) {
  return useQuery({
    queryKey: QK.metrics(params),
    queryFn:  IS_DEV
      ? () => serverGetMetrics({ data: params ?? {} })
      : () => api.metrics(params),
    staleTime: 2 * 60_000,
  });
}

export function usePivot(region: string) {
  return useQuery({
    queryKey: QK.pivot(region),
    queryFn:  IS_DEV
      ? () => serverGetPivot({ data: { region } })
      : () => api.pivot(region),
    staleTime: 2 * 60_000,
    enabled: !!region,
  });
}

export function useAllResults() {
  return useQuery({
    queryKey: QK.results,
    queryFn:  IS_DEV ? () => serverGetResults({ data: 1000 }) : () => api.results(1000),
    staleTime: 2 * 60_000,
  });
}

// ── Run pipeline mutation ──────────────────────────────────────────────────────
export function useRunPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: IS_DEV ? () => serverRunPipeline() : api.run,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.scorecard() });
      qc.invalidateQueries({ queryKey: QK.results });
      qc.invalidateQueries({ queryKey: QK.regions });
    },
  });
}

// ── Upload files mutation ─────────────────────────────────────────────────────
export function useUploadFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      if (IS_DEV) {
        const encoded = await Promise.all(
          files.map(async (f) => {
            const buf    = await f.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            return { name: f.name, type: f.type, base64 };
          })
        );
        return serverUploadFiles({ data: encoded });
      }
      return api.uploadFiles(files);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.files });
    },
  });
}

// ── Delete file mutation ──────────────────────────────────────────────────────
export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) =>
      IS_DEV ? serverDeleteFile({ data: filename }) : api.deleteFile(filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.files });
    },
  });
}
