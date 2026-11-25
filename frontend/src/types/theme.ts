export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  dark: boolean;
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}
