import type { ComponentType, ReactNode } from 'react';

/** What the user picked. */
export type ThemePreference = 'light' | 'dark' | 'system';
/** What is actually applied after resolving "system". */
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Used when nothing valid is stored. Default 'system'. */
  defaultTheme?: ThemePreference;
  /** localStorage key for the preference. Default 'theme'. */
  storageKey?: string;
}

/** Shape of Solution.tsx: two named exports plus the toggle as the default export. */
export interface ThemeToggleModule {
  ThemeProvider: ComponentType<ThemeProviderProps>;
  useTheme: () => ThemeContextValue;
  default: ComponentType;
}
