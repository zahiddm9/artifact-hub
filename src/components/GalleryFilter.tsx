"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Layers, FileText, Image, Code } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import type { Artifact, ArtifactType } from "@/types";

/*
 * TAG FILTERING — CLIENT-SIDE (current phase)
 *
 * Why this is acceptable now: the gallery is a bounded, single-tenant dataset
 * (tens to low hundreds of artifacts). Fetching all type-filtered records and
 * filtering tags in the browser is imperceptible at this scale and avoids a
 * round-trip per keystroke.
 *
 * Production-scale path: replace the client-side filter below with a debounced
 * server-side search. Options in order of complexity:
 *   1. Postgres GIN index on the `tags` array + pg_trgm for case-insensitive
 *      prefix matching (`WHERE EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE $1)`).
 *      Fits a single-table model with moderate tag cardinality.
 *   2. Normalized `artifact_tags(artifact_id, tag)` table with a btree index on
 *      lower(tag). Enables efficient exact + prefix queries and tag analytics.
 *   3. Postgres full-text search or trigram index on a `tags_tsv` generated column
 *      if tags are long phrases rather than short slugs.
 *   4. Dedicated search service (Typesense, Meilisearch, or Elasticsearch) if the
 *      catalog grows past ~10k artifacts or requires faceting, ranking, and typo
 *      tolerance.
 *
 * To migrate: replace `useLocalTagFilter` with a debounced `useSearchParams` push
 * and move the filtering back into `listArtifacts` (or a new `searchArtifacts`
 * service function). The component's prop interface and render tree stay the same.
 */

const TYPES: { value: ArtifactType | ""; label: string; icon: typeof Layers }[] = [
  { value: "",      label: "All",   icon: Layers },
  { value: "pdf",   label: "PDF",   icon: FileText },
  { value: "image", label: "Image", icon: Image },
  { value: "html",  label: "HTML",  icon: Code },
];

interface Props {
  artifacts: Artifact[];
}

export function GalleryFilter({ artifacts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? "";

  // Local state: decoupled from URL so typing never triggers router.push.
  // Initialised once from the URL so a bookmarked ?tag= still pre-fills the input.
  const [tagInput, setTagInput] = useState(() => searchParams.get("tag") ?? "");

  // Client-side partial, case-insensitive tag filter.
  // Runs synchronously in the browser — no network round-trip per keystroke.
  const filteredArtifacts = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return artifacts;
    return artifacts.filter((a) =>
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [artifacts, tagInput]);

  const hasFilter = currentType || tagInput;

  // Type filter: discrete click → URL param → server re-fetch. Correct path for
  // access-controlled, visibility-filtered, server-authoritative data.
  function updateType(value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("type", value);
      else params.delete("type");
      // Drop tag from URL — it lives in local state; no need to round-trip it.
      params.delete("tag");
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearAll() {
    setTagInput("");
    router.push(pathname);
  }

  return (
    <>
      {/* Filter row */}
      <div className="mb-8 flex flex-wrap items-center gap-3" aria-busy={isPending}>
        {/* Type filter — server-side via URL */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          {TYPES.map(({ value, label, icon: Icon }) => {
            const isActive = currentType === value;
            return (
              <button
                key={value}
                onClick={() => updateType(value)}
                disabled={isPending}
                className={`relative flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-primary" : ""}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tag search — client-side, local state only, no router.push per keystroke */}
        <input
          type="text"
          placeholder="Filter by tag…"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {hasFilter && (
          <button
            onClick={clearAll}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground underline cursor-pointer"
          >
            Clear
          </button>
        )}

        {/* Spinner only fires on type-filter navigation, not on tag keystrokes */}
        {isPending && (
          <svg
            className="h-4 w-4 animate-spin text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Results — rendered here so tag filtering never leaves this component */}
      {filteredArtifacts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {tagInput ? `No artifacts match "${tagInput}".` : "No artifacts found."}
          </p>
          {!tagInput && (
            <Link
              href="/publish"
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Publish the first one
            </Link>
          )}
          {tagInput && (
            <button
              onClick={() => setTagInput("")}
              className="mt-4 text-sm text-primary transition-colors hover:text-primary/80 underline cursor-pointer block mx-auto"
            >
              Clear tag filter
            </button>
          )}
        </div>
      ) : (
        <div
          className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-150 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          {filteredArtifacts.map((artifact, index) => (
            <div
              key={artifact.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ArtifactCard artifact={artifact} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
