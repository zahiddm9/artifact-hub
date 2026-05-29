"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteArtifactAction } from "@/lib/actions/artifacts";

export function DeleteCardButton({ artifactId }: { artifactId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (state === "idle") {
      setState("confirm");
      setTimeout(() => setState((s) => (s === "confirm" ? "idle" : s)), 3000);
      return;
    }

    if (state === "confirm") {
      setState("deleting");
      await deleteArtifactAction(artifactId);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "deleting"}
      className={`absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer disabled:opacity-50 ${
        state === "confirm"
          ? "bg-red-500 text-white opacity-100"
          : "bg-background/90 text-muted-foreground hover:bg-red-50 hover:text-red-600 border border-border"
      }`}
    >
      {state === "idle" && <Trash2 className="h-3 w-3" />}
      {state === "confirm" && "Delete?"}
      {state === "deleting" && "…"}
    </button>
  );
}
