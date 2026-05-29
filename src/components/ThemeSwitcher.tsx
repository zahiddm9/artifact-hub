"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";

const THEMES: { value: Theme; name: string; description: string }[] = [
  { value: "theme-saas",     name: "Clean SaaS",        description: "Linear / Vercel inspired" },
  { value: "theme-creative", name: "Creative Gallery",   description: "Visual & expressive" },
  { value: "theme-docs",     name: "Developer Docs",     description: "Calm & technical" },
  { value: "theme-premium",  name: "Premium Workspace",  description: "Elegant & polished" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch theme"
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 text-sm font-medium text-foreground transition-all duration-200 hover:bg-secondary hover:border-primary/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Palette className="h-4 w-4 text-primary shrink-0" />
        <span className="hidden sm:inline">{current.name}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-popover shadow-lg shadow-black/10"
        >
          <p className="px-3 pt-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Design Theme
          </p>
          <div className="border-t border-border/60 mt-0.5" />
          <div className="p-1">
            {THEMES.map((t) => {
              const isActive = theme === t.value;
              return (
                <button
                  key={t.value}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { setTheme(t.value); setOpen(false); }}
                  className={`w-full flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? "bg-primary/10"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                    {t.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
