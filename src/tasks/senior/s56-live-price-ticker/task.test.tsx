// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Instrument, Subscribe, Tick } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const PriceTicker = impl.default;

const INSTRUMENTS: Instrument[] = [
  { symbol: 'AAPL', name: 'Apple', open: 200 },
  { symbol: 'MSFT', name: 'Microsoft', open: 400 },
  { symbol: 'BTC', name: 'Bitcoin', open: 60000 },
];
const SYMBOLS = INSTRUMENTS.map((i) => i.symbol);

function createFeed() {
  const listeners = new Set<(tick: Tick) => void>();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn<Subscribe>((onTick) => {
    listeners.add(onTick);
    return () => {
      listeners.delete(onTick);
      unsubscribe();
    };
  });
  // Wrapped in act so that an implementation that (wrongly) renders on every tick still gets clear failures.
  const emit = (symbol: string, price: number) =>
    act(() => {
      for (const listener of [...listeners]) listener({ symbol, price });
    });
  return { subscribe, unsubscribe, emit, listenerCount: () => listeners.size };
}

const emitAll = (feed: ReturnType<typeof createFeed>, ticks: [string, number][]) => {
  for (const [symbol, price] of ticks) feed.emit(symbol, price);
};

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const frame = () => advance(20);

const table = () => screen.getByRole('table', { name: 'Live prices' });
const dataRows = () => within(table()).getAllByRole('row').filter((row) => SYMBOLS.some((s) => within(row).queryByText(s)));
const rowFor = (symbol: string) => dataRows().find((row) => within(row).queryByText(symbol))!;
const rowOrder = () => dataRows().map((row) => SYMBOLS.find((s) => within(row).queryByText(s)));
const flashOf = (symbol: string, priceText: string) =>
  within(rowFor(symbol)).getByText(priceText).closest('[data-flash]')?.getAttribute('data-flash') ?? null;

beforeEach(() => {
  vi.useFakeTimers();
});

describeTask('PriceTicker', () => {
  it('renders the table with headers and initial rows, and subscribes once', () => {
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    for (const name of ['Symbol', 'Price', 'Change', 'Change %']) {
      expect(within(table()).getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(rowOrder()).toEqual(['AAPL', 'MSFT', 'BTC']);
    const btc = within(rowFor('BTC'));
    expect(btc.getByText('$60,000.00')).toBeInTheDocument();
    expect(btc.getByText('0.00')).toBeInTheDocument();
    expect(btc.getByText('0.00%')).toBeInTheDocument();
    expect(feed.subscribe).toHaveBeenCalledTimes(1);
  });

  it('applies ticks on the next frame with Intl formatting and ignores unknown symbols', () => {
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    emitAll(feed, [
      ['AAPL', 203.5],
      ['MSFT', 390],
      ['BTC', 61234.5],
      ['DOGE', 0.12],
    ]);
    frame();
    const aapl = within(rowFor('AAPL'));
    expect(aapl.getByText('$203.50')).toBeInTheDocument();
    expect(aapl.getByText('+3.50')).toBeInTheDocument();
    expect(aapl.getByText('+1.75%')).toBeInTheDocument();
    const msft = within(rowFor('MSFT'));
    expect(msft.getByText('$390.00')).toBeInTheDocument();
    expect(msft.getByText('-10.00')).toBeInTheDocument();
    expect(msft.getByText('-2.50%')).toBeInTheDocument();
    expect(within(rowFor('BTC')).getByText('$61,234.50')).toBeInTheDocument();
    expect(screen.queryByText('DOGE')).not.toBeInTheDocument();
    expect(dataRows()).toHaveLength(3);
  });

  it('shows the latest values after a large burst', () => {
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    for (let i = 1; i <= 300; i++) {
      feed.emit(SYMBOLS[i % 3], 100 + i);
    }
    frame();
    // Last ticks: i=298 → MSFT (298 % 3 = 1), i=299 → BTC, i=300 → AAPL.
    expect(within(rowFor('AAPL')).getByText('$400.00')).toBeInTheDocument();
    expect(within(rowFor('MSFT')).getByText('$398.00')).toBeInTheDocument();
    expect(within(rowFor('BTC')).getByText('$399.00')).toBeInTheDocument();
  });

  it('commits at most once per animation frame while ticks keep arriving', () => {
    const feed = createFeed();
    let commits = 0;
    render(
      <Profiler id="ticker" onRender={() => commits++}>
        <PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />
      </Profiler>,
    );
    frame(); // settle anything scheduled on mount
    commits = 0;
    // 8 ticks, 2ms apart: 16ms in total, so at most two frames.
    for (let i = 0; i < 8; i++) {
      feed.emit('AAPL', 201 + i);
      advance(2);
    }
    frame();
    expect(within(rowFor('AAPL')).getByText('$208.00')).toBeInTheDocument();
    expect(commits).toBeGreaterThanOrEqual(1);
    expect(commits).toBeLessThanOrEqual(2);
  });

  it('flashes up on a rise and down on a fall, and clears the flash after about 600ms', () => {
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    expect(flashOf('AAPL', '$200.00')).toBeNull();

    feed.emit('AAPL', 201);
    feed.emit('MSFT', 399);
    frame();
    expect(flashOf('AAPL', '$201.00')).toBe('up');
    expect(flashOf('MSFT', '$399.00')).toBe('down');
    expect(flashOf('BTC', '$60,000.00')).toBeNull();

    advance(400);
    expect(flashOf('AAPL', '$201.00')).toBe('up');
    advance(300);
    expect(flashOf('AAPL', '$201.00')).toBeNull();
    expect(flashOf('MSFT', '$399.00')).toBeNull();

    // An unchanged price does not flash.
    feed.emit('AAPL', 201);
    frame();
    expect(flashOf('AAPL', '$201.00')).toBeNull();
  });

  it('restarts the flash (and switches direction) when another change arrives mid-flash', () => {
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    feed.emit('AAPL', 201);
    frame(); // t ≈ 20
    advance(380); // t ≈ 400
    feed.emit('AAPL', 202);
    frame(); // t ≈ 420, flash restarts
    advance(480); // t ≈ 900: the first flash would have ended by now
    expect(flashOf('AAPL', '$202.00')).toBe('up');
    feed.emit('AAPL', 199);
    frame();
    expect(flashOf('AAPL', '$199.00')).toBe('down');
    advance(700);
    expect(flashOf('AAPL', '$199.00')).toBeNull();
  });

  it('sorts by change %, descending then ascending, and re-sorts live', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    emitAll(feed, [
      ['AAPL', 210], // +5%
      ['MSFT', 380], // -5%
      ['BTC', 60600], // +1%
    ]);
    frame();
    const header = within(table()).getByRole('columnheader', { name: 'Change %' });

    await user.click(within(header).getByRole('button', { name: 'Change %' }));
    frame();
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(rowOrder()).toEqual(['AAPL', 'BTC', 'MSFT']);

    await user.click(within(header).getByRole('button', { name: 'Change %' }));
    frame();
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(rowOrder()).toEqual(['MSFT', 'BTC', 'AAPL']);

    feed.emit('BTC', 54000); // -10%
    frame();
    expect(rowOrder()).toEqual(['BTC', 'MSFT', 'AAPL']);
  });

  it('pauses by unsubscribing and resumes by subscribing again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const feed = createFeed();
    render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(feed.unsubscribe).toHaveBeenCalledTimes(1);
    expect(feed.listenerCount()).toBe(0);
    feed.emit('AAPL', 250);
    frame();
    expect(within(rowFor('AAPL')).getByText('$200.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(feed.subscribe).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    feed.emit('AAPL', 250);
    frame();
    expect(within(rowFor('AAPL')).getByText('$250.00')).toBeInTheDocument();
  });

  it('unsubscribes on unmount and ignores ticks already buffered', () => {
    const feed = createFeed();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<PriceTicker instruments={INSTRUMENTS} subscribe={feed.subscribe} />);
    feed.emit('AAPL', 201);
    unmount();
    expect(feed.unsubscribe).toHaveBeenCalledTimes(1);
    expect(feed.listenerCount()).toBe(0);
    frame();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
