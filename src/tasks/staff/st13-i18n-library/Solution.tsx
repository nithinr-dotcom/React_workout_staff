import type { ReactNode } from 'react';
import type { I18n, I18nContextValue, I18nOptions, I18nProviderProps, MessageParams, TranslateFn } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function formatMessage(message: string, params: MessageParams | undefined, locale: string): string {
  // Your implementation here. Requirements are in README.md.
  void message;
  void params;
  void locale;
  throw new Error('formatMessage: not implemented');
}

export function createI18n(options: I18nOptions): I18n {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createI18n: not implemented');
}

export function I18nProvider({ i18n, fallback = null, children }: I18nProviderProps): ReactNode {
  // Your implementation here. Requirements are in README.md.
  void i18n;
  void fallback;
  return children;
}

export function useT(): TranslateFn {
  // Your implementation here. Requirements are in README.md.
  throw new Error('useT: not implemented');
}

export function useI18n(): I18nContextValue {
  // Your implementation here. Requirements are in README.md.
  throw new Error('useI18n: not implemented');
}
