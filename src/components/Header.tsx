import Link from "next/link";
import { Layers } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface HeaderProps {
  backHref?: string;
  backLabel?: string;
  showPublish?: boolean;
}

export function Header({ backHref, backLabel, showPublish = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Artifact Hub
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {backHref ? (
              <Link
                href={backHref}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {backLabel ?? "← Back"}
              </Link>
            ) : showPublish ? (
              <Link
                href="/publish"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Publish
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
