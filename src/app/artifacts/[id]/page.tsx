import { notFound } from "next/navigation";
import Link from "next/link";
import { getArtifact } from "@/lib/services/artifacts";
import { listFeedback } from "@/lib/services/feedback";
import { getCachedSummary } from "@/lib/services/summarize";
import { getPublicArtifactUrl } from "@/lib/storage";
import { ArtifactPreview } from "@/components/ArtifactPreview";
import { ShareButton } from "@/components/ShareButton";
import { ArtifactActions } from "@/components/ArtifactActions";
import { FeedbackList } from "@/components/FeedbackList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { FeedbackSummary } from "@/components/FeedbackSummary";
import { Header } from "@/components/Header";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function ArtifactDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { view } = await searchParams;
  const isOwnerView = view === "owner";
  const result = await getArtifact(id);

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Error loading artifact.</p>
      </div>
    );
  }

  const artifact = result.data;
  const { storage_path: _, ...publicArtifact } = artifact;

  if (artifact.visibility === "unlisted" && !isOwnerView) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Not available</h1>
          <p className="mt-2 text-muted-foreground">
            This artifact requires a share link to access.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary transition-colors hover:text-primary/80">
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  const [signedUrlResult, feedbackResult, cachedSummary] = await Promise.all([
    getPublicArtifactUrl(artifact.storage_path).catch(() => ""),
    listFeedback(id),
    getCachedSummary(id),
  ]);

  const feedback = feedbackResult.ok ? feedbackResult.data : [];
  const TYPE_LABELS: Record<string, string> = { pdf: "PDF", image: "Image", html: "HTML" };

  return (
    <div className="min-h-screen bg-background">
      <Header backHref="/" backLabel="← Gallery" />

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{artifact.title}</h1>
              <span className="shrink-0 inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {TYPE_LABELS[artifact.type] ?? artifact.type}
              </span>
            </div>
            {artifact.description && <p className="text-muted-foreground">{artifact.description}</p>}
            {artifact.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {artifact.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <ShareButton artifactId={artifact.id} visibility={artifact.visibility} />
        </div>

        {/* Publisher Demo actions */}
        {isOwnerView && <ArtifactActions artifact={publicArtifact} />}

        {/* Preview */}
        {signedUrlResult ? (
          <ArtifactPreview type={artifact.type} signedUrl={signedUrlResult} title={artifact.title} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Preview unavailable.
          </div>
        )}

        {/* Feedback summary */}
        <FeedbackSummary
          artifactId={artifact.id}
          initialSummary={cachedSummary}
          feedbackCount={feedback.length}
        />

        {/* Feedback section */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">
            Feedback{feedback.length > 0 ? ` (${feedback.length})` : ""}
          </h2>
          <FeedbackList feedback={feedback} isOwnerView={isOwnerView} />
          <FeedbackForm artifactId={artifact.id} />
        </section>

        <p className="text-xs text-muted-foreground">
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
