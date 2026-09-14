// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { QuizAppProps, QuizQuestion } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const QuizApp = impl.default;

// Q1 and Q2 share the option "4" in the same position, to catch selections leaking between questions.
const QUESTIONS: QuizQuestion[] = [
  { id: 'q1', question: 'What is 2 + 2?', options: ['3', '4', '5'], answerIndex: 1 },
  { id: 'q2', question: 'How many legs does a dog have?', options: ['2', '4', '6'], answerIndex: 1 },
  { id: 'q3', question: 'Which of these is a colour?', options: ['Red', 'Seven', 'Tuesday'], answerIndex: 0 },
];

const radio = (name: string) => screen.getByRole('radio', { name });
const next = () => screen.getByRole('button', { name: 'Next' });
const finish = () => screen.getByRole('button', { name: 'Finish' });
const reviewItems = () => within(screen.getByRole('list', { name: 'Review' })).getAllByRole('listitem');

function setup(props: Partial<QuizAppProps> = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const utils = render(<QuizApp questions={QUESTIONS} {...props} />);
  return { user, ...utils };
}

/** Answers questions in order with the given option texts, pressing Next (or Finish on the last question) after each. */
async function answerAll(user: ReturnType<typeof userEvent.setup>, answers: string[]) {
  for (const answer of answers) {
    await user.click(radio(answer));
    await user.click(screen.queryByRole('button', { name: 'Finish' }) ?? next());
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

/** Advances fake timers in 100ms slices, each in its own act(), so React commits between ticks. */
function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) {
    act(() => {
      vi.advanceTimersByTime(Math.min(100, ms - t));
    });
  }
}

describeTask('QuizApp', () => {
  it('shows the first question with unselected options and Next disabled', () => {
    setup();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.queryByText('How many legs does a dog have?')).not.toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r).not.toBeChecked();
    expect(next()).toBeDisabled();
  });

  it('enables Next once an option is picked and moves to a fresh question', async () => {
    const { user } = setup();
    await user.click(radio('4'));
    expect(radio('4')).toBeChecked();
    expect(next()).toBeEnabled();
    await user.click(next());
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('How many legs does a dog have?')).toBeInTheDocument();
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
    expect(next()).toBeDisabled();
  });

  it('shows Finish instead of Next on the last question', async () => {
    const { user } = setup();
    await answerAll(user, ['4', '4']);
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(finish()).toBeDisabled();
    await user.click(radio('Red'));
    expect(finish()).toBeEnabled();
  });

  it('shows the score and a review of every answer', async () => {
    const { user } = setup();
    await answerAll(user, ['4', '6', 'Red']);
    expect(screen.getByText('You scored 2 out of 3')).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);

    const items = reviewItems();
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('What is 2 + 2?');
    expect(items[0]).toHaveTextContent('Your answer: 4');
    expect(items[0]).toHaveTextContent('Correct answer: 4');
    expect(items[0]).not.toHaveTextContent('Incorrect');

    expect(items[1]).toHaveTextContent('How many legs does a dog have?');
    expect(items[1]).toHaveTextContent('Your answer: 6');
    expect(items[1]).toHaveTextContent('Correct answer: 4');
    expect(items[1]).toHaveTextContent('Incorrect');

    expect(items[2]).toHaveTextContent('Your answer: Red');
    expect(items[2]).not.toHaveTextContent('Incorrect');
  });

  it('counts only the option selected when leaving the question', async () => {
    const { user } = setup();
    await user.click(radio('3'));
    await user.click(radio('5'));
    await user.click(radio('4'));
    await user.click(next());
    await user.click(radio('4'));
    await user.click(radio('2'));
    await user.click(next());
    await user.click(radio('Seven'));
    await user.click(finish());
    expect(screen.getByText('You scored 1 out of 3')).toBeInTheDocument();
    expect(reviewItems()[1]).toHaveTextContent('Your answer: 2');
  });

  it('Restart goes back to a clean first question', async () => {
    const { user } = setup();
    await answerAll(user, ['4', '4', 'Red']);
    expect(screen.getByText('You scored 3 out of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
    await answerAll(user, ['3', '2', 'Red']);
    expect(screen.getByText('You scored 1 out of 3')).toBeInTheDocument();
  });

  it('renders "No questions" for an empty list', () => {
    render(<QuizApp questions={[]} />);
    expect(screen.getByText('No questions')).toBeInTheDocument();
  });

  it('shows no timer when timePerQuestion is not set', () => {
    setup();
    advance(3000);
    expect(screen.queryByText(/Time left/)).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
  });

  it('counts down and auto-advances an unanswered question as incorrect', async () => {
    const { user } = setup({ timePerQuestion: 5 });
    expect(screen.getByText('Time left: 5')).toBeInTheDocument();
    advance(1100);
    expect(screen.getByText('Time left: 4')).toBeInTheDocument();
    advance(4000); // ≈ 5.1s
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Time left: 5')).toBeInTheDocument();
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();

    await user.click(radio('4'));
    await user.click(next());
    await user.click(radio('Red'));
    await user.click(finish());
    expect(screen.getByText('You scored 2 out of 3')).toBeInTheDocument();
    expect(reviewItems()[0]).toHaveTextContent('Your answer: No answer');
    expect(reviewItems()[0]).toHaveTextContent('Incorrect');
  });

  it('restarts the timer on each question and records the selection when time runs out', async () => {
    const { user, unmount } = setup({ timePerQuestion: 5 });
    advance(3100);
    await user.click(radio('4'));
    await user.click(next());
    expect(screen.getByText('Time left: 5')).toBeInTheDocument();

    advance(4100);
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Time left: 1')).toBeInTheDocument();
    await user.click(radio('6'));
    advance(1000); // ≈ 5.1s into question 2
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();

    advance(5100);
    expect(screen.getByText('You scored 1 out of 3')).toBeInTheDocument();
    const items = reviewItems();
    expect(items[1]).toHaveTextContent('Your answer: 6');
    expect(items[2]).toHaveTextContent('Your answer: No answer');
    expect(screen.queryByText(/Time left/)).not.toBeInTheDocument();

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeFollowUp(3, 'back navigation', () => {
  it('returns to the previous question with its answer still selected', async () => {
    const { user } = setup();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    await user.click(radio('5'));
    await user.click(next());
    await user.click(radio('2'));
    await user.click(next());

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    expect(radio('2')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(radio('5')).toBeChecked();
    expect(next()).toBeEnabled();

    await user.click(radio('4'));
    await user.click(next());
    expect(radio('2')).toBeChecked();
    await user.click(next());
    await user.click(radio('Red'));
    await user.click(finish());
    expect(screen.getByText('You scored 2 out of 3')).toBeInTheDocument();
  });
});
