import type {
  PositionOptions,
  PositionResult,
  Rect,
  Size,
  TooltipProps,
  UsePopoverOptions,
  UsePopoverResult,
} from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function computePosition(anchor: Rect, floating: Size, viewport: Rect, options: PositionOptions = {}): PositionResult {
  // Your implementation here. Requirements are in README.md.
  void anchor;
  void floating;
  void viewport;
  void options;
  throw new Error('computePosition: not implemented');
}

export function usePopover(options: UsePopoverOptions): UsePopoverResult {
  void options;
  throw new Error('usePopover: not implemented');
}

export function Tooltip({ content, children, placement, openDelay = 300, closeDelay = 0 }: TooltipProps) {
  void content;
  void placement;
  void openDelay;
  void closeDelay;
  // Placeholder: renders the trigger without any tooltip behaviour.
  return children;
}
