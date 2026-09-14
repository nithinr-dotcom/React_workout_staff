import type { ComponentType, ReactNode } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * Designing the SDK API is part of the exercise: extend it freely, but don't break it.
 */

export type BreadcrumbType = 'click' | 'navigation' | 'fetch' | 'custom';

export interface Breadcrumb {
  type: BreadcrumbType;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type ErrorSource = 'boundary' | 'window.error' | 'unhandledrejection' | 'manual';

export interface ObsErrorEvent {
  type: 'error';
  message: string;
  stack?: string;
  /** React component stack, present for errors caught by <ErrorBoundary>. */
  componentStack?: string;
  source: ErrorSource;
  /** How many identical occurrences were merged into this event (≥ 1). */
  count: number;
  /** Snapshot of the breadcrumb buffer at capture time, oldest first. */
  breadcrumbs: Breadcrumb[];
  timestamp: number;
}

export interface ObsTrackEvent {
  type: 'track';
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

export type ObsEvent = ObsErrorEvent | ObsTrackEvent;

/** Receives a batch. May be sync or async; failures must never reach the app. */
export type Transport = (events: ObsEvent[]) => void | Promise<void>;

export interface ObservabilityOptions {
  transport: Transport;
  /** Flush as soon as this many events are buffered. Default 20. */
  flushAt?: number;
  /** Flush buffered events at most this long after they were queued. Default 5000. */
  flushIntervalMs?: number;
  /** Probability (0..1) that a track event is kept. Errors are never sampled out. Default 1. */
  sampleRate?: number;
  /** Ring buffer size for breadcrumbs. Default 30. */
  maxBreadcrumbs?: number;
  /** Applied to every event right before it is sent. Return null to drop it. Default: scrubPII. */
  scrub?: (event: ObsEvent) => ObsEvent | null;
  /** Injectable randomness for sampling. Default Math.random. */
  random?: () => number;
}

export interface ObservabilityClient {
  captureError(error: unknown, context?: { source?: ErrorSource; componentStack?: string }): void;
  track(name: string, properties?: Record<string, unknown>): void;
  addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'> & { timestamp?: number }): void;
  /** Sends everything buffered now. Resolves when the transport call settles. */
  flush(): Promise<void>;
}

export interface ObservabilityProviderProps {
  client: ObservabilityClient;
  children: ReactNode;
}

export interface FallbackProps {
  error: Error;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  fallback: ReactNode | ((props: FallbackProps) => ReactNode);
  /** Called after reset() or a resetKeys change clears the error. */
  onReset?: () => void;
  /** When any value changes (Object.is) while showing the fallback, the boundary resets. */
  resetKeys?: unknown[];
  children: ReactNode;
}

export type TrackFn = (name: string, properties?: Record<string, unknown>) => void;

export interface ObservabilityModule {
  createObservability(options: ObservabilityOptions): ObservabilityClient;
  ObservabilityProvider(props: ObservabilityProviderProps): ReactNode;
  ErrorBoundary: ComponentType<ErrorBoundaryProps>;
  useTrackEvent(): TrackFn;
  useObservability(): ObservabilityClient;
  scrubPII<T>(value: T): T;
}
