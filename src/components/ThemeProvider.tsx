"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "theme-saas" | "theme-creative" | "theme-docs" | "theme-premium";

const STORAGE_KEY = "artifact-hub-theme";
const DEFAULT_THEME: Theme = "theme-premium";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && isValidTheme(stored)) {
      applyTheme(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(stored);
    }
  }, []);

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setThemeState(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove("theme-saas", "theme-creative", "theme-docs", "theme-premium");
  el.classList.add(theme);
}

function isValidTheme(value: string): value is Theme {
  return ["theme-saas", "theme-creative", "theme-docs", "theme-premium"].includes(value);
}
