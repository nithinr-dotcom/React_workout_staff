import type { ComponentType } from 'react';

export interface Segment {
  text: string;
  /** True when this piece of text matched one of the queries. */
  match: boolean;
}

export interface HighlighterProps {
  text: string;
  /** A string is split on whitespace into separate terms. An array is used as-is. */
  query: string | string[];
}

export interface HighlighterModule {
  /**
   * Splits `text` into ordered segments whose concatenation is exactly `text`.
   * Matching is case-insensitive; overlapping or adjacent matches merge into one segment.
   */
  highlight(text: string, queries: string[]): Segment[];

  /**
   * Follow-up 2: wraps every match inside the text nodes under `root` in a `<mark>` element.
   * Returns the number of `<mark>` elements created.
   */
  highlightInDom(root: Element, queries: string[]): number;

  default: ComponentType<HighlighterProps>;
}
