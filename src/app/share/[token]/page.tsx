import Link from "next/link";
import { validateShareLink } from "@/lib/services/share";
import { listFeedback } from "@/lib/services/feedback";
import { getCachedSummary } from "@/lib/services/summarize";
import { getShareLinkArtifactUrl } from "@/lib/storage";
import { ArtifactPreview } from "@/components/ArtifactPreview";
import { FeedbackList } from "@/components/FeedbackList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { FeedbackSummary } from "@/components/FeedbackSummary";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const result = await validateShareLink(token);

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-zinc-900">
            {result.status === 410 ? "Link expired" : "Link not found"}
          </h1>
          <p className="mt-2 text-zinc-500">
            {result.status === 410
              ? "This share link has expired and can no longer be used."
              : "This share link is invalid or has been removed."}
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-zinc-600 underline hover:text-zinc-900">
            Browse gallery
          </Link>
        </div>
      </div>
    );
  }

  const { artifact, expires_at } = result.data;

  const [signedUrl, feedbackResult, cachedSummary] = await Promise.all([
    getShareLinkArtifactUrl(artifact.storage_path, expires_at).catch(() => ""),
    listFeedback(artifact.id),
    getCachedSummary(artifact.id),
  ]);

  const feedback = feedbackResult.ok ? feedbackResult.data : [];
  const expiresDate = new Date(expires_at);
  const isExpiringSoon = (expiresDate.getTime() - Date.now()) / 3_600_000 < 24;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-zinc-900 transition-colors duration-150 hover:text-zinc-600">
            Artifact Hub
          </Link>
          <span className="text-sm text-zinc-400">Shared artifact</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {isExpiringSoon && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This link expires{" "}
            {expiresDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{artifact.title}</h1>
          {artifact.description && <p className="mt-1 text-zinc-600">{artifact.description}</p>}
          {artifact.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {artifact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {signedUrl ? (
          <ArtifactPreview type={artifact.type} signedUrl={signedUrl} title={artifact.title} />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500">
            Preview unavailable.
          </div>
        )}

        {/* Feedback summary */}
        <FeedbackSummary
          artifactId={artifact.id}
          initialSummary={cachedSummary}
          feedbackCount={feedback.length}
        />

        {/* Feedback */}
        <section className="space-y-3">
          <h2 className="font-semibold text-zinc-900">
            Feedback{feedback.length > 0 ? ` (${feedback.length})` : ""}
          </h2>
          <FeedbackList feedback={feedback} />
          <FeedbackForm artifactId={artifact.id} />
        </section>
      </main>
    </div>
  );
}
