import type { CSSProperties, FC, ReactElement, ReactNode, RefCallback } from 'react';

/*
 * Minimal public contract. Tests and the Playground depend on everything here.
 * Extend it freely (arrow positioning, autoUpdate, middleware…), but don't break it.
 */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Placement = Side | `${Side}-start` | `${Side}-end`;

/** Viewport-relative coordinates, the same space as `getBoundingClientRect()`. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PositionOptions {
  /** Preferred placement. Default `'bottom'`. */
  placement?: Placement;
  /** Gap in px between anchor and floating element along the main axis. Default `0`. */
  offset?: number;
  /** Flip to the opposite side when the preferred side overflows and the opposite doesn't. Default `true`. */
  flip?: boolean;
  /** Slide along the cross axis to stay inside the viewport. Default `true`. */
  shift?: boolean;
  /** Minimum distance in px to keep from the viewport edges (used by flip and shift). Default `0`. */
  padding?: number;
}

export interface PositionResult {
  /** Left edge of the floating element, viewport-relative. */
  x: number;
  /** Top edge of the floating element, viewport-relative. */
  y: number;
  /** The placement actually used, after flipping. Alignment is preserved (`bottom-start` → `top-start`). */
  placement: Placement;
}

export type ComputePosition = (anchor: Rect, floating: Size, viewport: Rect, options?: PositionOptions) => PositionResult;

export interface UsePopoverOptions extends PositionOptions {
  /** Only measure and position while open. */
  open: boolean;
}

export interface UsePopoverResult {
  /** Attach to the anchor element. */
  anchorRef: RefCallback<HTMLElement>;
  /** Attach to the floating element. */
  floatingRef: RefCallback<HTMLElement>;
  /** Spread onto the floating element. Contains at least `position: 'fixed'`, `top` and `left` (px numbers). */
  style: CSSProperties;
  /** Final placement after flipping. */
  placement: Placement;
  /** Re-measure and re-position now. */
  update: () => void;
}

export interface TooltipProps {
  /** Tooltip text or content. */
  content: ReactNode;
  /** A single element that can hold a ref and receive focus/hover handlers. */
  children: ReactElement;
  placement?: Placement;
  /** Delay before showing, in ms. Default `300`. */
  openDelay?: number;
  /** Delay before hiding, in ms. Default `0`. */
  closeDelay?: number;
}

export interface PopoverModule {
  computePosition: ComputePosition;
  usePopover: (options: UsePopoverOptions) => UsePopoverResult;
  Tooltip: FC<TooltipProps>;
}
