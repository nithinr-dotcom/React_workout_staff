import type { ComponentType } from 'react';

export interface MasonryItem {
  id: string;
  /** Intrinsic width of the image, any unit. Only the ratio with `height` matters. */
  width: number;
  /** Intrinsic height of the image. */
  height: number;
}

export interface Photo extends MasonryItem {
  src: string;
  alt: string;
}

/** Where one item goes, in px relative to the top-left of the grid. */
export interface MasonryPosition {
  id: string;
  /** 0-based column index. */
  column: number;
  x: number;
  y: number;
  /** Always the column width. */
  width: number;
  /** The item's height scaled to the column width. */
  height: number;
}

export interface MasonryProps {
  items: Photo[];
  /** Smallest allowed column width in px. The column count is derived from the container width. */
  minColumnWidth: number;
  /** Fixed column count. When set, it overrides `minColumnWidth`. */
  columns?: number;
  /** Space between columns and between items in a column, in px. Default 16. */
  gap?: number;
  /** Container width in px. When omitted, measure the container with ResizeObserver. Tests pass it. */
  width?: number;
  /** Called when the user nears the end of the list and `hasMore` is true. */
  onLoadMore?: () => void;
  /** Default false. */
  hasMore?: boolean;
  /** Accessible name of the list. Default `Photos`. */
  label?: string;
}

export interface MasonryModule {
  default: ComponentType<MasonryProps>;
  /** One position per item, in input order. Never mutates the input. */
  computeMasonry(items: MasonryItem[], columnCount: number, columnWidth: number, gap: number): MasonryPosition[];
}
