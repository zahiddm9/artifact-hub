import { validateShareLink } from "@/lib/services/share";
import { listFeedback } from "@/lib/services/feedback";
import { getCachedSummary } from "@/lib/services/summarize";
import { getShareLinkArtifactUrl } from "@/lib/storage";
import { ArtifactPreview } from "@/components/ArtifactPreview";
import { FeedbackList } from "@/components/FeedbackList";
import { FeedbackForm } from "@/components/FeedbackForm";
import { FeedbackSummary } from "@/components/FeedbackSummary";
import { Header } from "@/components/Header";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const result = await validateShareLink(token);

  if (!result.ok) {
    const isExpired = result.status === 410;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-2xl font-bold text-foreground">
            {isExpired ? "This link has expired" : "Link not found"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isExpired
              ? "The share link you followed is no longer valid. Ask the sender to create a new link, or browse the public gallery."
              : "This share link doesn't exist or has been removed. Check the URL and try again, or browse the public gallery."}
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary transition-colors hover:text-primary/80">
            Browse gallery →
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
  const isExpiringSoon = (expiresDate.getTime() - new Date().getTime()) / 3_600_000 < 24;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {isExpiringSoon && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This link expires{" "}
            {expiresDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{artifact.title}</h1>
          {artifact.description && <p className="mt-1 text-muted-foreground">{artifact.description}</p>}
          {artifact.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {artifact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Access link · expires{" "}
            {expiresDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Preview */}
        {signedUrl ? (
          <ArtifactPreview type={artifact.type} signedUrl={signedUrl} title={artifact.title} />
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

        {/* Feedback */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">
            Feedback{feedback.length > 0 ? ` (${feedback.length})` : ""}
          </h2>
          <FeedbackList feedback={feedback} />
          <FeedbackForm artifactId={artifact.id} />
        </section>
      </main>
    </div>
  );
}
