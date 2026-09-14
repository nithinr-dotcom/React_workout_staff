import type { ReactNode } from 'react';

export interface VirtualizedListProps {
  /** Total number of rows. */
  itemCount: number;
  /** Fixed height of every row, in px. */
  itemHeight: number;
  /** Height of the scroll viewport, in px. */
  height: number;
  /** Renders the content of row `index` (0-based). Called only for mounted rows. */
  renderItem: (index: number) => ReactNode;
  /** Extra rows to mount above and below the visible window. Default 3. */
  overscan?: number;
  /** Accessible name of the list. */
  label: string;
}
