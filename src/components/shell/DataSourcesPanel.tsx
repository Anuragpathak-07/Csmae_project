import { useRef, useState, useCallback } from "react";
import { X, Upload, Trash2, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useFiles, useUploadFiles, useDeleteFile, useRunPipeline } from "@/hooks/useApi";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DataSourcesPanel({ open, onClose }: Props) {
  const { data: filesData, isLoading: loadingFiles, isError: filesError, refetch: refetchFiles } = useFiles();
  const { mutateAsync: uploadFiles, isPending: uploading } = useUploadFiles();
  const { mutate: deleteFile, isPending: deleting } = useDeleteFile();
  const { mutate: runPipeline, isPending: running, isSuccess: runSuccess } = useRunPipeline();

  const [dragOver, setDragOver]   = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter((f) =>
      /\.(xlsx|xlsb|xls)$/i.test(f.name)
    );
    const invalid = files.length - valid.length;
    if (valid.length === 0) {
      setUploadMsg({ type: "err", text: "Only .xlsx, .xlsb, and .xls files are accepted." });
      return;
    }
    setUploadMsg(null);
    try {
      const result = await uploadFiles(valid);
      const msg = `${result.uploaded} of ${result.total} file(s) uploaded successfully.${invalid > 0 ? ` ${invalid} skipped (wrong format).` : ""}`;
      setUploadMsg({ type: "ok", text: msg });
    } catch (err) {
      const msg = err instanceof TypeError && String(err).includes("fetch")
        ? "Network error — browser is blocking the request (CORS). Open the app from the Dataiku URL instead of localhost."
        : `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`;
      setUploadMsg({ type: "err", text: msg });
    }
  }, [uploadFiles]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDelete = (filename: string) => {
    setDeletingFile(filename);
    deleteFile(filename, {
      onSettled: () => setDeletingFile(null),
    });
  };

  const files = filesData?.files ?? [];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--surface-panel)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div>
            <h2 className="text-display text-base font-semibold text-text-primary">Data Sources</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Upload Excel files and run the consolidation pipeline
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-film-strong hover:text-text-primary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-6">

          {/* ── Drop zone ───────────────────────────────────────────────── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition
              ${dragOver
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                : "border-hairline-strong hover:border-[var(--accent-primary)]/60 hover:bg-film"
              }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10">
              <Upload className="h-5 w-5 text-[var(--accent-primary)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">
                {uploading ? "Uploading…" : "Drop files here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Supports .xlsx, .xlsb, .xls
              </p>
            </div>
            {uploading && <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xlsb,.xls"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Upload feedback */}
          {uploadMsg && (
            <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm
              ${uploadMsg.type === "ok"
                ? "bg-[var(--status-onplan)]/10 text-[var(--status-onplan)]"
                : "bg-[var(--status-behind)]/10 text-[var(--status-behind)]"
              }`}
            >
              {uploadMsg.type === "ok"
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                : <AlertCircle  className="mt-0.5 h-4 w-4 shrink-0" />
              }
              {uploadMsg.text}
            </div>
          )}

          {/* ── Run pipeline ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => runPipeline()}
            disabled={running || files.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Running pipeline… (may take 5–15 min)" : runSuccess ? "✓ Pipeline completed" : "Run Consolidation Pipeline"}
          </button>

          {/* ── File list ────────────────────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Files in folder ({files.length})
              </span>
              <button
                type="button"
                onClick={() => refetchFiles()}
                className="text-[11px] text-text-muted hover:text-text-secondary transition"
              >
                Refresh
              </button>
            </div>

            {loadingFiles ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
              </div>
            ) : filesError ? (
              <div className="rounded-lg border border-dashed border-hairline px-4 py-6 text-center text-sm text-[var(--status-behind)]">
                Could not load files — backend unreachable. If running locally, open the app from the Dataiku webapp URL instead of localhost.
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-lg border border-dashed border-hairline px-4 py-6 text-center text-sm text-text-muted">
                No Excel files found in the folder. Upload files above to get started.
              </div>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li
                    key={f.path}
                    className="flex items-center gap-3 rounded-lg border border-hairline bg-film px-4 py-3"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--accent-secondary)]" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary" title={f.name}>
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(f.name)}
                      disabled={deleting && deletingFile === f.name}
                      className="shrink-0 rounded p-1 text-text-muted transition hover:bg-[var(--status-behind)]/10 hover:text-[var(--status-behind)] disabled:opacity-40"
                      title={`Delete ${f.name}`}
                    >
                      {deleting && deletingFile === f.name
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
