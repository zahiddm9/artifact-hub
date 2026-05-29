"use client";

import { useState } from "react";

export function ShareButton({ artifactId }: { artifactId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");

  async function handleShare() {
    setState("loading");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact_id: artifactId,
          expires_in_hours: 24 * 7,
          label: "7-day link",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.token}`;
      setShareUrl(url);
      setState("done");
      navigator.clipboard.writeText(url).catch(() => {});
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 min-w-0 max-w-sm">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-700 focus:outline-none"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="shrink-0 text-xs text-zinc-500 transition-colors duration-150 hover:text-zinc-900"
        >
          Copy
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
    >
      {state === "loading" ? "Creating…" : state === "error" ? "Retry" : "Share"}
    </button>
  );
}
