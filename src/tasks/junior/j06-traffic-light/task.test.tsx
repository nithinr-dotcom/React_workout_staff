// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const TrafficLight = impl.default;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const expectLight = (name: 'Red' | 'Green' | 'Yellow') => expect(screen.getByText(`Current light: ${name}`)).toBeInTheDocument();

describeTask('TrafficLight', () => {
  it('starts on red by default', () => {
    render(<TrafficLight />);
    expectLight('Red');
  });

  it('stays red for the full red duration, then turns green', () => {
    render(<TrafficLight />);
    advance(3999);
    expectLight('Red');
    advance(1);
    expectLight('Green');
  });

  it('cycles red → green → yellow → red with the default durations', () => {
    render(<TrafficLight />);
    advance(4000);
    expectLight('Green');
    advance(2999);
    expectLight('Green');
    advance(1);
    expectLight('Yellow');
    advance(999);
    expectLight('Yellow');
    advance(1);
    expectLight('Red');
    advance(4000);
    expectLight('Green');
  });

  it('uses custom durations and merges them with the defaults', () => {
    render(<TrafficLight durations={{ red: 500, yellow: 200 }} />);
    advance(500);
    expectLight('Green');
    advance(2999);
    expectLight('Green');
    advance(1);
    expectLight('Yellow');
    advance(200);
    expectLight('Red');
  });

  it('respects initialColor', () => {
    render(<TrafficLight initialColor="yellow" />);
    expectLight('Yellow');
    advance(1000);
    expectLight('Red');
  });

  it('does not restart the timer when the parent re-renders with a new durations object', () => {
    let rerenderParent: () => void = () => {};
    function Parent() {
      const [, setN] = useState(0);
      rerenderParent = () => setN((n) => n + 1);
      return <TrafficLight durations={{ red: 1000 }} />;
    }
    render(<Parent />);
    advance(600);
    act(() => rerenderParent());
    advance(400);
    expectLight('Green');
  });

  it('keeps a single timer chain under StrictMode', () => {
    render(
      <StrictMode>
        <TrafficLight />
      </StrictMode>,
    );
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1);
    advance(4000);
    expectLight('Green');
    advance(3000);
    expectLight('Yellow');
  });

  it('leaves no pending timers after unmount', () => {
    const { unmount } = render(<TrafficLight />);
    advance(4500);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
