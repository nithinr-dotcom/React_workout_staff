// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { VirtualizedListProps } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const VirtualizedList = impl.default;

const renderRow = (index: number) => <span>{`Row ${index}`}</span>;

function setup(props: Partial<VirtualizedListProps> = {}) {
  const renderItem = vi.fn(props.renderItem ?? renderRow);
  const utils = render(
    <VirtualizedList itemCount={10_000} itemHeight={20} height={200} label="Rows" {...props} renderItem={renderItem} />,
  );
  return { ...utils, renderItem, list: () => screen.getByRole('list', { name: 'Rows' }) };
}

function scrollTo(list: HTMLElement, top: number) {
  list.scrollTop = top;
  fireEvent.scroll(list);
}

describeTask('VirtualizedList', () => {
  it('renders a labelled list with the given viewport height', () => {
    const { list } = setup();
    expect(list()).toHaveStyle({ height: '200px' });
  });

  it('mounts the first screenful of rows and nothing far below', () => {
    setup();
    for (let i = 0; i < 10; i++) expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
    expect(screen.queryByText('Row 30')).not.toBeInTheDocument();
    expect(screen.queryByText('Row 500')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeLessThanOrEqual(30);
  });

  it('calls renderItem only for mounted rows', () => {
    const { renderItem } = setup();
    const indices = renderItem.mock.calls.map(([index]) => index);
    expect(indices.length).toBeGreaterThan(0);
    expect(Math.max(...indices)).toBeLessThan(30);
  });

  it('mounts the rows for the new scroll position after scrolling', async () => {
    const { list } = setup();
    scrollTo(list(), 5000);
    expect(await screen.findByText('Row 250')).toBeInTheDocument();
    expect(screen.getByText('Row 259')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Row 0')).not.toBeInTheDocument());
    expect(screen.queryByText('Row 100')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeLessThanOrEqual(30);
  });

  it('mounts overscan rows above and below the visible window', async () => {
    const { list } = setup({ overscan: 5 });
    scrollTo(list(), 5000);
    expect(await screen.findByText('Row 245')).toBeInTheDocument();
    expect(screen.getByText('Row 264')).toBeInTheDocument();
    expect(screen.queryByText('Row 235')).not.toBeInTheDocument();
    expect(screen.queryByText('Row 275')).not.toBeInTheDocument();
  });

  it('respects overscan = 0', async () => {
    const { list } = setup({ overscan: 0 });
    scrollTo(list(), 5000);
    expect(await screen.findByText('Row 255')).toBeInTheDocument();
    expect(screen.queryByText('Row 245')).not.toBeInTheDocument();
    expect(screen.queryByText('Row 265')).not.toBeInTheDocument();
  });

  it('reaches the last row when scrolled to the bottom', async () => {
    const { list } = setup();
    scrollTo(list(), 10_000 * 20 - 200);
    expect(await screen.findByText('Row 9999')).toBeInTheDocument();
    expect(screen.queryByText('Row 10000')).not.toBeInTheDocument();
  });

  it('exposes position and set size on each row', async () => {
    const { list } = setup();
    scrollTo(list(), 5000);
    const row = (await screen.findByText('Row 250')).closest('[role="listitem"]');
    expect(row).toHaveAttribute('aria-posinset', '251');
    expect(row).toHaveAttribute('aria-setsize', '10000');
  });

  it('renders every row when the list is shorter than the viewport', () => {
    setup({ itemCount: 4 });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Row 3')).toBeInTheDocument();
  });

  it('never renders rows beyond itemCount after it shrinks', async () => {
    const { list, rerender } = setup();
    scrollTo(list(), 5000);
    await screen.findByText('Row 250');
    rerender(<VirtualizedList itemCount={100} itemHeight={20} height={200} label="Rows" renderItem={renderRow} />);
    await waitFor(() => expect(screen.queryByText('Row 250')).not.toBeInTheDocument());
    for (const item of screen.queryAllByRole('listitem')) {
      expect(Number(item.getAttribute('aria-posinset'))).toBeLessThanOrEqual(100);
    }
  });

  it('renders "No items" for an empty list', () => {
    setup({ itemCount: 0 });
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
