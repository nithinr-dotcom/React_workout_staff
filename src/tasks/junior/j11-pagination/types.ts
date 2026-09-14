import type { ComponentType } from 'react';

export interface PaginationProps {
  /** Total number of pages. 0 renders nothing. */
  totalPages: number;
  /** 1-based current page. */
  currentPage: number;
  /** Called with the 1-based page the user wants. Never called with the current page. */
  onPageChange: (page: number) => void;
  /** Pages shown on each side of the current page. Default 1. */
  siblingCount?: number;
}

export type PageItem = number | 'ellipsis';

/** Shape of Solution.tsx. */
export interface PaginationModule {
  default: ComponentType<PaginationProps>;
  /** Pure helper: the items to render, in order. */
  getPageItems: (totalPages: number, currentPage: number, siblingCount?: number) => PageItem[];
}
