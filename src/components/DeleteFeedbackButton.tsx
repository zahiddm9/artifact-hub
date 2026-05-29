"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteFeedbackButton({ feedbackId }: { feedbackId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");

  async function handleClick() {
    if (state === "idle") {
      setState("confirm");
      setTimeout(() => setState((s) => (s === "confirm" ? "idle" : s)), 3000);
      return;
    }
    if (state === "confirm") {
      setState("deleting");
      await fetch(`/api/feedback/${feedbackId}`, { method: "DELETE" });
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "deleting"}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
        state === "confirm"
          ? "bg-red-500 text-white"
          : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
      }`}
    >
      {state === "idle" && <Trash2 className="h-3 w-3" />}
      {state === "confirm" && "Delete?"}
      {state === "deleting" && "…"}
    </button>
  );
}
