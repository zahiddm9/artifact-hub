import Link from "next/link";
import type { Artifact } from "@/types";

const TYPE_LABELS: Record<string, string> = { pdf: "PDF", image: "Image", html: "HTML" };

const TYPE_BADGE: Record<string, string> = {
  pdf: "bg-red-50 text-red-700 ring-red-600/20",
  image: "bg-blue-50 text-blue-700 ring-blue-600/20",
  html: "bg-green-50 text-green-700 ring-green-600/20",
};

export function ArtifactCard({ artifact }: { artifact: Artifact }) {
  return (
    <Link
      href={`/artifacts/${artifact.id}`}
      className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-zinc-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-zinc-900 leading-snug line-clamp-2">
          {artifact.title}
        </h3>
        <span
          className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_BADGE[artifact.type] ?? "bg-zinc-50 text-zinc-700 ring-zinc-600/20"}`}
        >
          {TYPE_LABELS[artifact.type] ?? artifact.type.toUpperCase()}
        </span>
      </div>

      {artifact.description && (
        <p className="mt-2 text-sm text-zinc-500 line-clamp-3">{artifact.description}</p>
      )}

      {artifact.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {artifact.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-auto pt-3 text-xs text-zinc-400">
        {new Date(artifact.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </Link>
  );
}
