import { Suspense } from "react";
import Link from "next/link";
import { listArtifacts } from "@/lib/services/artifacts";
import { ArtifactCard } from "@/components/ArtifactCard";
import { GalleryFilter } from "@/components/GalleryFilter";
import { Header } from "@/components/Header";
import type { ArtifactType } from "@/types";

interface Props {
  searchParams: Promise<{ type?: string; tag?: string }>;
}

export default async function GalleryPage({ searchParams }: Props) {
  const { type, tag } = await searchParams;

  const result = await listArtifacts({
    visibility: "public",
    type: (type as ArtifactType) || undefined,
    tags: tag ? [tag] : undefined,
  });

  const artifacts = result.ok ? result.data : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Gallery</h1>
          <p className="text-muted-foreground">Browse and manage your generated artifacts</p>
        </div>

        <div className="mb-8">
          <Suspense fallback={null}>
            <GalleryFilter />
          </Suspense>
        </div>

        {!result.ok ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            Failed to load artifacts: {result.message}
          </div>
        ) : artifacts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No artifacts found.</p>
            <Link
              href="/publish"
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Publish the first one
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact, index) => (
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
      </main>
    </div>
  );
}
