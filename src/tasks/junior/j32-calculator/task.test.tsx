// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const Calculator = impl.default;

const KEY_NAMES: Record<string, string> = {
  '.': 'Decimal point',
  '±': 'Toggle sign',
  '+': 'Add',
  '-': 'Subtract',
  '×': 'Multiply',
  '÷': 'Divide',
  '=': 'Equals',
  AC: 'All clear',
  '⌫': 'Backspace',
};

const display = () => screen.getByRole('status').textContent?.trim();

/** Clicks keys by their visible symbol, e.g. press(user, '1', '2', '+', '3', '='). */
async function press(user: ReturnType<typeof userEvent.setup>, ...keys: string[]) {
  for (const key of keys) {
    await user.click(screen.getByRole('button', { name: KEY_NAMES[key] ?? key }));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describeTask('Calculator', () => {
  it('starts at 0 and renders every key', () => {
    render(<Calculator />);
    expect(display()).toBe('0');
    for (const name of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ...Object.values(KEY_NAMES)]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('builds numbers from digits and drops a leading zero', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '0', '0', '7');
    expect(display()).toBe('7');
    await press(user, '2', '5');
    expect(display()).toBe('725');
  });

  it('evaluates immediately, left to right, without eval', async () => {
    const evalSpy = vi.spyOn(globalThis, 'eval');
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '2', '+', '3', '×');
    expect(display()).toBe('5');
    await press(user, '4', '=');
    expect(display()).toBe('20');
    await press(user, '÷', '8', '-', '1', '=');
    expect(display()).toBe('1.5');
    expect(evalSpy).not.toHaveBeenCalled();
  });

  it('replaces the operator when two are pressed in a row', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '6', '+', '×', '2', '=');
    expect(display()).toBe('12');
  });

  it('repeats the last operation on repeated =, and continues from a result', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '2', '+', '3', '=');
    expect(display()).toBe('5');
    await press(user, '=');
    expect(display()).toBe('8');
    await press(user, '=');
    expect(display()).toBe('11');
    await press(user, '×', '2', '=');
    expect(display()).toBe('22');
    await press(user, '9');
    expect(display()).toBe('9');
  });

  it('allows only one decimal point per number', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '.');
    expect(display()).toBe('0.');
    await press(user, '5', '.', '2');
    expect(display()).toBe('0.52');
    await press(user, '+', '.', '5', '=');
    expect(display()).toBe('1.02');
  });

  it('hides floating-point noise in results', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '.', '1', '+', '.', '2', '=');
    expect(display()).toBe('0.3');
    await press(user, 'AC', '1', '÷', '4', '=');
    expect(display()).toBe('0.25');
  });

  it('shows Error on divide by zero and recovers with the next digit', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '5', '÷', '0', '=');
    expect(display()).toBe('Error');
    await press(user, '+', '=', '±', '⌫');
    expect(display()).toBe('Error');
    await press(user, '7', '+', '1', '=');
    expect(display()).toBe('8');
  });

  it('supports backspace and toggle sign', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '1', '2', '3', '⌫');
    expect(display()).toBe('12');
    await press(user, '±');
    expect(display()).toBe('-12');
    await press(user, '±');
    expect(display()).toBe('12');
    await press(user, '⌫', '⌫');
    expect(display()).toBe('0');
    await press(user, '±');
    expect(display()).toBe('0');
    await press(user, '4', '+', '4', '=', '⌫');
    expect(display()).toBe('8');
  });

  it('AC clears the pending operation', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await press(user, '5', '+', '3', 'AC');
    expect(display()).toBe('0');
    await press(user, '2', '=');
    expect(display()).toBe('2');
  });

  it('accepts keyboard input without focusing the calculator', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await user.keyboard('12+3*2{Enter}');
    expect(display()).toBe('30');
    await user.keyboard('{Escape}');
    expect(display()).toBe('0');
    await user.keyboard('7/2=');
    expect(display()).toBe('3.5');
    await user.keyboard('96{Backspace}-1.5{Enter}');
    expect(display()).toBe('7.5');
  });

  it('ignores keys pressed with Ctrl or Meta held', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await user.keyboard('4');
    await user.keyboard('{Control>}5{/Control}{Meta>}6{/Meta}');
    expect(display()).toBe('4');
  });
});

describeFollowUp(1, 'operator precedence', () => {
  it('applies × and ÷ before + and −', async () => {
    const user = userEvent.setup();
    render(<Calculator precedence />);
    await press(user, '2', '+', '3', '×', '4', '=');
    expect(display()).toBe('14');
    await press(user, 'AC', '1', '0', '-', '2', '×', '3', '+', '1', '=');
    expect(display()).toBe('5');
    await press(user, 'AC', '8', '÷', '4', '÷', '2', '=');
    expect(display()).toBe('1');
  });
});
