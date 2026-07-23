"use client";

import { useRef } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Plus,
  Upload,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { uploadAcceptAttribute } from "@/lib/documents/formats";

export type WebSourceItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  trustLabel: string;
};

export type SourceSearchEngine = "scholar" | "google" | "duckduckgo";

function trustBadgeTone(trustLabel: string) {
  if (trustLabel === "Verified") {
    return "bg-[rgba(121,247,199,0.18)] text-[var(--accent-mint)]";
  }
  if (trustLabel === "Scholar") {
    return "bg-[rgba(57,208,255,0.18)] text-[var(--accent-sky)]";
  }
  if (trustLabel === "Trusted") {
    return "bg-[rgba(255,209,102,0.18)] text-[var(--accent-gold)]";
  }
  return "bg-white/10 text-[var(--fg)]";
}

export type SourceModalProps = {
  sourceModalReason: string;
  sourceModalMode: "upload" | "web";
  sourceSearchResults: WebSourceItem[];
  sourceModalLoading: boolean;
  sourceModalError: string;
  sourceSearchWarning: string;
  sourceResultFilter: "all" | "verified" | "scholar" | "open_web";
  filteredSourceResults: WebSourceItem[];
  visibleSourceResults: number;
  visibleSourceSearchResults: WebSourceItem[];
  importingSourceId: string | null;
  uploading: boolean;
  uploadProgress: number;
  onClose: () => void;
  onSetSourceModalMode: (mode: "upload" | "web") => void;
  onSetSourceResultFilter: (filter: "all" | "verified" | "scholar" | "open_web") => void;
  onSetVisibleSourceResults: (updater: (current: number) => number) => void;
  onImportWebSource: (source: WebSourceItem) => void;
  onUploadFiles: (files: FileList | File[] | null) => void;
};

export function SourceModal({
  sourceModalReason,
  sourceModalMode,
  sourceSearchResults,
  sourceModalLoading,
  sourceModalError,
  sourceSearchWarning,
  sourceResultFilter,
  filteredSourceResults,
  visibleSourceResults,
  visibleSourceSearchResults,
  importingSourceId,
  uploading,
  uploadProgress,
  onClose,
  onSetSourceModalMode,
  onSetSourceResultFilter,
  onSetVisibleSourceResults,
  onImportWebSource,
  onUploadFiles,
}: SourceModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(2,6,23,0.6)] px-4 py-6 backdrop-blur-sm">
      <div className="panel panel-border relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-coral)]">
              Add Notes
            </p>
            <h3 className="mt-1 text-lg font-semibold">Upload notes, PDFs, documents, or screenshots</h3>
            <p className="muted mt-2 text-sm">{sourceModalReason}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass inline-flex rounded-full p-2.5"
            aria-label="Close source modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="hide-scrollbar flex-1 overflow-auto p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSetSourceModalMode("upload")}
              className="rounded-full bg-[linear-gradient(135deg,rgba(255,125,89,0.22),rgba(57,208,255,0.18))] px-4 py-2 text-sm font-medium transition"
            >
              <Upload className="mr-2 inline h-4 w-4" />
              Upload notes
            </button>
          </div>

          <div className="mt-4 rounded-[26px] bg-white/8 p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-white/12 px-4 py-8 text-sm font-medium transition hover:bg-white/18"
              >
                <Upload className="h-4 w-4" />
                Browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={uploadAcceptAttribute}
                className="hidden"
                onChange={(event) => {
                  onUploadFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <div className="flex-[1.4] rounded-[20px] border border-dashed border-white/16 bg-black/10 p-4 text-sm">
                <p className="font-semibold">Supported study notes</p>
                <p className="muted mt-2">
                  Upload PDFs, images, text files, and common documents here. Web research stays inside the Studio search tab so it does not mix with note uploads.
                </p>
              </div>
            </div>

            {uploading ? (
              <div className="mt-4 rounded-[20px] bg-white/10 p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <p className="font-semibold">Uploading sources...</p>
                  <p className="muted text-xs">{Math.round(uploadProgress)}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/10">
                  <motion.div
                    className="h-full bg-[linear-gradient(135deg,var(--accent-coral),var(--accent-sky))]"
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {sourceModalError ? (
              <div className="mt-4 rounded-[20px] bg-[rgba(255,125,89,0.14)] px-4 py-3 text-sm">
                {sourceModalError}
              </div>
            ) : null}

            {sourceSearchWarning ? (
              <div className="mt-4 rounded-[20px] bg-[rgba(255,209,102,0.12)] px-4 py-3 text-sm text-[rgba(255,248,229,0.96)]">
                {sourceSearchWarning}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {sourceModalMode === "web" && sourceSearchResults.length ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "all", label: "All sources" },
                      { key: "verified", label: "Verified only" },
                      { key: "scholar", label: "Scholar + trusted" },
                      { key: "open_web", label: "Open web" }
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => {
                          onSetSourceResultFilter(filter.key as "all" | "verified" | "scholar" | "open_web");
                          onSetVisibleSourceResults(() => 12);
                        }}
                        className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                          sourceResultFilter === filter.key
                            ? "bg-[linear-gradient(135deg,rgba(255,125,89,0.24),rgba(57,208,255,0.2))]"
                            : "bg-white/10"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <p className="muted">
                      {filteredSourceResults.length} result{filteredSourceResults.length === 1 ? "" : "s"} after filters
                    </p>
                    {sourceResultFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => onSetSourceResultFilter("all")}
                        className="rounded-full bg-white/10 px-3 py-2 font-medium transition hover:bg-white/14"
                      >
                        Clear filter
                      </button>
                    ) : null}
                  </div>

                  {visibleSourceSearchResults.length ? visibleSourceSearchResults.map((result, index) => (
                    <div key={`${result.id}-${result.url}-${index}`} className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{result.title}</p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${trustBadgeTone(result.trustLabel)}`}
                            >
                              {(result.trustLabel === "Verified" || result.trustLabel === "Scholar") ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Globe2 className="h-3 w-3" />
                              )}
                              {result.trustLabel}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">{result.source}</span>
                          </div>
                          <p className="muted mt-2 text-xs leading-5">{result.snippet}</p>
                          {result.trustLabel === "Web" ? (
                            <p className="mt-2 text-[11px] text-[rgba(255,248,229,0.82)]">
                              Open-web result. Double-check it before revising from it.
                            </p>
                          ) : null}
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noreferrer"
                            className="muted mt-3 inline-flex items-center gap-2 text-xs hover:text-[var(--fg)]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {result.url}
                          </a>
                        </div>
                        <Button
                          onClick={() => onImportWebSource(result)}
                          className="justify-center md:min-w-[9rem]"
                          disabled={importingSourceId === result.id}
                        >
                          {importingSourceId === result.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
                          Add source
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[22px] border border-dashed border-white/12 bg-white/6 px-4 py-6 text-sm">
                      <p className="font-semibold">No sources match this filter yet.</p>
                      <p className="muted mt-2">
                        Try another filter, switch the search engine, or broaden the search wording so Scholar mode can return stronger results.
                      </p>
                    </div>
                  )}

                  {filteredSourceResults.length > visibleSourceResults ? (
                    <div className="flex justify-center pt-1">
                      <Button
                        onClick={() => onSetVisibleSourceResults((current) => current + 12)}
                        variant="secondary"
                        size="sm"
                      >
                        More sources
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : sourceModalMode === "web" && !sourceModalLoading ? (
                <div className="rounded-[22px] border border-dashed border-white/12 bg-white/6 px-4 py-6 text-sm">
                  <p className="font-semibold">Search for a scholar-style source, trusted explainer, article, or reference page.</p>
                  <p className="muted mt-2">
                    Scholar mode is the default, and you can switch to Google or DuckDuckGo if you want a wider search. Imported web sources become part of this studio just like uploaded notes, so chat and tools stay source-grounded.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
