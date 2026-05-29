"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Layers, FileText, Image, Code } from "lucide-react";
import type { ArtifactType } from "@/types";

const TYPES: { value: ArtifactType | ""; label: string; icon: typeof Layers }[] = [
  { value: "",      label: "All",   icon: Layers },
  { value: "pdf",   label: "PDF",   icon: FileText },
  { value: "image", label: "Image", icon: Image },
  { value: "html",  label: "HTML",  icon: Code },
];

export function GalleryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentType = searchParams.get("type") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  function update(key: string, value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilter = currentType || currentTag;

  return (
    <div className="flex flex-wrap items-center gap-3" aria-busy={isPending}>
      {/* Type filter pill group */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
        {TYPES.map(({ value, label, icon: Icon }) => {
          const isActive = currentType === value;
          return (
            <button
              key={value}
              onClick={() => update("type", value)}
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

      {/* Tag search */}
      <input
        type="text"
        placeholder="Filter by tag…"
        value={currentTag}
        onChange={(e) => update("tag", e.target.value)}
        className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
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
  );
}
