export interface QuizQuestion {
  /** Unique, stable identifier. */
  id: string;
  question: string;
  /** Answer choices, shown in this order. */
  options: string[];
  /** Index into `options` of the correct answer. */
  answerIndex: number;
}

export interface QuizAppProps {
  questions: QuizQuestion[];
  /**
   * Seconds allowed per question. When time runs out the quiz moves on automatically.
   * Omit (or pass 0) for no timer.
   */
  timePerQuestion?: number;
}
