// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { IsoDate } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const DatePicker = impl.default;

interface SetupOptions {
  value?: IsoDate | null;
  today?: IsoDate;
  min?: IsoDate;
  max?: IsoDate;
}

function setup({ value = null, today = '2026-09-14', min, max }: SetupOptions = {}) {
  const onChange = vi.fn();
  function Harness() {
    const [v, setV] = useState<IsoDate | null>(value);
    return (
      <DatePicker
        label="Start date"
        value={v}
        today={today}
        min={min}
        max={max}
        onChange={(next) => {
          onChange(next);
          setV(next);
        }}
      />
    );
  }
  const user = userEvent.setup();
  render(<Harness />);
  return { user, onChange };
}

const trigger = () => screen.getByRole('button', { name: 'Choose date' });
const day = (name: string) => screen.getByRole('gridcell', { name });
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.getByRole('dialog', { name: 'Choose date' });
}

describeTask('DatePicker', () => {
  it('renders a read-only input with the value and a closed calendar', () => {
    setup({ value: '2026-09-15' });
    expect(screen.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-09-15');
    expect(trigger()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a modal dialog on the selected month with focus on the selected day', async () => {
    const { user } = setup({ value: '2026-09-15' });
    const dialog = await open(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('grid', { name: 'September 2026' })).toBeInTheDocument();
    expect(day('15 September 2026')).toHaveFocus();
    expect(day('15 September 2026')).toHaveAttribute('aria-selected', 'true');
    expect(day('14 September 2026')).toHaveAttribute('aria-current', 'date');
    expect(day('1 September 2026')).toBeInTheDocument();
    expect(day('30 September 2026')).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '31 September 2026' })).not.toBeInTheDocument();
  });

  it("opens on today's month and focuses today when there is no value", async () => {
    const { user } = setup({ today: '2026-02-10' });
    await open(user);
    expect(screen.getByRole('grid', { name: 'February 2026' })).toBeInTheDocument();
    expect(day('10 February 2026')).toHaveFocus();
    expect(screen.queryByRole('gridcell', { name: '29 February 2026' })).not.toBeInTheDocument();
  });

  it('changes month with the Previous month / Next month buttons', async () => {
    const { user } = setup({ value: '2026-09-15' });
    await open(user);
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    expect(day('31 October 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('grid', { name: 'August 2026' })).toBeInTheDocument();
  });

  it('selects a clicked day, closes, and returns focus to the button', async () => {
    const { user, onChange } = setup({ value: '2026-09-15' });
    await open(user);
    await user.click(day('20 September 2026'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2026-09-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-09-20');
    expect(trigger()).toHaveFocus();
  });

  it('moves focus by day and week with the arrow keys', async () => {
    const { user } = setup({ value: '2026-09-15' });
    await open(user);
    await user.keyboard('{ArrowRight}');
    expect(day('16 September 2026')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(day('23 September 2026')).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(day('9 September 2026')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(day('8 September 2026')).toHaveFocus();
  });

  it('crosses month boundaries with the arrow keys', async () => {
    const { user } = setup({ value: '2026-09-30' });
    await open(user);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    expect(day('1 October 2026')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('grid', { name: 'September 2026' })).toBeInTheDocument();
    expect(day('24 September 2026')).toHaveFocus();
  });

  it('moves to the week start/end with Home/End (weeks start on Sunday)', async () => {
    // 15 September 2026 is a Tuesday.
    const { user } = setup({ value: '2026-09-15' });
    await open(user);
    await user.keyboard('{Home}');
    expect(day('13 September 2026')).toHaveFocus();
    await user.keyboard('{End}');
    expect(day('19 September 2026')).toHaveFocus();
  });

  it('moves by month and year with PageUp/PageDown, clamping the day', async () => {
    const { user } = setup({ value: '2026-01-31' });
    await open(user);
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('grid', { name: 'February 2026' })).toBeInTheDocument();
    expect(day('28 February 2026')).toHaveFocus();
    await user.keyboard('{PageUp}');
    expect(day('28 January 2026')).toHaveFocus();
    await user.keyboard('{Shift>}{PageUp}{/Shift}');
    expect(screen.getByRole('grid', { name: 'January 2025' })).toBeInTheDocument();
    expect(day('28 January 2025')).toHaveFocus();
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(day('28 January 2026')).toHaveFocus();
  });

  it('selects the focused day with Enter and closes', async () => {
    const { user, onChange } = setup({ value: '2026-09-15' });
    await open(user);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-09-16');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes on Escape without changing the value', async () => {
    const { user, onChange } = setup({ value: '2026-09-15' });
    await open(user);
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-09-15');
    expect(trigger()).toHaveFocus();
  });

  it('disables days outside min/max for click and keyboard selection', async () => {
    const { user, onChange } = setup({ value: '2026-09-15', min: '2026-09-10', max: '2026-09-20' });
    await open(user);
    expect(day('9 September 2026')).toHaveAttribute('aria-disabled', 'true');
    expect(day('21 September 2026')).toHaveAttribute('aria-disabled', 'true');
    expect(day('10 September 2026')).not.toHaveAttribute('aria-disabled', 'true');
    expect(day('20 September 2026')).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(day('21 September 2026'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    day('20 September 2026').focus();
    await user.keyboard('{ArrowRight}');
    expect(day('21 September 2026')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
