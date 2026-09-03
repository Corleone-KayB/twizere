import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "light" | "dark";
const THEME_KEY = "twizere-theme";

function readStoredTheme(): ThemeChoice | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

interface ThemeContextValue {
  theme: ThemeChoice;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>(
    () => readStoredTheme() ?? (systemPrefersDark() ? "dark" : "light")
  );
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(() => readStoredTheme() !== null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Follow the OS setting live until the user makes an explicit choice.
  useEffect(() => {
    if (hasExplicitChoice) return;
    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mql.addEventListener?.("change", handler);
    return () => mql?.removeEventListener?.("change", handler);
  }, [hasExplicitChoice]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggle: () => {
        setTheme((prev) => {
          const next: ThemeChoice = prev === "light" ? "dark" : "light";
          try {
            localStorage.setItem(THEME_KEY, next);
          } catch {
            // ignore — theme still applies for this page life
          }
          setHasExplicitChoice(true);
          return next;
        });
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
