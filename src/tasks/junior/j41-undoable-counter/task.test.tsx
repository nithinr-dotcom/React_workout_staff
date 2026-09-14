// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const UndoableCounter = impl.default;

function setup(initialValue?: number) {
  const user = userEvent.setup();
  render(<UndoableCounter initialValue={initialValue} />);
  return { user };
}

const button = (name: string) => screen.getByRole('button', { name });
const count = () => screen.getByRole('status').textContent?.trim();
const historyRows = () =>
  within(screen.getByRole('table', { name: 'History' }))
    .getAllByRole('row')
    .map((row) => within(row).queryAllByRole('cell'))
    .filter((cells) => cells.length === 2)
    .map((cells) => cells.map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()));

async function press(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) await user.click(button(name));
}

describeTask('UndoableCounter', () => {
  it('starts at initialValue with Undo and Redo disabled and an empty history', () => {
    setup(3);
    expect(count()).toBe('3');
    expect(button('Undo')).toBeDisabled();
    expect(button('Redo')).toBeDisabled();
    expect(historyRows()).toEqual([]);
  });

  it('defaults to 0 and applies all four operations', async () => {
    const { user } = setup();
    expect(count()).toBe('0');
    await press(user, '+1');
    expect(count()).toBe('1');
    await press(user, 'x2');
    expect(count()).toBe('2');
    await press(user, 'x2');
    expect(count()).toBe('4');
    await press(user, '-1');
    expect(count()).toBe('3');
    await press(user, '/2');
    expect(count()).toBe('1.5');
  });

  it('lists operations in the history table, newest first', async () => {
    const { user } = setup(4);
    await press(user, '+1', 'x2', '/2');
    expect(historyRows()).toEqual([
      ['/2', '10 → 5'],
      ['x2', '5 → 10'],
      ['+1', '4 → 5'],
    ]);
    expect(within(screen.getByRole('table', { name: 'History' })).getByRole('columnheader', { name: 'Operation' })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'History' })).getByRole('columnheader', { name: 'Result' })).toBeInTheDocument();
  });

  it('undoes the latest operation and removes it from the history', async () => {
    const { user } = setup(4);
    await press(user, '+1', 'x2');
    expect(button('Undo')).toBeEnabled();
    await press(user, 'Undo');
    expect(count()).toBe('5');
    expect(historyRows()).toEqual([['+1', '4 → 5']]);
    expect(button('Redo')).toBeEnabled();
  });

  it('undoes and redoes many steps', async () => {
    const { user } = setup();
    await press(user, '+1', '+1', 'x2');
    expect(count()).toBe('4');
    await press(user, 'Undo', 'Undo', 'Undo');
    expect(count()).toBe('0');
    expect(button('Undo')).toBeDisabled();
    expect(historyRows()).toEqual([]);

    await press(user, 'Redo', 'Redo');
    expect(count()).toBe('2');
    expect(historyRows()).toEqual([
      ['+1', '1 → 2'],
      ['+1', '0 → 1'],
    ]);
    await press(user, 'Redo');
    expect(count()).toBe('4');
    expect(button('Redo')).toBeDisabled();
  });

  it('clears the redo stack when a new operation follows an undo', async () => {
    const { user } = setup(10);
    await press(user, '+1', '+1', 'Undo', 'Undo');
    expect(button('Redo')).toBeEnabled();
    await press(user, '-1');
    expect(count()).toBe('9');
    expect(button('Redo')).toBeDisabled();
    expect(historyRows()).toEqual([['-1', '10 → 9']]);
  });

  it('records no-op and negative results', async () => {
    const { user } = setup();
    await press(user, 'x2', '-1', '/2');
    expect(count()).toBe('-0.5');
    expect(historyRows()).toEqual([
      ['/2', '-1 → -0.5'],
      ['-1', '0 → -1'],
      ['x2', '0 → 0'],
    ]);
  });

  it('does not lose rapid clicks', async () => {
    const { user } = setup();
    await user.tripleClick(button('+1'));
    expect(count()).toBe('3');
    expect(historyRows()).toHaveLength(3);
  });
});

describeFollowUp(1, 'history capped at 50', () => {
  it('keeps only the latest 50 steps', async () => {
    const { user } = setup();
    for (let i = 0; i < 55; i++) await user.click(button('+1'));
    expect(count()).toBe('55');
    const rows = historyRows();
    expect(rows).toHaveLength(50);
    expect(rows[0]).toEqual(['+1', '54 → 55']);
    expect(rows[49]).toEqual(['+1', '5 → 6']);
    for (let i = 0; i < 50; i++) await user.click(button('Undo'));
    expect(count()).toBe('5');
    expect(button('Undo')).toBeDisabled();
  });
});

describeFollowUp(3, 'keyboard shortcuts', () => {
  it('Ctrl+Z undoes and Ctrl+Shift+Z redoes', async () => {
    const { user } = setup();
    await press(user, '+1', '+1');
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard('{Control>}z{/Control}');
    expect(count()).toBe('1');
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}');
    expect(count()).toBe('2');
  });

  it('ignores shortcuts while typing in a text field', async () => {
    const user = userEvent.setup();
    render(
      <>
        <UndoableCounter />
        <input aria-label="Notes" />
      </>,
    );
    await press(user, '+1');
    await user.click(screen.getByRole('textbox', { name: 'Notes' }));
    await user.keyboard('{Control>}z{/Control}');
    expect(count()).toBe('1');
  });
});
