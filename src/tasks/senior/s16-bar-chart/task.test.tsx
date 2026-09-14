// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { BarDatum } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const BarChart = impl.default;

const DATA: BarDatum[] = [
  { label: 'Sprint 1', value: 21 },
  { label: 'Sprint 2', value: 34 },
  { label: 'Sprint 3', value: 37 },
  { label: 'Sprint 4', value: 14 },
];

const bars = () => screen.getAllByLabelText(/^Sprint \d: /);
const bar = (label: string, value: string | number) => screen.getByLabelText(`${label}: ${value}`);
const heightOf = (el: Element) => Number(el.getAttribute('height'));

describeTask('BarChart', () => {
  it('renders a figure named by the title with one focusable bar per datum, in order', () => {
    render(<BarChart title="Velocity" data={DATA} />);
    expect(screen.getByRole('figure', { name: 'Velocity' })).toBeInTheDocument();
    expect(bars().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sprint 1: 21',
      'Sprint 2: 34',
      'Sprint 3: 37',
      'Sprint 4: 14',
    ]);
    for (const b of bars()) expect(b).toHaveAttribute('tabindex', '0');
  });

  it('scales bar heights proportionally to their values', () => {
    render(<BarChart title="Velocity" data={DATA} />);
    const h21 = heightOf(bar('Sprint 1', 21));
    const h34 = heightOf(bar('Sprint 2', 34));
    const h14 = heightOf(bar('Sprint 4', 14));
    expect(h34).toBeGreaterThan(0);
    expect(h21 / h34).toBeCloseTo(21 / 34, 2);
    expect(h14 / h34).toBeCloseTo(14 / 34, 2);
  });

  it('draws nice y-axis ticks from 0 to the nice maximum in a responsive svg', () => {
    const { container } = render(<BarChart title="Velocity" data={DATA} />);
    for (const t of ['0', '10', '20', '30', '40', '50']) expect(screen.getByText(t)).toBeInTheDocument();
    expect(screen.queryByText('60')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('viewBox');
  });

  it('uses valueFormatter for aria-labels and ticks', () => {
    render(<BarChart title="Velocity" data={DATA} valueFormatter={(v) => `${v} pts`} />);
    expect(bar('Sprint 3', '37 pts')).toBeInTheDocument();
    expect(screen.getByText('50 pts')).toBeInTheDocument();
  });

  it('shows a tooltip on hover and hides it on unhover', async () => {
    const user = userEvent.setup();
    render(<BarChart title="Velocity" data={DATA} />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.hover(bar('Sprint 2', 34));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Sprint 2');
    expect(tooltip).toHaveTextContent('34');
    await user.unhover(bar('Sprint 2', 34));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows a tooltip on focus, linked with aria-describedby, and hides it on Escape', async () => {
    const user = userEvent.setup();
    render(<BarChart title="Velocity" data={DATA} />);
    const first = bar('Sprint 1', 21);
    act(() => first.focus());
    expect(first).toHaveFocus();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Sprint 1');
    expect(tooltip).toHaveTextContent('21');
    expect(first.getAttribute('aria-describedby')).toContain(tooltip.id);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides the tooltip on blur', async () => {
    render(<BarChart title="Velocity" data={DATA} />);
    act(() => bar('Sprint 3', 37).focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sprint 3');
    act(() => bar('Sprint 3', 37).blur());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('moves focus between bars with arrow keys, Home and End (no wrap)', async () => {
    const user = userEvent.setup();
    render(<BarChart title="Velocity" data={DATA} />);
    bar('Sprint 1', 21).focus();
    await user.keyboard('{ArrowRight}');
    expect(bar('Sprint 2', 34)).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sprint 2');
    await user.keyboard('{End}');
    expect(bar('Sprint 4', 14)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(bar('Sprint 4', 14)).toHaveFocus();
    await user.keyboard('{Home}{ArrowLeft}');
    expect(bar('Sprint 1', 21)).toHaveFocus();
  });

  it('sorts bars by value descending with the toggle, and restores data order', async () => {
    const user = userEvent.setup();
    render(<BarChart title="Velocity" data={DATA} />);
    const toggle = screen.getByRole('button', { name: 'Sort by value' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(bars().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sprint 3: 37',
      'Sprint 2: 34',
      'Sprint 1: 21',
      'Sprint 4: 14',
    ]);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(bars().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sprint 1: 21',
      'Sprint 2: 34',
      'Sprint 3: 37',
      'Sprint 4: 14',
    ]);
  });

  it('renders "No data" for an empty dataset', () => {
    render(<BarChart title="Velocity" data={[]} />);
    expect(screen.getByRole('figure', { name: 'Velocity' })).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryAllByLabelText(/: /)).toHaveLength(0);
  });
});
