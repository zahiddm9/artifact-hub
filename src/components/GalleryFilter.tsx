"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ArtifactType } from "@/types";

const TYPES: { value: ArtifactType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "html", label: "HTML" },
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
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update("type", value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              currentType === value
                ? "bg-violet-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Filter by tag…"
        value={currentTag}
        onChange={(e) => update("tag", e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-600"
      />

      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-900 underline"
        >
          Clear
        </button>
      )}

      {isPending && (
        <svg
          className="h-4 w-4 animate-spin text-zinc-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
    </div>
  );
}
