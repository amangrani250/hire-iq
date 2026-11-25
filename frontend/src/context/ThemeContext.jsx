import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hireiq-theme';
const ThemeContext = createContext(null);

const getSystemDark = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      /* localStorage can be unavailable in private modes */
    }
    return 'system';
  });
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);

    if (query.addEventListener) query.addEventListener('change', onChange);
    else query.addListener(onChange);

    return () => {
      if (query.removeEventListener) query.removeEventListener('change', onChange);
      else query.removeListener(onChange);
    };
  }, []);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;

    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0d1210' : '#f9f8f4');
  }, [resolved]);

  const setMode = useCallback((next) => {
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
    () => ({
      mode,
      setMode,
      theme: resolved,
      dark: resolved === 'dark',
      toggle,
    }),
    [mode, resolved, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
