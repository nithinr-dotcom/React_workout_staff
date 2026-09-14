// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { SelectRootProps } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Select = impl.default;

function Fruit(props: Omit<SelectRootProps, 'children'>) {
  return (
    <Select {...props}>
      <Select.Label>Fruit</Select.Label>
      <Select.Trigger placeholder="Pick a fruit" />
      <Select.Options>
        <Select.Option value="apple">Apple</Select.Option>
        <Select.Option value="banana" disabled>
          Banana
        </Select.Option>
        <Select.Option value="blackberry">Blackberry</Select.Option>
        <Select.Option value="blueberry">Blueberry</Select.Option>
        <Select.Option value="cherry">Cherry</Select.Option>
      </Select.Options>
    </Select>
  );
}

const combobox = () => screen.getByRole('combobox', { name: 'Fruit' });
const activeOptionText = () => {
  const id = combobox().getAttribute('aria-activedescendant');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
};

describeTask('Select / Combobox', () => {
  it('renders a labelled, collapsed combobox showing the placeholder', () => {
    render(<Fruit />);
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(combobox()).toHaveTextContent('Pick a fruit');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens on click, selects an option, closes and keeps focus on the combobox', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fruit onValueChange={onValueChange} />);
    await user.click(combobox());
    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    ['Apple', 'Banana', 'Blackberry', 'Blueberry', 'Cherry'].forEach((label, i) => expect(options[i]).toHaveTextContent(label));
    await user.click(screen.getByRole('option', { name: 'Cherry' }));
    expect(onValueChange).toHaveBeenCalledWith('cherry');
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(combobox()).toHaveTextContent('Cherry');
    expect(combobox()).toHaveFocus();
  });

  it('uses defaultValue for the initial selection and marks it aria-selected', async () => {
    const user = userEvent.setup();
    render(<Fruit defaultValue="blueberry" />);
    expect(combobox()).toHaveTextContent('Blueberry');
    await user.click(combobox());
    expect(screen.getByRole('option', { name: 'Blueberry' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Apple' })).not.toHaveAttribute('aria-selected', 'true');
  });

  it('in controlled mode always displays `value` and only reports user picks', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Fruit value="apple" onValueChange={onValueChange} />);
    expect(combobox()).toHaveTextContent('Apple');
    await user.click(combobox());
    await user.click(screen.getByRole('option', { name: 'Cherry' }));
    expect(onValueChange).toHaveBeenCalledWith('cherry');
    // The parent ignored the change, so the display must not drift.
    expect(combobox()).toHaveTextContent('Apple');

    rerender(<Fruit value="cherry" onValueChange={onValueChange} />);
    expect(combobox()).toHaveTextContent('Cherry');
    rerender(<Fruit value={null} onValueChange={onValueChange} />);
    expect(combobox()).toHaveTextContent('Pick a fruit');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation with aria-activedescendant, skipping disabled options', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fruit onValueChange={onValueChange} />);
    combobox().focus();
    await user.keyboard('{ArrowDown}');
    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    expect(combobox()).toHaveFocus();
    expect(activeOptionText()).toContain('Apple');
    await user.keyboard('{ArrowDown}');
    expect(activeOptionText()).toContain('Blackberry');
    await user.keyboard('{End}');
    expect(activeOptionText()).toContain('Cherry');
    await user.keyboard('{Home}');
    expect(activeOptionText()).toContain('Apple');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('blackberry');
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(combobox()).toHaveTextContent('Blackberry');
  });

  it('closes on Escape without changing the value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fruit defaultValue="apple" onValueChange={onValueChange} />);
    combobox().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(combobox()).toHaveTextContent('Apple');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();
    render(<Fruit />);
    await user.click(combobox());
    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    await user.click(document.body);
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
  });

  it('typeahead moves the active option to the first match of the typed prefix', async () => {
    const user = userEvent.setup();
    render(<Fruit />);
    await user.click(combobox());
    await user.keyboard('blu');
    expect(activeOptionText()).toContain('Blueberry');
  });

  it('does not select disabled options and marks them aria-disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onValueChange = vi.fn();
    render(<Fruit onValueChange={onValueChange} />);
    await user.click(combobox());
    const banana = screen.getByRole('option', { name: 'Banana' });
    expect(banana).toHaveAttribute('aria-disabled', 'true');
    await user.click(banana);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(combobox()).toHaveTextContent('Pick a fruit');
  });

  it('participates in native form submission via `name`', async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="order">
        <Fruit name="fruit" defaultValue="cherry" />
      </form>,
    );
    const form = screen.getByRole('form', { name: 'order' }) as HTMLFormElement;
    expect(new FormData(form).get('fruit')).toBe('cherry');
    await user.click(combobox());
    await user.click(screen.getByRole('option', { name: 'Apple' }));
    expect(new FormData(form).get('fruit')).toBe('apple');
  });
});
