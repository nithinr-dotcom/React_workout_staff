import type { Replacer, Reviver } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function stringify(value: unknown, replacer?: Replacer, space?: string | number): string | undefined {
  // Your implementation here. Requirements are in README.md.
  void value;
  void replacer;
  void space;
  throw new Error('stringify: not implemented');
}

export function parse(text: string, reviver?: Reviver): unknown {
  void text;
  void reviver;
  throw new Error('parse: not implemented');
}
