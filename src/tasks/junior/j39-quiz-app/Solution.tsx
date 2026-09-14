import type { QuizAppProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function QuizApp({ questions, timePerQuestion = 0 }: QuizAppProps) {
  // Your implementation here. Requirements are in README.md.
  void timePerQuestion;
  return <div className={styles.root}>Quiz with {questions.length} questions: start coding in Solution.tsx</div>;
}
