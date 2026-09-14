// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { PasswordGeneratorProps } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const PasswordGenerator = impl.default;

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';

/** mulberry32: deterministic numbers in [0, 1). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(props: PasswordGeneratorProps = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  // user-event installs its own clipboard stub in setup(), so replace it afterwards.
  const writeText = vi.fn((_text: string) => Promise.resolve());
  Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
  render(<PasswordGenerator random={seeded(7)} {...props} />);
  return { user, writeText };
}

const slider = () => screen.getByRole('slider', { name: /^Length/ });
const checkbox = (name: string) => screen.getByRole('checkbox', { name });
const passwordField = () => screen.getByRole('textbox', { name: 'Password' }) as HTMLInputElement;
const setLength = (n: number) => fireEvent.change(slider(), { target: { value: String(n) } });
const generate = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Generate' }));
const meter = () =>
  screen.queryByRole('meter', { name: 'Password strength' }) ?? screen.getByRole('progressbar', { name: 'Password strength' });

async function uncheck(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) await user.click(checkbox(name));
}

describeTask('PasswordGenerator', () => {
  it('renders the controls with all sets checked and an empty read-only password', () => {
    setup();
    expect(slider()).toHaveValue('12');
    for (const name of ['Uppercase', 'Lowercase', 'Numbers', 'Symbols']) expect(checkbox(name)).toBeChecked();
    expect(passwordField()).toHaveAttribute('readonly');
    expect(passwordField()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
  });

  it('generates a password of the selected length', async () => {
    const { user } = setup();
    setLength(20);
    await generate(user);
    expect(passwordField().value).toHaveLength(20);
    setLength(5);
    await generate(user);
    expect(passwordField().value).toHaveLength(5);
  });

  it('respects defaultLength', async () => {
    const { user } = setup({ defaultLength: 6 });
    expect(slider()).toHaveValue('6');
    await generate(user);
    expect(passwordField().value).toHaveLength(6);
  });

  it('picks characters with s[Math.floor(random() * s.length)] from the selected set only', async () => {
    const { user } = setup({ random: () => 0 });
    setLength(8);
    await uncheck(user, 'Uppercase', 'Numbers', 'Symbols');
    await generate(user);
    expect(passwordField()).toHaveValue('aaaaaaaa');
  });

  it('never produces an out-of-range index for random values close to 1', async () => {
    const { user } = setup({ random: () => 0.999999 });
    setLength(6);
    await uncheck(user, 'Uppercase', 'Lowercase', 'Symbols');
    await generate(user);
    expect(passwordField()).toHaveValue('999999');
  });

  it('only uses characters from the selected sets', async () => {
    const { user } = setup();
    setLength(32);
    await uncheck(user, 'Uppercase', 'Lowercase');
    for (let i = 0; i < 5; i++) {
      await generate(user);
      const value = passwordField().value;
      expect(value).toHaveLength(32);
      for (const ch of value) expect(NUMBERS + SYMBOLS).toContain(ch);
    }
  });

  it('includes at least one character from every selected set', async () => {
    const { user } = setup();
    setLength(4);
    for (let i = 0; i < 25; i++) {
      await generate(user);
      const value = passwordField().value;
      expect(value).toHaveLength(4);
      for (const set of [UPPERCASE, LOWERCASE, NUMBERS, SYMBOLS]) {
        expect([...value].some((ch) => set.includes(ch))).toBe(true);
      }
    }
  });

  it('keeps at least one option checked', async () => {
    const { user } = setup();
    await uncheck(user, 'Uppercase', 'Numbers', 'Symbols');
    expect(checkbox('Lowercase')).toBeChecked();
    await user.click(checkbox('Lowercase'));
    expect(checkbox('Lowercase')).toBeChecked();
    await user.click(checkbox('Numbers'));
    await user.click(checkbox('Lowercase'));
    expect(checkbox('Lowercase')).not.toBeChecked();
    expect(checkbox('Numbers')).toBeChecked();
  });

  it('rates strength using the README rule', async () => {
    const { user } = setup();
    expect(screen.queryByText(/^(Weak|Medium|Strong)$/)).not.toBeInTheDocument();

    setLength(16);
    await generate(user);
    expect(meter()).toBeInTheDocument();
    expect(screen.getByText('Strong')).toBeInTheDocument();

    setLength(6);
    await generate(user);
    expect(screen.getByText('Weak')).toBeInTheDocument();

    setLength(10);
    await uncheck(user, 'Numbers', 'Symbols');
    await generate(user);
    expect(screen.getByText('Medium')).toBeInTheDocument();

    setLength(20);
    await uncheck(user, 'Uppercase');
    await generate(user);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('copies the password and shows "Copied!" for 2 seconds', async () => {
    const { user, writeText } = setup();
    await generate(user);
    const value = passwordField().value;
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(value);
    expect(await screen.findByText('Copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('does not show "Copied!" when the clipboard write fails', async () => {
    const { user, writeText } = setup();
    writeText.mockImplementation(() => Promise.reject(new Error('denied')));
    await generate(user);
    await user.click(screen.getByRole('button', { name: /^Copy/ }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalled();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });
});

describeFollowUp(2, 'exclude ambiguous characters', () => {
  it('never uses I, l, 1, O, 0 or o when the option is checked', async () => {
    const { user } = setup();
    const exclude = checkbox('Exclude ambiguous characters');
    expect(exclude).not.toBeChecked();
    await user.click(exclude);
    setLength(32);
    for (let i = 0; i < 20; i++) {
      await generate(user);
      expect(passwordField().value).toHaveLength(32);
      expect(passwordField().value).not.toMatch(/[Il1O0o]/);
    }
  });
});
