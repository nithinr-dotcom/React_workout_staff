// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const MaskedInput = impl.default;

const CARD = '#### #### #### ####';
const PHONE = '(###) ###-####';

function setup(mask: string, defaultValue?: string) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<MaskedInput label="Number" mask={mask} defaultValue={defaultValue} onChange={onChange} />);
  const input = screen.getByRole('textbox', { name: 'Number' }) as HTMLInputElement;
  return { user, onChange, input };
}

describeTask('MaskedInput', () => {
  it('renders an empty, labelled numeric text input', () => {
    const { input } = setup(CARD);
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('formats a card number as the user types and reports raw digits', async () => {
    const { user, input, onChange } = setup(CARD);
    await user.type(input, '42424');
    expect(input).toHaveValue('4242 4');
    await user.type(input, '24242424242');
    expect(input).toHaveValue('4242 4242 4242 4242');
    expect(onChange).toHaveBeenLastCalledWith('4242424242424242');
  });

  it('shows literals only when a digit follows them', async () => {
    const { user, input } = setup(PHONE);
    await user.type(input, '4');
    expect(input).toHaveValue('(4');
    await user.type(input, '15');
    expect(input).toHaveValue('(415');
    await user.type(input, '5');
    expect(input).toHaveValue('(415) 5');
    await user.type(input, '552671');
    expect(input).toHaveValue('(415) 555-2671');
  });

  it('ignores non-digits and only calls onChange when the digits change', async () => {
    const { user, input, onChange } = setup(PHONE);
    await user.type(input, '4a1-5 x');
    expect(input).toHaveValue('(415');
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['4', '41', '415']);
  });

  it('drops digits beyond the mask capacity', async () => {
    const { user, input, onChange } = setup('##/##');
    await user.type(input, '123456');
    expect(input).toHaveValue('12/34');
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith('1234');
  });

  it('formats defaultValue on first render without calling onChange', () => {
    const { input, onChange } = setup(PHONE, '4155552671');
    expect(input).toHaveValue('(415) 555-2671');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes digits with Backspace at the end, dropping trailing literals', async () => {
    const { user, input, onChange } = setup(PHONE, '4155');
    expect(input).toHaveValue('(415) 5');
    await user.type(input, '{Backspace}');
    expect(input).toHaveValue('(415');
    expect(onChange).toHaveBeenLastCalledWith('415');
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('(41');
    expect(onChange).toHaveBeenLastCalledWith('41');
  });

  it('extracts digits from pasted text', async () => {
    const { user, input, onChange } = setup(CARD);
    await user.click(input);
    await user.paste('4111-1111 1111 1111 99');
    expect(input).toHaveValue('4111 1111 1111 1111');
    expect(onChange).toHaveBeenLastCalledWith('4111111111111111');
  });

  it('does nothing when pasting into a full input', async () => {
    const { user, input, onChange } = setup('##/##', '1234');
    await user.click(input);
    await user.paste('99');
    expect(input).toHaveValue('12/34');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('inserts a digit in the middle and keeps the caret after it', async () => {
    const { user, input, onChange } = setup(CARD, '42424242');
    expect(input).toHaveValue('4242 4242');
    await user.type(input, '9', { initialSelectionStart: 2, initialSelectionEnd: 2 });
    expect(input).toHaveValue('4294 2424 2');
    expect(onChange).toHaveBeenLastCalledWith('429424242');
    await waitFor(() => expect(input.selectionStart).toBe(3));
  });

  it('Backspace right after a literal deletes the digit before it', async () => {
    const { user, input, onChange } = setup(CARD, '42424242');
    // caret after the space: "4242 |4242"
    await user.type(input, '{Backspace}', { initialSelectionStart: 5, initialSelectionEnd: 5 });
    expect(input).toHaveValue('4244 242');
    expect(onChange).toHaveBeenLastCalledWith('4244242');
    await waitFor(() => expect(input.selectionStart).toBe(3));
  });
});
