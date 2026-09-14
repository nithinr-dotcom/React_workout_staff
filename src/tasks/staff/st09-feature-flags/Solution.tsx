import type { ReactNode } from 'react';
import type {
  CreateFlagClientOptions,
  FeatureProps,
  FlagClient,
  FlagDefinition,
  FlagProviderProps,
  FlagUser,
  FlagValue,
} from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function evaluateFlag(flag: FlagDefinition, user: FlagUser): FlagValue {
  void flag;
  void user;
  throw new Error('evaluateFlag: not implemented');
}

export function getBucket(flagKey: string, userId: string): number {
  void flagKey;
  void userId;
  throw new Error('getBucket: not implemented');
}

export function createFlagClient(options: CreateFlagClientOptions): FlagClient & { destroy(): void } {
  void options;
  throw new Error('createFlagClient: not implemented');
}

export function FlagProvider({ client, user, onExposure, children }: FlagProviderProps) {
  void client;
  void user;
  void onExposure;
  return <div className={styles.root}>{children}</div>;
}

export function useFlag(key: string, defaultValue: boolean): boolean;
export function useFlag(key: string, defaultValue: string): string;
export function useFlag(key: string, defaultValue: number): number;
export function useFlag(key: string, defaultValue: FlagValue): FlagValue {
  void key;
  void defaultValue;
  throw new Error('useFlag: not implemented');
}

export function Feature({ flag, value, fallback, children }: FeatureProps): ReactNode {
  void flag;
  void value;
  void fallback;
  void children;
  throw new Error('Feature: not implemented');
}
