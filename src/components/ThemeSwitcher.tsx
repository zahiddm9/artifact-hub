"use client";

import { useTheme, type Theme } from "./ThemeProvider";

const THEMES: { value: Theme; label: string }[] = [
  { value: "theme-saas",     label: "SaaS" },
  { value: "theme-creative", label: "Creative" },
  { value: "theme-docs",     label: "Docs" },
  { value: "theme-premium",  label: "Premium" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      className="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      aria-label="Switch theme"
    >
      {THEMES.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
