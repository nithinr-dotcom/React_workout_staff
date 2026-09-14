// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { SortableItem } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const SortableList = impl.default;

const ITEMS: SortableItem[] = [
  { id: 'a', label: 'Apple' },
  { id: 'b', label: 'Banana' },
  { id: 'c', label: 'Cherry' },
  { id: 'd', label: 'Date' },
];

function setup(items: SortableItem[] = ITEMS) {
  const onReorder = vi.fn();
  const user = userEvent.setup();
  render(<SortableList items={items} onReorder={onReorder} label="Fruit" />);
  return { user, onReorder };
}

const handle = (label: string) => screen.getByRole('button', { name: `Reorder ${label}` });
const status = () => screen.getByRole('status');
function expectOrder(labels: string[]) {
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(labels.length);
  labels.forEach((label, i) => expect(rows[i]).toHaveTextContent(label));
}
const byLabels = (labels: string[]) => labels.map((l) => ITEMS.find((i) => i.label === l)!);

describeTask('SortableList', () => {
  it('renders a labelled list with a handle per item, none grabbed', () => {
    setup();
    expect(screen.getByRole('list', { name: 'Fruit' })).toBeInTheDocument();
    expectOrder(['Apple', 'Banana', 'Cherry', 'Date']);
    for (const item of ITEMS) expect(handle(item.label)).toHaveAttribute('aria-pressed', 'false');
  });

  it('picks an item up with Space and announces it', async () => {
    const { user } = setup();
    handle('Banana').focus();
    await user.keyboard(' ');
    expect(handle('Banana')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('Picked up Banana. Position 2 of 4.');
  });

  it('moves the grabbed item with arrows, keeps focus on it and announces each move', async () => {
    const { user, onReorder } = setup();
    handle('Apple').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    expectOrder(['Banana', 'Apple', 'Cherry', 'Date']);
    expect(handle('Apple')).toHaveFocus();
    expect(status()).toHaveTextContent('Apple moved to position 2 of 4.');
    await user.keyboard('{ArrowDown}');
    expectOrder(['Banana', 'Cherry', 'Apple', 'Date']);
    expect(handle('Apple')).toHaveFocus();
    expect(status()).toHaveTextContent('Apple moved to position 3 of 4.');
    // not committed yet
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('drops with Space, calls onReorder once with the new order and announces the drop', async () => {
    const { user, onReorder } = setup();
    handle('Date').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard(' ');
    expectOrder(['Apple', 'Date', 'Banana', 'Cherry']);
    expect(handle('Date')).toHaveAttribute('aria-pressed', 'false');
    expect(status()).toHaveTextContent('Date dropped at position 2 of 4.');
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(byLabels(['Apple', 'Date', 'Banana', 'Cherry']));
  });

  it('cancels with Escape, restoring the original position without calling onReorder', async () => {
    const { user, onReorder } = setup();
    handle('Apple').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expectOrder(['Banana', 'Cherry', 'Date', 'Apple']);
    await user.keyboard('{Escape}');
    expectOrder(['Apple', 'Banana', 'Cherry', 'Date']);
    expect(handle('Apple')).toHaveAttribute('aria-pressed', 'false');
    expect(status()).toHaveTextContent('Reorder cancelled. Apple returned to position 1 of 4.');
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not move past the ends of the list', async () => {
    const { user } = setup();
    handle('Apple').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    expectOrder(['Apple', 'Banana', 'Cherry', 'Date']);
    await user.keyboard('{Escape}');

    handle('Date').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    expectOrder(['Apple', 'Banana', 'Cherry', 'Date']);
  });

  it('ignores arrow keys when nothing is grabbed', async () => {
    const { user, onReorder } = setup();
    handle('Banana').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expectOrder(['Apple', 'Banana', 'Cherry', 'Date']);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not call onReorder when dropped at the starting position', async () => {
    const { user, onReorder } = setup();
    handle('Cherry').focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}{ArrowUp}');
    await user.keyboard(' ');
    expect(status()).toHaveTextContent('Cherry dropped at position 3 of 4.');
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('keeps the committed order for the next reorder', async () => {
    const { user, onReorder } = setup();
    handle('Apple').focus();
    await user.keyboard(' {ArrowDown} ');
    expect(onReorder).toHaveBeenLastCalledWith(byLabels(['Banana', 'Apple', 'Cherry', 'Date']));

    handle('Date').focus();
    await user.keyboard(' {ArrowUp} ');
    expectOrder(['Banana', 'Apple', 'Date', 'Cherry']);
    expect(onReorder).toHaveBeenCalledTimes(2);
    expect(onReorder).toHaveBeenLastCalledWith(byLabels(['Banana', 'Apple', 'Date', 'Cherry']));
    // Escape now restores to the committed order, not the initial props
    handle('Cherry').focus();
    await user.keyboard(' {ArrowUp}{Escape}');
    expectOrder(['Banana', 'Apple', 'Date', 'Cherry']);
  });

  it('handles a single-item list', async () => {
    const { user, onReorder } = setup([{ id: 'x', label: 'Only' }]);
    handle('Only').focus();
    await user.keyboard(' ');
    expect(status()).toHaveTextContent('Picked up Only. Position 1 of 1.');
    await user.keyboard('{ArrowDown} ');
    expect(status()).toHaveTextContent('Only dropped at position 1 of 1.');
    expect(onReorder).not.toHaveBeenCalled();
  });
});
