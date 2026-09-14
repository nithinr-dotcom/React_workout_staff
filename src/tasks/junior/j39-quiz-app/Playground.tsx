import type { ComponentType } from 'react';
import { SAMPLE_QUESTIONS } from './data';
import type { QuizAppProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<QuizAppProps> } }) {
  const QuizApp = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 560 }}>
      <section>
        <h3>5 questions, no timer</h3>
        <QuizApp questions={SAMPLE_QUESTIONS} />
      </section>
      <section>
        <h3>3 questions, 10 seconds each</h3>
        <QuizApp questions={SAMPLE_QUESTIONS.slice(0, 3)} timePerQuestion={10} />
      </section>
      <section>
        <h3>Empty</h3>
        <QuizApp questions={[]} />
      </section>
    </div>
  );
}
