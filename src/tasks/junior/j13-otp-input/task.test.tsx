import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const OtpInput = impl.default;

const box = (n: number, of = 6) => screen.getByRole('textbox', { name: `Digit ${n} of ${of}` }) as HTMLInputElement;
const values = (of = 6) => Array.from({ length: of }, (_, i) => box(i + 1, of).value);

describeTask('OtpInput', () => {
  it('renders six empty labelled boxes inside a named group by default', () => {
    render(<OtpInput />);
    const group = screen.getByRole('group', { name: 'One-time code' });
    expect(within(group).getAllByRole('textbox')).toHaveLength(6);
    expect(values()).toEqual(['', '', '', '', '', '']);
  });

  it('respects a custom length', () => {
    render(<OtpInput length={4} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
    expect(box(4, 4)).toBeInTheDocument();
  });

  it('typing a digit fills the box and moves focus to the next box', async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    await user.click(box(1));
    await user.keyboard('4');
    expect(box(1)).toHaveValue('4');
    expect(box(2)).toHaveFocus();
    await user.keyboard('27');
    expect(values()).toEqual(['4', '2', '7', '', '', '']);
    expect(box(4)).toHaveFocus();
  });

  it('ignores non-digit characters', async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    await user.click(box(1));
    await user.keyboard('a');
    expect(box(1)).toHaveValue('');
    expect(box(1)).toHaveFocus();
    await user.keyboard('-');
    expect(box(1)).toHaveValue('');
    expect(box(1)).toHaveFocus();
  });

  it('typing into a filled box replaces its digit', async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    await user.click(box(1));
    await user.keyboard('123');
    await user.click(box(2));
    await user.keyboard('9');
    expect(values()).toEqual(['1', '9', '3', '', '', '']);
    expect(box(3)).toHaveFocus();
  });

  it('Backspace clears a filled box, then moves back and clears the previous one', async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    await user.click(box(1));
    await user.keyboard('123');
    // focus is on box 4 (empty): Backspace moves to box 3 and clears it
    await user.keyboard('{Backspace}');
    expect(box(3)).toHaveFocus();
    expect(values()).toEqual(['1', '2', '', '', '', '']);
    // box 2 is filled: clear it in place
    await user.click(box(2));
    await user.keyboard('{Backspace}');
    expect(box(2)).toHaveFocus();
    expect(values()).toEqual(['1', '', '', '', '', '']);
  });

  it('Backspace in the first empty box does nothing', async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    await user.click(box(1));
    await user.keyboard('{Backspace}');
    expect(box(1)).toHaveFocus();
    expect(values()).toEqual(['', '', '', '', '', '']);
  });

  it('ArrowLeft / ArrowRight move focus without wrapping or changing values', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} />);
    await user.click(box(1, 4));
    await user.keyboard('{ArrowLeft}');
    expect(box(1, 4)).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(box(3, 4)).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(box(4, 4)).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(box(3, 4)).toHaveFocus();
    expect(values(4)).toEqual(['', '', '', '']);
  });

  it('paste strips non-digits and distributes from the focused box', async () => {
    const user = userEvent.setup();
    render(<OtpInput />);
    await user.click(box(1));
    await user.paste('12-34');
    expect(values()).toEqual(['1', '2', '3', '4', '', '']);
    expect(box(5)).toHaveFocus();
  });

  it('paste from a middle box drops digits that do not fit', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OtpInput onComplete={onComplete} />);
    await user.click(box(4));
    await user.paste('987654');
    expect(values()).toEqual(['', '', '', '9', '8', '7']);
    expect(box(6)).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete once with the code when the last box is typed', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OtpInput onComplete={onComplete} />);
    await user.click(box(1));
    await user.keyboard('12345');
    expect(onComplete).not.toHaveBeenCalled();
    await user.keyboard('6');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('a paste that fills every box calls onComplete exactly once', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OtpInput onComplete={onComplete} />);
    await user.click(box(1));
    await user.paste('Your code is 482 913');
    expect(values()).toEqual(['4', '8', '2', '9', '1', '3']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('482913');
  });
});
