export interface PasswordGeneratorProps {
  /** Returns a number in [0, 1). Defaults to Math.random. Tests inject a seeded generator. */
  random?: () => number;
  /** Starting value of the length slider (4–32). Defaults to 12. */
  defaultLength?: number;
}

export type Strength = 'Weak' | 'Medium' | 'Strong';
