"use client";

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
  const currentType = searchParams.get("type") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilter = currentType || currentTag;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update("type", value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              currentType === value
                ? "bg-zinc-900 text-white"
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
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />

      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-900 underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
