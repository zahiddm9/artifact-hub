import { notFound } from "next/navigation";
import Link from "next/link";
import { getArtifact } from "@/lib/services/artifacts";
import { getPublicArtifactUrl } from "@/lib/storage";
import { ArtifactPreview } from "@/components/ArtifactPreview";
import { ShareButton } from "@/components/ShareButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArtifactDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getArtifact(id);

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Error loading artifact.</p>
      </div>
    );
  }

  const artifact = result.data;

  // Unlisted artifacts are not accessible via direct URL — use a share link
  if (artifact.visibility === "unlisted") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-zinc-900">Not available</h1>
          <p className="mt-2 text-zinc-500">
            This artifact requires a share link to access.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-zinc-600 underline hover:text-zinc-900"
          >
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  let signedUrl = "";
  try {
    signedUrl = await getPublicArtifactUrl(artifact.storage_path);
  } catch {
    // Preview will show fallback
  }

  const TYPE_LABELS: Record<string, string> = { pdf: "PDF", image: "Image", html: "HTML" };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-zinc-900">
            Artifact Hub
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Gallery
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-zinc-900">{artifact.title}</h1>
              <span className="shrink-0 inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {TYPE_LABELS[artifact.type] ?? artifact.type}
              </span>
            </div>
            {artifact.description && (
              <p className="text-zinc-600">{artifact.description}</p>
            )}
            {artifact.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {artifact.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <ShareButton artifactId={artifact.id} />
        </div>

        {signedUrl ? (
          <ArtifactPreview
            type={artifact.type}
            signedUrl={signedUrl}
            title={artifact.title}
          />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
            Preview unavailable.
          </div>
        )}

        <p className="text-xs text-zinc-400">
          Published{" "}
          {new Date(artifact.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </main>
    </div>
  );
}
