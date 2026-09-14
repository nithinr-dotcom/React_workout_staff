// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import { CATEGORIES, type Item, type RenderName } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Dashboard = impl.default;

/** Rows that re-render for reasons other than their own data changing must stay under this. */
const ROW_BUDGET = 10;

const ITEMS: Item[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: `Item ${String(i + 1).padStart(3, '0')}`,
  category: CATEGORIES[i % CATEGORIES.length],
  price: 10 + (i % 90),
  stock: i % 50,
}));

function setup({ fakeTimers = false } = {}) {
  if (fakeTimers) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-01T09:30:00Z'));
  }
  const counts = new Map<RenderName, number>();
  const onRender = (name: RenderName) => counts.set(name, (counts.get(name) ?? 0) + 1);
  const user = fakeTimers ? userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) : userEvent.setup();
  const utils = render(<Dashboard items={ITEMS} onRender={onRender} />);
  return {
    user,
    ...utils,
    count: (name: RenderName) => counts.get(name) ?? 0,
    reset: () => counts.clear(),
  };
}

const tick = (ms = 1000) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const itemButton = (name: string) => screen.getByRole('button', { name });
const filter = () => screen.getByLabelText('Filter items');

describeTask('Render performance audit: behaviour stays the same', () => {
  it('renders the list, the count and the summary', () => {
    setup();
    expect(screen.getByText('Showing 500 of 500')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Items' });
    expect(within(list).getByRole('button', { name: 'Item 001' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Item 500' })).toBeInTheDocument();
    const summary = screen.getByRole('complementary', { name: 'Summary' });
    expect(summary).toHaveTextContent('Hardware: 125');
    expect(summary).toHaveTextContent('Support: 125');
  });

  it('shows the time from now() and ticks every second', () => {
    setup({ fakeTimers: true });
    expect(screen.getByText(/09:30:00/)).toBeInTheDocument();
    tick();
    tick();
    expect(screen.getByText(/09:30:02/)).toBeInTheDocument();
  });

  it('filters by name, case-insensitively', async () => {
    const { user } = setup();
    await user.type(filter(), 'ITEM 49');
    expect(await screen.findByText('Showing 10 of 500')).toBeInTheDocument();
    expect(itemButton('Item 490')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Item 001' })).not.toBeInTheDocument();
  });

  it('toggles the theme and selects a single row', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(itemButton('Item 003'));
    expect(itemButton('Item 003')).toHaveAttribute('aria-pressed', 'true');
    await user.click(itemButton('Item 007'));
    expect(itemButton('Item 007')).toHaveAttribute('aria-pressed', 'true');
    expect(itemButton('Item 003')).toHaveAttribute('aria-pressed', 'false');
  });
});

describeTask('Render performance audit: render budgets', () => {
  it('clock ticks do not re-render any rows', () => {
    const { count, reset } = setup({ fakeTimers: true });
    reset();
    for (let i = 0; i < 5; i++) tick();
    expect(screen.getByText(/09:30:05/)).toBeInTheDocument();
    expect(count('Clock')).toBeGreaterThanOrEqual(5);
    expect(count('Row')).toBe(0);
  });

  it('clock ticks do not re-render the sidebar, filter or list, or recompute stats', () => {
    const { count, reset } = setup({ fakeTimers: true });
    reset();
    for (let i = 0; i < 5; i++) tick();
    expect(count('Sidebar')).toBe(0);
    expect(count('FilterInput')).toBe(0);
    expect(count('ItemList')).toBe(0);
    expect(count('computeStats')).toBe(0);
  });

  it(`typing one character re-renders at most ${ROW_BUDGET} rows`, async () => {
    const { user, count, reset } = setup();
    reset();
    await user.type(filter(), '4');
    // "4" matches 176 of the 500 names.
    expect(await screen.findByText('Showing 176 of 500')).toBeInTheDocument();
    expect(count('Row')).toBeLessThanOrEqual(ROW_BUDGET);
  });

  it('typing does not re-render the sidebar or recompute stats', async () => {
    const { user, count, reset } = setup();
    reset();
    await user.type(filter(), '49');
    expect(await screen.findByText('Showing 15 of 500')).toBeInTheDocument();
    expect(count('Sidebar')).toBe(0);
    expect(count('computeStats')).toBe(0);
  });

  it(`toggling the theme re-renders at most ${ROW_BUDGET} rows and does not recompute stats`, async () => {
    const { user, count, reset } = setup();
    reset();
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'false');
    expect(count('Row')).toBeLessThanOrEqual(ROW_BUDGET);
    expect(count('computeStats')).toBe(0);
  });

  it('selecting a row re-renders only the rows whose selection changed', async () => {
    const { user, count, reset } = setup();
    await user.click(itemButton('Item 003'));
    reset();
    await user.click(itemButton('Item 007'));
    expect(itemButton('Item 007')).toHaveAttribute('aria-pressed', 'true');
    // The previously selected row and the newly selected row, with a little slack.
    expect(count('Row')).toBeLessThanOrEqual(4);
    expect(count('computeStats')).toBe(0);
    expect(count('Sidebar')).toBe(0);
  });
});
