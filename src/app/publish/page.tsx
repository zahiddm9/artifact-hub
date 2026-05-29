import Link from "next/link";
import { PublishForm } from "@/components/PublishForm";

export default function PublishPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-zinc-900 transition-colors duration-150 hover:text-zinc-600">
            Artifact Hub
          </Link>
          <Link href="/" className="text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-900">
            ← Gallery
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">Publish artifact</h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <PublishForm />
        </div>
      </main>
    </div>
  );
}
