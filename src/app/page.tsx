import { Suspense } from "react";
import Link from "next/link";
import { listArtifacts } from "@/lib/services/artifacts";
import { ArtifactCard } from "@/components/ArtifactCard";
import { GalleryFilter } from "@/components/GalleryFilter";
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
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-zinc-900 transition-colors duration-150 hover:text-zinc-600">
            Artifact Hub
          </Link>
          <Link
            href="/publish"
            className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Publish
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Gallery</h1>
          <Suspense fallback={null}>
            <GalleryFilter />
          </Suspense>
        </div>

        {!result.ok ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Failed to load artifacts: {result.message}
          </div>
        ) : artifacts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
            <p className="text-zinc-500">No artifacts found.</p>
            <Link
              href="/publish"
              className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-zinc-700"
            >
              Publish the first one
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
