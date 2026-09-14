import type { PageItem, PaginationProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function getPageItems(totalPages: number, currentPage: number, siblingCount = 1): PageItem[] {
  // Your implementation here. Requirements are in README.md.
  void totalPages;
  void currentPage;
  void siblingCount;
  throw new Error('getPageItems: not implemented');
}

export default function Pagination({ totalPages, currentPage, onPageChange, siblingCount = 1 }: PaginationProps) {
  // Your implementation here. Requirements are in README.md.
  void onPageChange;
  void siblingCount;
  return (
    <div className={styles.root}>
      Pagination (page {currentPage} of {totalPages}): start coding in Solution.tsx
    </div>
  );
}
