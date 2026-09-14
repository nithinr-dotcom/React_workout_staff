// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { MultiSelectOption } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const MultiSelect = impl.default;

const OPTIONS: MultiSelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' },
];

function setup(initial: string[] = []) {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState<string[]>(initial);
    return (
      <MultiSelect
        label="Frameworks"
        options={OPTIONS}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }
  const user = userEvent.setup();
  render(<Harness />);
  return { user, onChange };
}

const combobox = () => screen.getByRole('combobox', { name: 'Frameworks' });
const option = (name: string) => screen.getByRole('option', { name });
const activeOption = () => {
  const id = combobox().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describeTask('MultiSelect', () => {
  it('renders a labelled, collapsed combobox and chips for the initial value', () => {
    setup(['svelte', 'react']);
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    const removes = screen.getAllByRole('button', { name: /^Remove / });
    expect(removes).toHaveLength(2);
    // chips follow selection order
    expect(removes[0]).toHaveAccessibleName('Remove Svelte');
    expect(removes[1]).toHaveAccessibleName('Remove React');
  });

  it('opens a multiselectable listbox on click with aria-selected options', async () => {
    const { user } = setup(['vue']);
    await user.click(combobox());
    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Frameworks' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    expect(combobox().getAttribute('aria-controls')).toBe(listbox.id);
    expect(within(listbox).getAllByRole('option')).toHaveLength(4);
    expect(option('Vue')).toHaveAttribute('aria-selected', 'true');
    expect(option('React')).toHaveAttribute('aria-selected', 'false');
  });

  it('toggles options on click, appending in selection order and staying open', async () => {
    const { user, onChange } = setup(['vue']);
    await user.click(combobox());
    await user.click(option('Solid'));
    expect(onChange).toHaveBeenLastCalledWith(['vue', 'solid']);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(option('Solid')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Remove Solid' })).toBeInTheDocument();

    await user.click(option('Vue'));
    expect(onChange).toHaveBeenLastCalledWith(['solid']);
    expect(screen.queryByRole('button', { name: 'Remove Vue' })).not.toBeInTheDocument();
  });

  it('filters options case-insensitively by substring and shows "No options"', async () => {
    const { user } = setup();
    await user.type(combobox(), 'SOL');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('Solid')]);
    await user.clear(combobox());
    await user.type(combobox(), 'e');
    // React, Vue, Svelte contain "e"
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await user.type(combobox(), 'zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('listbox')).toHaveTextContent('No options');
  });

  it('clears the filter text after an option is picked', async () => {
    const { user, onChange } = setup();
    await user.type(combobox(), 'sv');
    await user.click(option('Svelte'));
    expect(onChange).toHaveBeenLastCalledWith(['svelte']);
    expect(combobox()).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('moves the active option with ArrowDown/ArrowUp (wrapping) and toggles with Enter', async () => {
    const { user, onChange } = setup();
    combobox().focus();
    await user.keyboard('{ArrowDown}');
    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    expect(activeOption()).toBe(option('React'));
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toBe(option('Vue'));
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(activeOption()).toBe(option('Solid'));
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['solid']);
    expect(combobox()).toHaveFocus();
  });

  it('supports Home and End while open', async () => {
    const { user } = setup();
    await user.click(combobox());
    await user.keyboard('{ArrowDown}{End}');
    expect(activeOption()).toBe(option('Solid'));
    await user.keyboard('{Home}');
    expect(activeOption()).toBe(option('React'));
  });

  it('removes a value via its chip button and focuses the input', async () => {
    const { user, onChange } = setup(['react', 'vue']);
    await user.click(screen.getByRole('button', { name: 'Remove React' }));
    expect(onChange).toHaveBeenLastCalledWith(['vue']);
    expect(screen.queryByRole('button', { name: 'Remove React' })).not.toBeInTheDocument();
    expect(combobox()).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('removes the last selected value with Backspace on an empty input', async () => {
    const { user, onChange } = setup(['react', 'vue']);
    combobox().focus();
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(['react']);
    await user.type(combobox(), 'x');
    onChange.mockClear();
    await user.keyboard('{Backspace}');
    // removes the typed character, not a chip
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes on Escape and keeps focus on the combobox', async () => {
    const { user } = setup();
    await user.click(combobox());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(combobox()).toHaveFocus();
  });

  it('closes when clicking outside', async () => {
    const { user } = setup();
    await user.click(combobox());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
