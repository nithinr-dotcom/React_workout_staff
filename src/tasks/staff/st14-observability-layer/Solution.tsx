import { Component, type ReactNode } from 'react';
import type {
  ErrorBoundaryProps,
  ObservabilityClient,
  ObservabilityOptions,
  ObservabilityProviderProps,
  TrackFn,
} from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function scrubPII<T>(value: T): T {
  // Your implementation here. Requirements are in README.md.
  void value;
  throw new Error('scrubPII: not implemented');
}

export function createObservability(options: ObservabilityOptions): ObservabilityClient {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createObservability: not implemented');
}

export function ObservabilityProvider({ client, children }: ObservabilityProviderProps): ReactNode {
  // Your implementation here. Requirements are in README.md.
  void client;
  return children;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps> {
  // Your implementation here. Requirements are in README.md.
  render() {
    return this.props.children;
  }
}

export function useTrackEvent(): TrackFn {
  // Your implementation here. Requirements are in README.md.
  throw new Error('useTrackEvent: not implemented');
}

export function useObservability(): ObservabilityClient {
  // Your implementation here. Requirements are in README.md.
  throw new Error('useObservability: not implemented');
}
