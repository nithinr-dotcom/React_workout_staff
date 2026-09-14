import type { LetterStatus, WordleProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function scoreGuess(guess: string, answer: string): LetterStatus[] {
  // Your implementation here. Requirements are in README.md.
  void guess;
  void answer;
  throw new Error('scoreGuess: not implemented');
}

export function getKeyStatuses(guesses: string[], answer: string): Record<string, LetterStatus> {
  void guesses;
  void answer;
  throw new Error('getKeyStatuses: not implemented');
}

export default function Wordle({ answer, words }: WordleProps) {
  // Your implementation here. Requirements are in README.md.
  void answer;
  void words;
  return <div className={styles.root}>Wordle: start coding in Solution.tsx</div>;
}
