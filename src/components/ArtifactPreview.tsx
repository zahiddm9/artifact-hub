"use client";

import type { ArtifactType } from "@/types";

interface Props {
  type: ArtifactType;
  signedUrl: string;
  title: string;
}

export function ArtifactPreview({ type, signedUrl, title }: Props) {
  if (type === "image") {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card overflow-hidden min-h-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={title}
          className="max-h-[600px] w-full object-contain"
        />
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <div className="rounded-xl border border-border overflow-hidden" style={{ height: 700 }}>
        <iframe
          src={signedUrl}
          title={title}
          className="h-full w-full"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ height: 600 }}>
      <iframe
        src={signedUrl}
        title={title}
        className="h-full w-full"
        sandbox="allow-scripts allow-forms"
        loading="lazy"
      />
    </div>
  );
}
