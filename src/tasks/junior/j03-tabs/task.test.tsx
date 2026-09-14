import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { TabItem } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Tabs = impl.default;

const tabs: TabItem[] = [
  { id: 'a', label: 'First', content: 'Alpha content' },
  { id: 'b', label: 'Second', content: 'Beta content' },
  { id: 'c', label: 'Third', content: 'Gamma content' },
];

const tab = (name: string) => screen.getByRole('tab', { name });

function expectSelected(label: string) {
  for (const t of tabs) {
    expect(tab(t.label)).toHaveAttribute('aria-selected', t.label === label ? 'true' : 'false');
  }
  const panels = screen.getAllByRole('tabpanel');
  expect(panels).toHaveLength(1);
  const content = tabs.find((t) => t.label === label)!.content;
  expect(screen.getByRole('tabpanel', { name: label })).toHaveTextContent(content);
}

describeTask('Tabs', () => {
  it('renders a tablist with one tab per item and selects the first by default', () => {
    render(<Tabs tabs={tabs} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['First', 'Second', 'Third']);
    expectSelected('First');
  });

  it('respects defaultTabId and falls back to the first tab for an unknown id', () => {
    const { unmount } = render(<Tabs tabs={tabs} defaultTabId="b" />);
    expectSelected('Second');
    unmount();
    render(<Tabs tabs={tabs} defaultTabId="nope" />);
    expectSelected('First');
  });

  it('selects a tab on click and shows only its panel', async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} />);
    await user.click(tab('Third'));
    expectSelected('Third');
    const hiddenContent = screen.queryByText('Alpha content');
    if (hiddenContent) expect(hiddenContent).not.toBeVisible();
  });

  it('links tabs and panels with aria-controls / aria-labelledby', async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} />);
    await user.click(tab('Second'));
    const panel = screen.getByRole('tabpanel', { name: 'Second' });
    expect(tab('Second').getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.id).toBeTruthy();
  });

  it('uses a roving tabindex so only the selected tab is in the Tab order', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Tabs tabs={tabs} defaultTabId="b" />
      </>,
    );
    expect(tab('Second')).toHaveAttribute('tabindex', '0');
    expect(tab('First')).toHaveAttribute('tabindex', '-1');
    expect(tab('Third')).toHaveAttribute('tabindex', '-1');

    await user.tab();
    await user.tab();
    expect(tab('Second')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('tabpanel', { name: 'Second' })).toHaveFocus();
  });

  it('ArrowRight / ArrowLeft move focus and selection, wrapping around', async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} />);
    await user.click(tab('First'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Second')).toHaveFocus();
    expectSelected('Second');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(tab('Third')).toHaveFocus();
    expectSelected('Third');
    await user.keyboard('{ArrowRight}');
    expect(tab('First')).toHaveFocus();
    expectSelected('First');
    expect(tab('First')).toHaveAttribute('tabindex', '0');
    expect(tab('Third')).toHaveAttribute('tabindex', '-1');
  });

  it('Home / End jump to the first / last tab', async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} defaultTabId="b" />);
    tab('Second').focus();
    await user.keyboard('{End}');
    expect(tab('Third')).toHaveFocus();
    expectSelected('Third');
    await user.keyboard('{Home}');
    expect(tab('First')).toHaveFocus();
    expectSelected('First');
  });

  it('renders "No tabs" for an empty list', () => {
    render(<Tabs tabs={[]} />);
    expect(screen.getByText('No tabs')).toBeInTheDocument();
  });

  it('does not collide ids between two instances', () => {
    render(
      <>
        <Tabs tabs={tabs} />
        <Tabs tabs={tabs} />
      </>,
    );
    const [firstA, firstB] = screen.getAllByRole('tab', { name: 'First' });
    const a = firstA.getAttribute('aria-controls');
    const b = firstB.getAttribute('aria-controls');
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
    expect(document.querySelectorAll(`[id="${a}"]`)).toHaveLength(1);
  });
});
