import { Suspense } from "react";
import { listArtifacts } from "@/lib/services/artifacts";
import { GalleryFilter } from "@/components/GalleryFilter";
import { Header } from "@/components/Header";
import type { ArtifactType } from "@/types";

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function GalleryPage({ searchParams }: Props) {
  const { type } = await searchParams;

  // Type filter is server-authoritative: visibility, access control, and
  // pagination stay here. Tag search is handled client-side — see GalleryFilter.
  const result = await listArtifacts({
    visibility: "public",
    type: (type as ArtifactType) || undefined,
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
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Gallery</h1>
          <p className="text-muted-foreground">Browse and manage your generated artifacts</p>
        </div>

        <Suspense fallback={null}>
          <GalleryFilter artifacts={result.data} />
        </Suspense>
      </main>
    </div>
  );
}
