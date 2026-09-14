import type { ThemeContextValue, ThemeProviderProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'theme' }: ThemeProviderProps) {
  // Your implementation here. Requirements are in README.md.
  void defaultTheme;
  void storageKey;
  return <>{children}</>;
}

export function useTheme(): ThemeContextValue {
  throw new Error('useTheme: not implemented');
}

export default function ThemeToggle() {
  return <div className={styles.root}>ThemeToggle: start coding in Solution.tsx</div>;
}
