import { Header } from "@/components/Header";
import { PublishForm } from "@/components/PublishForm";

export default function PublishPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header backHref="/" backLabel="← Gallery" />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Publish artifact</h1>
        <div className="rounded-xl border border-border bg-card p-6">
          <PublishForm />
        </div>
      </main>
    </div>
  );
}
