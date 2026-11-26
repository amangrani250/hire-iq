import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ResolvedTheme, ThemeContextValue, ThemeMode } from '../types';

const STORAGE_KEY = 'hireiq-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemDark = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      /* localStorage can be unavailable */
    }
    return 'system';
  });
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    if (query.addEventListener) query.addEventListener('change', onChange);
    else query.addListener(onChange);

    return () => {
      if (query.removeEventListener) query.removeEventListener('change', onChange);
      else query.removeListener(onChange);
    };
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;

    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#050a17' : '#f7f9fc');
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, setMode, theme: resolved, dark: resolved === 'dark', toggle }),
    [mode, resolved, setMode, toggle]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
