// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const TransferList = impl.default;

const left = () => within(screen.getByRole('group', { name: 'Available' }));
const right = () => within(screen.getByRole('group', { name: 'Selected' }));
type Scope = ReturnType<typeof left>;
/** Asserts the item checkboxes in a list (excluding Select all) are exactly `names`, in order. */
function expectItems(list: Scope, names: string[]) {
  const actual = list.queryAllByRole('checkbox', { name: /^(?!Select all$)/ });
  expect(actual).toHaveLength(names.length);
  names.forEach((name, i) => expect(actual[i]).toBe(list.getByRole('checkbox', { name })));
}
const button = (name: string) => screen.getByRole('button', { name });

function renderList(leftItems = ['A', 'B', 'C', 'D'], rightItems = ['E', 'F']) {
  return render(<TransferList leftItems={leftItems} rightItems={rightItems} />);
}

describeTask('TransferList', () => {
  it('renders both lists with unticked item checkboxes', () => {
    renderList();
    expectItems(left(), ['A', 'B', 'C', 'D']);
    expectItems(right(), ['E', 'F']);
    expect(left().getByRole('checkbox', { name: 'B' })).not.toBeChecked();
  });

  it('moves ticked items right, appended in source order and unticked', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(left().getByRole('checkbox', { name: 'C' }));
    await user.click(left().getByRole('checkbox', { name: 'A' }));
    await user.click(button('Move selected right'));
    expectItems(left(), ['B', 'D']);
    expectItems(right(), ['E', 'F', 'A', 'C']);
    expect(right().getByRole('checkbox', { name: 'A' })).not.toBeChecked();
    expect(right().getByRole('checkbox', { name: 'C' })).not.toBeChecked();
  });

  it('moves ticked items left without touching the left selection', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(left().getByRole('checkbox', { name: 'B' }));
    await user.click(right().getByRole('checkbox', { name: 'F' }));
    await user.click(button('Move selected left'));
    expectItems(left(), ['A', 'B', 'C', 'D', 'F']);
    expectItems(right(), ['E']);
    expect(left().getByRole('checkbox', { name: 'B' })).toBeChecked();
  });

  it('disables move-selected buttons until something is ticked in their source list', async () => {
    const user = userEvent.setup();
    renderList();
    expect(button('Move selected right')).toBeDisabled();
    expect(button('Move selected left')).toBeDisabled();
    await user.click(left().getByRole('checkbox', { name: 'A' }));
    expect(button('Move selected right')).toBeEnabled();
    expect(button('Move selected left')).toBeDisabled();
  });

  it('moves everything with Move all right / Move all left', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(button('Move all right'));
    expectItems(right(), ['E', 'F', 'A', 'B', 'C', 'D']);
    expect(left().getByText('No items')).toBeInTheDocument();
    expect(button('Move all right')).toBeDisabled();

    await user.click(button('Move all left'));
    expectItems(left(), ['E', 'F', 'A', 'B', 'C', 'D']);
    expect(right().getByText('No items')).toBeInTheDocument();
    expect(button('Move all left')).toBeDisabled();
  });

  it('Select all ticks and unticks every item in its list', async () => {
    const user = userEvent.setup();
    renderList();
    const selectAll = left().getByRole('checkbox', { name: 'Select all' });
    await user.click(selectAll);
    for (const name of ['A', 'B', 'C', 'D']) expect(left().getByRole('checkbox', { name })).toBeChecked();
    expect(selectAll).toBeChecked();
    expect(right().getByRole('checkbox', { name: 'E' })).not.toBeChecked();

    await user.click(selectAll);
    for (const name of ['A', 'B', 'C', 'D']) expect(left().getByRole('checkbox', { name })).not.toBeChecked();
    expect(selectAll).not.toBeChecked();
  });

  it('shows Select all as indeterminate when some items are ticked, and ticks all when clicked', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(left().getByRole('checkbox', { name: 'B' }));
    const selectAll = left().getByRole('checkbox', { name: 'Select all' });
    expect(selectAll).toBePartiallyChecked();
    await user.click(selectAll);
    expect(selectAll).not.toBePartiallyChecked();
    for (const name of ['A', 'B', 'C', 'D']) expect(left().getByRole('checkbox', { name })).toBeChecked();
  });

  it('checks Select all when every item is ticked one by one', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(right().getByRole('checkbox', { name: 'E' }));
    await user.click(right().getByRole('checkbox', { name: 'F' }));
    const selectAll = right().getByRole('checkbox', { name: 'Select all' });
    expect(selectAll).toBeChecked();
    expect(selectAll).not.toBePartiallyChecked();
  });

  it('unchecks and disables Select all when its list becomes empty', async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(left().getByRole('checkbox', { name: 'Select all' }));
    await user.click(button('Move selected right'));
    const selectAll = left().getByRole('checkbox', { name: 'Select all' });
    expect(selectAll).not.toBeChecked();
    expect(selectAll).toBeDisabled();
    expect(left().getByText('No items')).toBeInTheDocument();
  });

  it('uses custom titles', () => {
    render(<TransferList leftItems={['x']} rightItems={[]} leftTitle="Todo" rightTitle="Done" />);
    expect(screen.getByRole('group', { name: 'Todo' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Done' })).getByText('No items')).toBeInTheDocument();
  });
});
