import type { ComponentType, ReactNode } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * You may add options, fields and exports (API design is part of the exercise), but don't break these.
 */

export type FlagValue = boolean | string | number;
export type AttributeValue = string | number | boolean;

export interface FlagUser {
  /** Stable id used for percentage bucketing. Anonymous users have no id. */
  id?: string;
  attributes?: Record<string, AttributeValue>;
}

export type Condition =
  | { attribute: string; op: 'eq'; value: AttributeValue }
  | { attribute: string; op: 'in'; values: AttributeValue[] };

export interface TargetingRule {
  /** Every condition must match (AND). Missing or empty matches every user. */
  conditions?: Condition[];
  /** 0–100. When set, the rule only applies to users whose bucket is below this number. */
  percentage?: number;
  /** Value served when this rule applies. */
  value: FlagValue;
}

export interface FlagDefinition {
  key: string;
  /** Kill switch. When `false`, evaluation returns `defaultValue` and ignores rules. Default `true`. */
  enabled?: boolean;
  /** Evaluated in order. The first rule that applies wins. */
  rules: TargetingRule[];
  /** Served when no rule applies. */
  defaultValue: FlagValue;
}

/** Evaluated values for the current user, by flag key. */
export type FlagSnapshot = Readonly<Record<string, FlagValue>>;

/** What the React bindings need. Tests pass their own fake that implements this. */
export interface FlagClient {
  /** Synchronous. Must return the same object until something changes. */
  getSnapshot(): FlagSnapshot;
  /** Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Fetch definitions for this user, evaluate them, update the snapshot and notify. */
  identify(user: FlagUser): Promise<void>;
}

export interface CreateFlagClientOptions {
  /** Values available synchronously before any fetch (e.g. inlined by the server). */
  bootstrap?: FlagSnapshot;
  /** Loads the flag definitions. */
  fetchFlags(user: FlagUser, options: { signal: AbortSignal }): Promise<FlagDefinition[]>;
  /** Optional live stream. Call `push` with a full new set of definitions; returns a disconnect function. */
  connect?(push: (definitions: FlagDefinition[]) => void): () => void;
}

export interface ExposureEvent {
  flagKey: string;
  value: FlagValue;
  userId?: string;
}

export interface FlagProviderProps {
  client: FlagClient;
  user: FlagUser;
  /** Called when a component reads a flag. Deduped per provider by flag key + value. */
  onExposure?: (event: ExposureEvent) => void;
  children: ReactNode;
}

export interface FeatureProps {
  flag: string;
  /** Render children when the flag equals this value. Without it, children render when the flag is `true`. */
  value?: FlagValue;
  fallback?: ReactNode;
  children: ReactNode;
}

export interface UseFlag {
  (key: string, defaultValue: boolean): boolean;
  (key: string, defaultValue: string): string;
  (key: string, defaultValue: number): number;
}

export interface FeatureFlagsModule {
  evaluateFlag(flag: FlagDefinition, user: FlagUser): FlagValue;
  /** Deterministic integer bucket in [0, 99] for this flag + user. */
  getBucket(flagKey: string, userId: string): number;
  createFlagClient(options: CreateFlagClientOptions): FlagClient & { destroy(): void };
  FlagProvider: ComponentType<FlagProviderProps>;
  useFlag: UseFlag;
  Feature: ComponentType<FeatureProps>;
}
