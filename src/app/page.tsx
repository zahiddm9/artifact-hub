import { Suspense } from "react";
import Link from "next/link";
import { listArtifacts } from "@/lib/services/artifacts";
import { GalleryFilter } from "@/components/GalleryFilter";
import { Header } from "@/components/Header";
import type { ArtifactType } from "@/types";

// Bounded dataset assumption: fetch enough records for client-side tag filtering.
// Safe while the public artifact count stays well below this number.
// When approaching this limit, replace client-side tag filtering with debounced
// server-side search (see GalleryFilter.tsx for the production migration path).
const GALLERY_CLIENT_FILTER_LIMIT = 500;

interface Props {
  searchParams: Promise<{ type?: string; view?: string }>;
}

export default async function GalleryPage({ searchParams }: Props) {
  const { type, view } = await searchParams;
  const isOwnerView = view === "owner";

  // Type filter is server-authoritative: visibility, access control, and
  // pagination stay here. Tag search is handled client-side — see GalleryFilter.
  const result = await listArtifacts({
    visibility: isOwnerView ? undefined : "public",
    type: (type as ArtifactType) || undefined,
    limit: GALLERY_CLIENT_FILTER_LIMIT,
  });

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            Failed to load artifacts: {result.message}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showPublish={isOwnerView} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gallery</h1>
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 text-sm">
              <Link
                href={type ? `/?type=${type}` : "/"}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  !isOwnerView
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Visitor
              </Link>
              <Link
                href={type ? `/?view=owner&type=${type}` : "/?view=owner"}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isOwnerView
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Owner
              </Link>
            </div>
          </div>
          <p className="text-muted-foreground">Browse, review, and share content</p>
        </div>

        {isOwnerView && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Owner view — you can see and publish all artifacts including unlisted. In visitor view, the gallery is read-only and shows only public artifacts.
          </div>
        )}

        <Suspense fallback={null}>
          <GalleryFilter artifacts={result.data} isOwnerView={isOwnerView} />
        </Suspense>
      </main>
    </div>
  );
}
