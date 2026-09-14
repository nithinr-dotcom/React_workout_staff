import type { ReactNode } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * Designing the library API is part of the exercise: extend it freely, but don't break it.
 */

/** A flat catalog: dotted keys → ICU-lite message strings. */
export type Messages = Record<string, string>;

export type MessageParams = Record<string, string | number>;

export interface I18nOptions {
  /** Initial active locale, e.g. "en", "fr", "ar". */
  locale: string;
  /** Used for keys missing in the active locale. */
  fallbackLocale: string;
  /** Lazily loads a catalog. Called at most once per locale (results are cached). */
  loadMessages: (locale: string) => Promise<Messages>;
  /** Catalogs already available (e.g. inlined by SSR). No loadMessages call is made for these locales. */
  messages?: Record<string, Messages>;
  /** Called when a key is missing in the active locale. Default: console.warn in development. */
  onMissingKey?: (key: string, locale: string) => void;
}

/** Framework-agnostic core. `createI18n` starts loading the initial + fallback catalogs immediately. */
export interface I18n {
  readonly fallbackLocale: string;
  getLocale(): string;
  /** Resolves once the locale's catalog is loaded and it has become the active locale. */
  setLocale(locale: string): Promise<void>;
  /** Translate using the active locale's catalog (see README for the fallback chain). */
  t(key: string, params?: MessageParams): string;
  /** Notified when the locale, loaded catalogs or loading state change. Returns unsubscribe. */
  subscribe(listener: () => void): () => void;
}

export interface I18nProviderProps {
  i18n: I18n;
  /** Rendered until the initial locale's catalog is available. Default: null. */
  fallback?: ReactNode;
  children: ReactNode;
}

export type TranslateFn = (key: string, params?: MessageParams) => string;

export interface I18nContextValue {
  locale: string;
  /** True while a catalog requested by setLocale is loading. */
  isLoading: boolean;
  dir: 'ltr' | 'rtl';
  setLocale(locale: string): Promise<void>;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
}

export interface I18nModule {
  createI18n(options: I18nOptions): I18n;
  I18nProvider(props: I18nProviderProps): ReactNode;
  useT(): TranslateFn;
  useI18n(): I18nContextValue;
  /** Pure: formats one ICU-lite message. */
  formatMessage(message: string, params: MessageParams | undefined, locale: string): string;
}
