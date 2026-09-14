// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Placement } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);

const VIEWPORT = { x: 0, y: 0, width: 1000, height: 800 };
const anchor = { x: 100, y: 100, width: 80, height: 20 };
const small = { width: 40, height: 30 };

describeTask('computePosition', () => {
  it('centres on the anchor for plain sides and applies offset on the main axis', () => {
    const at = (placement: Placement) => {
      const { x, y } = impl.computePosition(anchor, small, VIEWPORT, { placement, offset: 10 });
      return { x, y };
    };
    expect(at('bottom')).toEqual({ x: 120, y: 130 });
    expect(at('top')).toEqual({ x: 120, y: 60 });
    expect(at('left')).toEqual({ x: 50, y: 95 });
    expect(at('right')).toEqual({ x: 190, y: 95 });
    // Defaults: bottom, offset 0.
    expect(impl.computePosition(anchor, small, VIEWPORT)).toEqual({ x: 120, y: 120, placement: 'bottom' });
  });

  it('aligns start and end edges on the cross axis', () => {
    const at = (placement: Placement) => {
      const { x, y } = impl.computePosition(anchor, small, VIEWPORT, { placement });
      return { x, y };
    };
    expect(at('bottom-start')).toEqual({ x: 100, y: 120 });
    expect(at('bottom-end')).toEqual({ x: 140, y: 120 });
    expect(at('right-start')).toEqual({ x: 180, y: 100 });
    expect(at('right-end')).toEqual({ x: 180, y: 90 });
  });

  it('flips to the opposite side when the preferred side overflows, preserving alignment', () => {
    const nearBottom = { x: 100, y: 760, width: 80, height: 20 };
    expect(impl.computePosition(nearBottom, small, VIEWPORT, { placement: 'bottom' })).toEqual({
      x: 120,
      y: 730,
      placement: 'top',
    });
    expect(impl.computePosition(nearBottom, small, VIEWPORT, { placement: 'bottom-start' })).toEqual({
      x: 100,
      y: 730,
      placement: 'top-start',
    });
    const nearLeft = { x: 5, y: 100, width: 20, height: 20 };
    expect(impl.computePosition(nearLeft, small, VIEWPORT, { placement: 'left' })).toMatchObject({
      x: 25,
      placement: 'right',
    });
  });

  it('does not flip when flip is false, or when the opposite side overflows too', () => {
    const nearBottom = { x: 100, y: 760, width: 80, height: 20 };
    expect(impl.computePosition(nearBottom, small, VIEWPORT, { placement: 'bottom', flip: false })).toMatchObject({
      y: 780,
      placement: 'bottom',
    });
    const shortViewport = { x: 0, y: 0, width: 1000, height: 60 };
    const middle = { x: 100, y: 20, width: 80, height: 20 };
    expect(impl.computePosition(middle, small, shortViewport, { placement: 'bottom' })).toMatchObject({
      y: 40,
      placement: 'bottom',
    });
  });

  it('uses padding when deciding whether to flip', () => {
    const a = { x: 100, y: 740, width: 80, height: 20 };
    expect(impl.computePosition(a, small, VIEWPORT, { placement: 'bottom' }).placement).toBe('bottom');
    expect(impl.computePosition(a, small, VIEWPORT, { placement: 'bottom', padding: 20 })).toMatchObject({
      y: 710,
      placement: 'top',
    });
  });

  it('shifts along the cross axis to stay inside the (padded) viewport', () => {
    const wide = { width: 100, height: 30 };
    const leftEdge = { x: 0, y: 100, width: 20, height: 20 };
    const rightEdge = { x: 980, y: 100, width: 20, height: 20 };
    expect(impl.computePosition(leftEdge, wide, VIEWPORT).x).toBe(0);
    expect(impl.computePosition(leftEdge, wide, VIEWPORT, { padding: 8 }).x).toBe(8);
    expect(impl.computePosition(rightEdge, wide, VIEWPORT).x).toBe(900);
    expect(impl.computePosition(leftEdge, wide, VIEWPORT, { shift: false }).x).toBe(-40);
  });
});

describeTask('usePopover', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('positions the floating element with fixed top/left from measured rects', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const r = this.tagName === 'BUTTON' ? { x: 100, y: 100, width: 80, height: 20 } : { x: 0, y: 0, width: 200, height: 50 };
      return { ...r, top: r.y, left: r.x, right: r.x + r.width, bottom: r.y + r.height, toJSON: () => r } as DOMRect;
    });

    function Demo() {
      const p = impl.usePopover({ open: true, placement: 'bottom', offset: 8 });
      return (
        <>
          <button type="button" ref={p.anchorRef}>
            Anchor
          </button>
          <div role="dialog" aria-label="Pop" ref={p.floatingRef} style={p.style}>
            content
          </div>
        </>
      );
    }

    render(<Demo />);
    const dialog = screen.getByRole('dialog', { name: 'Pop' });
    await waitFor(() => {
      expect(dialog.style.position).toBe('fixed');
      expect(dialog.style.top).toBe('128px');
      expect(dialog.style.left).toBe('40px');
    });
  });
});

describeTask('Tooltip', () => {
  const setup = () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <impl.Tooltip content="Copy link">
        <button type="button">Share</button>
      </impl.Tooltip>,
    );
    return { user, trigger: screen.getByRole('button', { name: 'Share' }) };
  };

  it('shows after openDelay on hover and links the trigger with aria-describedby', async () => {
    const { user, trigger } = setup();
    await user.hover(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Copy link');
    expect(trigger).toHaveAccessibleDescription('Copy link');

    await user.unhover(trigger);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('cancels a pending show when the pointer leaves before the delay', async () => {
    const { user, trigger } = setup();
    await user.hover(trigger);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    await user.unhover(trigger);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows on keyboard focus and hides on Escape', async () => {
    const { user, trigger } = setup();
    await user.tab();
    expect(trigger).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Copy link');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(trigger).toHaveFocus();
  });
});
