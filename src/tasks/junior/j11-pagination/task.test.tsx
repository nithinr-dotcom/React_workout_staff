// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { PaginationModule } from './types';

const { impl: rawImpl, describeTask } = pickTarget(Solution, Reference);
const impl = rawImpl as unknown as PaginationModule;
const Pagination = impl.default;

const E = 'ellipsis' as const;

describeTask('getPageItems', () => {
  it('shows first, last, current ± 1 and ellipses in the middle', () => {
    expect(impl.getPageItems(20, 5)).toEqual([1, E, 4, 5, 6, E, 20]);
  });

  it('handles the first and last page', () => {
    expect(impl.getPageItems(20, 1)).toEqual([1, 2, E, 20]);
    expect(impl.getPageItems(20, 20)).toEqual([1, E, 19, 20]);
  });

  it('never hides a single page behind an ellipsis', () => {
    expect(impl.getPageItems(20, 4)).toEqual([1, 2, 3, 4, 5, E, 20]);
    expect(impl.getPageItems(20, 17)).toEqual([1, E, 16, 17, 18, 19, 20]);
    expect(impl.getPageItems(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('respects siblingCount', () => {
    expect(impl.getPageItems(20, 10, 0)).toEqual([1, E, 10, E, 20]);
    expect(impl.getPageItems(20, 10, 2)).toEqual([1, E, 8, 9, 10, 11, 12, E, 20]);
  });

  it('handles tiny and empty ranges, and clamps currentPage', () => {
    expect(impl.getPageItems(0, 1)).toEqual([]);
    expect(impl.getPageItems(1, 1)).toEqual([1]);
    expect(impl.getPageItems(2, 1)).toEqual([1, 2]);
    expect(impl.getPageItems(20, 99)).toEqual([1, E, 19, 20]);
  });
});

describeTask('Pagination', () => {
  it('renders a labelled nav with named page buttons and marks the current page', () => {
    render(<Pagination totalPages={20} currentPage={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page');
    for (const n of [1, 4, 6, 20]) {
      expect(screen.getByRole('button', { name: `Page ${n}` })).not.toHaveAttribute('aria-current');
    }
    expect(screen.queryByRole('button', { name: 'Page 10' })).not.toBeInTheDocument();
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('calls onPageChange when a different page is clicked, not for the current page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={20} currentPage={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Page 20' }));
    expect(onPageChange).toHaveBeenCalledWith(20);
    onPageChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('Previous and Next move by one page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination totalPages={20} currentPage={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(<Pagination totalPages={20} currentPage={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    rerender(<Pagination totalPages={20} currentPage={20} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('updates when the parent changes currentPage', () => {
    const { rerender } = render(<Pagination totalPages={20} currentPage={5} onPageChange={vi.fn()} />);
    rerender(<Pagination totalPages={20} currentPage={12} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 12' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 11' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 13' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Page 5' })).not.toBeInTheDocument();
  });

  it('renders a single page with both arrows disabled', () => {
    render(<Pagination totalPages={1} currentPage={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no pages', () => {
    render(<Pagination totalPages={0} currentPage={1} onPageChange={vi.fn()} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
