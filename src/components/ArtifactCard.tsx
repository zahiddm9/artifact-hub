import Link from "next/link";
import { FileText, Image, Code, Calendar, ArrowUpRight } from "lucide-react";
import type { Artifact } from "@/types";

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; cls: string }> = {
  pdf:   { icon: FileText, label: "PDF",   cls: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  image: { icon: Image,    label: "Image", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  html:  { icon: Code,     label: "HTML",  cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

export function ArtifactCard({ artifact, isOwnerView = false }: { artifact: Artifact; isOwnerView?: boolean }) {
  const config = TYPE_CONFIG[artifact.type] ?? { icon: FileText, label: artifact.type.toUpperCase(), cls: "bg-secondary text-muted-foreground border-border" };
  const { icon: TypeIcon, label, cls } = config;

  return (
    <Link
      href={`/artifacts/${artifact.id}${isOwnerView ? "?view=owner" : ""}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 ease-out hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 card-glow"
    >
      {/* Title + badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-card-foreground text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {artifact.title}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-all duration-200 ${cls}`}>
            <TypeIcon className="h-3 w-3" />
            {label}
          </span>
          {artifact.visibility === "unlisted" && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Unlisted
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {artifact.description && (
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
          {artifact.description}
        </p>
      )}

      {/* Tags */}
      {artifact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {artifact.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-secondary/80 hover:text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Calendar className="h-3.5 w-3.5" />
          <time>
            {new Date(artifact.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        <ArrowUpRight
          className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"
        />
      </div>
    </Link>
  );
}
