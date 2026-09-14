// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { PollOption } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const PollWidget = impl.default;

const QUESTION = 'Favourite framework?';
const OPTIONS: PollOption[] = [
  { id: 'react', label: 'React', votes: 3 },
  { id: 'vue', label: 'Vue', votes: 1 },
  { id: 'svelte', label: 'Svelte', votes: 0 },
];

/** The results list item containing `label` as a whole word. */
const resultFor = (label: string) => {
  const items = within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem');
  const matches = items.filter((li) => new RegExp(`(^|[^A-Za-z])${label}([^A-Za-z]|$)`).test(li.textContent ?? ''));
  expect(matches).toHaveLength(1);
  return matches[0];
};
const votes = (n: number) => new RegExp(`(^|\\D)${n} votes?(\\D|$)`);
const percent = (n: number) => new RegExp(`(^|\\D)${n}%`);

async function vote(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('radio', { name: label }));
  await user.click(screen.getByRole('button', { name: 'Vote' }));
}

describeTask('PollWidget', () => {
  it('renders the question as a radio group with Vote disabled until an option is picked', async () => {
    const user = userEvent.setup();
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    const group = screen.getByRole('group', { name: QUESTION });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Vote' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Vue' }));
    expect(screen.getByRole('button', { name: 'Vote' })).toBeEnabled();
  });

  it('shows counts, percentages and total after voting', async () => {
    const user = userEvent.setup();
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    await vote(user, 'React');
    // React 4, Vue 1, Svelte 0 → total 5
    expect(within(screen.getByRole('list', { name: 'Results' })).getAllByRole('listitem')).toHaveLength(3);
    expect(resultFor('React')).toHaveTextContent(votes(4));
    expect(resultFor('React')).toHaveTextContent(percent(80));
    expect(resultFor('Vue')).toHaveTextContent(/(^|\D)1 vote(?!s)/);
    expect(resultFor('Vue')).toHaveTextContent(percent(20));
    expect(resultFor('Svelte')).toHaveTextContent(votes(0));
    expect(resultFor('Svelte')).toHaveTextContent(percent(0));
    expect(screen.getByText('5 votes total')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vote' })).not.toBeInTheDocument();
  });

  it('marks only the chosen option as "Your vote"', async () => {
    const user = userEvent.setup();
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    await vote(user, 'Vue');
    expect(resultFor('Vue')).toHaveTextContent('Your vote');
    expect(resultFor('React')).not.toHaveTextContent('Your vote');
    expect(resultFor('Svelte')).not.toHaveTextContent('Your vote');
  });

  it('saves the vote under poll:<pollId>', async () => {
    const user = userEvent.setup();
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    await vote(user, 'Svelte');
    expect(localStorage.getItem('poll:fw')).toBe('svelte');
  });

  it('Change vote preselects the current choice and moves the vote without double counting', async () => {
    const user = userEvent.setup();
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    await vote(user, 'React');
    await user.click(screen.getByRole('button', { name: 'Change vote' }));
    expect(screen.getByRole('radio', { name: 'React' })).toBeChecked();
    await vote(user, 'Vue');
    // React 3, Vue 2, Svelte 0 → total 5
    expect(resultFor('React')).toHaveTextContent(votes(3));
    expect(resultFor('React')).toHaveTextContent(percent(60));
    expect(resultFor('Vue')).toHaveTextContent(votes(2));
    expect(resultFor('Vue')).toHaveTextContent(percent(40));
    expect(resultFor('Vue')).toHaveTextContent('Your vote');
    expect(screen.getByText('5 votes total')).toBeInTheDocument();
    expect(localStorage.getItem('poll:fw')).toBe('vue');
  });

  it('starts in the results view when a stored vote exists', () => {
    localStorage.setItem('poll:fw', 'vue');
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    expect(resultFor('Vue')).toHaveTextContent(votes(2));
    expect(resultFor('Vue')).toHaveTextContent('Your vote');
    expect(screen.getByRole('button', { name: 'Change vote' })).toBeInTheDocument();
  });

  it('ignores a stored vote for an unknown option', () => {
    localStorage.setItem('poll:fw', 'angular');
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    expect(screen.getByRole('group', { name: QUESTION })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('keeps votes separate per pollId', () => {
    localStorage.setItem('poll:other', 'react');
    render(<PollWidget pollId="fw" question={QUESTION} options={OPTIONS} />);
    expect(screen.getByRole('button', { name: 'Vote' })).toBeInTheDocument();
  });

  it('gives 100% to the only voted option and uses singular wording', async () => {
    const user = userEvent.setup();
    const empty = OPTIONS.map((o) => ({ ...o, votes: 0 }));
    render(<PollWidget pollId="empty" question={QUESTION} options={empty} />);
    await vote(user, 'Svelte');
    expect(resultFor('Svelte')).toHaveTextContent(percent(100));
    expect(resultFor('React')).toHaveTextContent(percent(0));
    expect(screen.getByText('1 vote total')).toBeInTheDocument();
  });

  it('rounds percentages to whole numbers', async () => {
    const user = userEvent.setup();
    const thirds: PollOption[] = [
      { id: 'a', label: 'Alpha', votes: 1 },
      { id: 'b', label: 'Beta', votes: 1 },
      { id: 'c', label: 'Gamma', votes: 0 },
    ];
    render(<PollWidget pollId="thirds" question={QUESTION} options={thirds} />);
    await vote(user, 'Gamma');
    // Math.round gives 33/33/33; the largest remainder method (follow-up 1) gives 34/33/33. Both pass here.
    expect(resultFor('Alpha')).toHaveTextContent(/(^|\D)3[34]%/);
    expect(resultFor('Beta')).toHaveTextContent(percent(33));
    expect(resultFor('Gamma')).toHaveTextContent(percent(33));
  });
});

describeFollowUp(1, 'percentages add up to 100', () => {
  it('uses the largest remainder method with ties broken by option order', async () => {
    const user = userEvent.setup();
    const thirds: PollOption[] = [
      { id: 'a', label: 'Alpha', votes: 1 },
      { id: 'b', label: 'Beta', votes: 1 },
      { id: 'c', label: 'Gamma', votes: 0 },
    ];
    render(<PollWidget pollId="thirds-lr" question={QUESTION} options={thirds} />);
    await vote(user, 'Gamma');
    expect(resultFor('Alpha')).toHaveTextContent(percent(34));
    expect(resultFor('Beta')).toHaveTextContent(percent(33));
    expect(resultFor('Gamma')).toHaveTextContent(percent(33));
  });
});
