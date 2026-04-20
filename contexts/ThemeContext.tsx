"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light" | "system";
type Resolved = "dark" | "light";

interface Ctx {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<Ctx | null>(null);
const KEY = "confessx_theme";

function systemPref(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(res: Resolved) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(res);
  el.style.colorScheme = res;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<Resolved>("dark");

  // Init depuis localStorage une fois hydraté
  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme | null) || "dark";
    setThemeState(saved);
    const r: Resolved = saved === "system" ? systemPref() : saved;
    setResolved(r);
    apply(r);
  }, []);

  // Suit les changements système si theme === 'system'
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const r: Resolved = mq.matches ? "light" : "dark";
      setResolved(r);
      apply(r);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(KEY, t);
    const r: Resolved = t === "system" ? systemPref() : t;
    setResolved(r);
    apply(r);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  const value = useMemo<Ctx>(() => ({ theme, resolved, setTheme, toggle }), [theme, resolved, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark" as Theme,
      resolved: "dark" as Resolved,
      setTheme: () => {},
      toggle: () => {},
    } satisfies Ctx;
  }
  return ctx;
}
