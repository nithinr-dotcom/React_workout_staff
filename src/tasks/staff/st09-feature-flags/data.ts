import type { FlagDefinition, FlagSnapshot, FlagUser } from './types';

/** Demo data for the Playground. Tests build their own definitions. */

export const DEMO_USERS: (FlagUser & { label: string })[] = [
  { label: 'Priya (IN, enterprise, staff)', id: 'u-1001', attributes: { country: 'IN', plan: 'enterprise', employee: true } },
  { label: 'Ben (US, free)', id: 'u-1002', attributes: { country: 'US', plan: 'free', employee: false } },
  { label: 'Aiko (JP, pro)', id: 'u-1003', attributes: { country: 'JP', plan: 'pro', employee: false } },
  { label: 'Anonymous visitor', attributes: { country: 'GB' } },
];

export const INITIAL_DEFINITIONS: FlagDefinition[] = [
  {
    key: 'new-checkout',
    rules: [
      { conditions: [{ attribute: 'employee', op: 'eq', value: true }], value: true },
      { conditions: [{ attribute: 'country', op: 'in', values: ['IN', 'JP'] }], percentage: 50, value: true },
    ],
    defaultValue: false,
  },
  {
    key: 'pricing-page-variant',
    rules: [
      { conditions: [{ attribute: 'plan', op: 'eq', value: 'enterprise' }], value: 'contact-sales' },
      { percentage: 33, value: 'annual-first' },
    ],
    defaultValue: 'control',
  },
  {
    key: 'search-results-per-page',
    rules: [{ conditions: [{ attribute: 'plan', op: 'in', values: ['pro', 'enterprise'] }], value: 50 }],
    defaultValue: 20,
  },
];

/** What a server might inline into the HTML so the first render doesn't flicker. */
export const BOOTSTRAP: FlagSnapshot = {
  'new-checkout': false,
  'pricing-page-variant': 'control',
  'search-results-per-page': 20,
};

let definitions = INITIAL_DEFINITIONS;
const listeners = new Set<(defs: FlagDefinition[]) => void>();

/** Fake flag service: resolves the current definitions after some latency. */
export function mockFetchFlags(_user: FlagUser, { signal }: { signal: AbortSignal }): Promise<FlagDefinition[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(structuredClone(definitions)), 400 + Math.random() * 400);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });
}

/** Fake streaming connection (think SSE). */
export function mockConnect(push: (defs: FlagDefinition[]) => void): () => void {
  listeners.add(push);
  return () => listeners.delete(push);
}

/** Simulates an operator changing a flag in the admin console. */
export function publishDefinitions(update: (defs: FlagDefinition[]) => FlagDefinition[]) {
  definitions = update(structuredClone(definitions));
  for (const listener of listeners) listener(structuredClone(definitions));
}
