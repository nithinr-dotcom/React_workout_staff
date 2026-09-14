import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { AccordionItem } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Accordion = impl.default;

const items: AccordionItem[] = [
  { id: 'a', title: 'First', content: 'Alpha content' },
  { id: 'b', title: 'Second', content: 'Beta content' },
  { id: 'c', title: 'Third', content: 'Gamma content' },
];

const header = (name: string) => screen.getByRole('button', { name });
const contentVisible = (text: string) => {
  const el = screen.queryByText(text);
  return el !== null && isVisible(el);
};
function isVisible(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node.hidden || getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

describeTask('Accordion', () => {
  it('renders a header button per item, all collapsed by default', () => {
    render(<Accordion items={items} />);
    for (const item of items) {
      expect(header(item.title)).toHaveAttribute('aria-expanded', 'false');
      expect(contentVisible(item.content)).toBe(false);
    }
  });

  it('toggles a section open and closed on click', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    await user.click(header('First'));
    expect(header('First')).toHaveAttribute('aria-expanded', 'true');
    expect(contentVisible('Alpha content')).toBe(true);
    await user.click(header('First'));
    expect(header('First')).toHaveAttribute('aria-expanded', 'false');
    expect(contentVisible('Alpha content')).toBe(false);
  });

  it('exposes open panels as labelled regions', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    await user.click(header('Second'));
    expect(screen.getByRole('region', { name: 'Second' })).toHaveTextContent('Beta content');
  });

  it('only keeps one section open in single mode', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    await user.click(header('First'));
    await user.click(header('Second'));
    expect(header('First')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Second')).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps several sections open with allowMultiple', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} allowMultiple />);
    await user.click(header('First'));
    await user.click(header('Third'));
    expect(header('First')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Third')).toHaveAttribute('aria-expanded', 'true');
  });

  it('respects defaultOpenIds', () => {
    render(<Accordion items={items} allowMultiple defaultOpenIds={['b', 'c']} />);
    expect(header('First')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Second')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Third')).toHaveAttribute('aria-expanded', 'true');
  });

  it('moves focus between headers with arrow keys, Home and End (wrapping)', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    header('First').focus();
    await user.keyboard('{ArrowDown}');
    expect(header('Second')).toHaveFocus();
    await user.keyboard('{End}');
    expect(header('Third')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(header('First')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(header('Third')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(header('First')).toHaveFocus();
  });

  it('toggles with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} allowMultiple />);
    header('First').focus();
    await user.keyboard('{Enter}');
    expect(header('First')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(header('First')).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders "No sections" for an empty list', () => {
    render(<Accordion items={[]} />);
    expect(screen.getByText('No sections')).toBeInTheDocument();
  });

  it('does not collide ids between two accordions', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Accordion items={items} />
        <Accordion items={items} />
      </>,
    );
    const [firstA] = screen.getAllByRole('button', { name: 'First' });
    await user.click(firstA);
    const controls = firstA.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.querySelectorAll(`[id="${controls}"]`)).toHaveLength(1);
  });
});
