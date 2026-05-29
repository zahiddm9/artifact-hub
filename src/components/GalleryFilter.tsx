"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Layers, FileText, Image, Code, Search } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import { DeleteCardButton } from "./DeleteCardButton";
import type { Artifact, ArtifactType } from "@/types";

/*
 * SEARCH ARCHITECTURE
 *
 * Name search: debounced → ?search= URL param → server re-fetch via Supabase ilike.
 * Tag search:  client-side prefix match over the server-fetched result set.
 *
 * Both share a single input. A mode toggle switches between them.
 *
 * Production-scale path for tag search: replace the client-side filter with a
 * debounced server-side query (GIN index on tags array or normalized tags table).
 * The component interface stays the same — only the effect wiring changes.
 */

const TYPES: { value: ArtifactType | ""; label: string; icon: typeof Layers }[] = [
  { value: "",      label: "All",   icon: Layers },
  { value: "pdf",   label: "PDF",   icon: FileText },
  { value: "image", label: "Image", icon: Image },
  { value: "html",  label: "HTML",  icon: Code },
];

interface Props {
  artifacts: Artifact[];
  isOwnerView?: boolean;
}

export function GalleryFilter({ artifacts, isOwnerView = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? "";
  const currentSearch = searchParams.get("search") ?? "";

  // Single search input shared by both modes
  const [query, setQuery] = useState(() => currentSearch);
  const [mode, setMode] = useState<"name" | "tag">(() =>
    currentSearch ? "name" : "name"
  );
  const isFirstQueryRender = useRef(true);

  // When mode switches to "tag": clear any ?search= URL param immediately
  useEffect(() => {
    if (mode === "tag") {
      const params = new URLSearchParams(searchParams.toString());
      if (params.has("search")) {
        params.delete("search");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Name mode: debounce query → ?search= URL param → server re-fetch
  useEffect(() => {
    if (isFirstQueryRender.current) { isFirstQueryRender.current = false; return; }
    if (mode !== "name") return;
    const timer = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) params.set("search", query.trim());
        else params.delete("search");
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Tag mode: client-side prefix match over the fetched result set
  const filteredArtifacts = useMemo(() => {
    if (mode !== "tag" || !query.trim()) return artifacts;
    const q = query.trim().toLowerCase();
    return artifacts.filter((a) =>
      a.tags.some((t) => t.toLowerCase().startsWith(q))
    );
  }, [artifacts, query, mode]);

  const hasFilter = currentType || query;

  function updateType(value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("type", value);
      else params.delete("type");
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearAll() {
    setQuery("");
    const currentView = searchParams.get("view");
    startTransition(() => {
      const params = new URLSearchParams();
      if (currentView) params.set("view", currentView);
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  function switchMode(next: "name" | "tag") {
    setQuery("");
    setMode(next);
  }

  return (
    <>
      {/* Filter row */}
      <div className="mb-8 flex flex-wrap items-center gap-3" aria-busy={isPending}>

        {/* Unified search bar with mode toggle */}
        <div className="flex items-center rounded-lg border border-border bg-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
          {/* Mode toggle */}
          <div className="flex border-r border-border">
            {(["name", "tag"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {m === "name" ? "Name" : "Tag"}
              </button>
            ))}
          </div>
          {/* Search icon + input */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={mode === "name" ? "Search by name…" : "Filter by tag…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-48"
            />
          </div>
        </div>

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

        {hasFilter && (
          <button
            onClick={clearAll}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground underline cursor-pointer"
          >
            Clear
          </button>
        )}

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

      {/* Results */}
      {filteredArtifacts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {query
              ? `No artifacts match "${query}".`
              : "No artifacts found."}
          </p>
          {!query && (
            <Link
              href="/publish"
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Publish the first one
            </Link>
          )}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="mt-4 text-sm text-primary transition-colors hover:text-primary/80 underline cursor-pointer block mx-auto"
            >
              Clear search
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
              className="relative animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ArtifactCard artifact={artifact} isOwnerView={isOwnerView} />
              {isOwnerView && <DeleteCardButton artifactId={artifact.id} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
