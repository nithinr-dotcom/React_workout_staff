import type { ComponentType } from 'react';

/** Status of one letter of a submitted guess. */
export type LetterStatus = 'correct' | 'present' | 'absent';

export interface WordleProps {
  /** The secret word: 5 lowercase letters. Passed in so games are deterministic. */
  answer: string;
  /** Allowed guesses (lowercase). Defaults to `WORDS` from the mock datasets. */
  words?: string[];
}

export interface WordleModule {
  default: ComponentType<WordleProps>;
  /** Scores one 5-letter guess against the answer. Case-insensitive. */
  scoreGuess(guess: string, answer: string): LetterStatus[];
  /** The best known status for every letter used so far, keyed by lowercase letter. */
  getKeyStatuses(guesses: string[], answer: string): Record<string, LetterStatus>;
}
