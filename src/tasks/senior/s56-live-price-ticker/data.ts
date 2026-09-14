import type { Instrument, Subscribe, Tick } from './types';

/** Demo instruments for the Playground. Tests build their own. */
export const INSTRUMENTS: Instrument[] = [
  { symbol: 'BTC-USD', name: 'Bitcoin', open: 64_250 },
  { symbol: 'ETH-USD', name: 'Ethereum', open: 3_120.5 },
  { symbol: 'SOL-USD', name: 'Solana', open: 148.2 },
  { symbol: 'AAPL', name: 'Apple', open: 228.1 },
  { symbol: 'MSFT', name: 'Microsoft', open: 431.75 },
  { symbol: 'NVDA', name: 'NVIDIA', open: 118.4 },
  { symbol: 'TSLA', name: 'Tesla', open: 242.9 },
  { symbol: 'AMZN', name: 'Amazon', open: 186.3 },
];

export interface FakeFeedOptions {
  /** Average ms between bursts. Default 250. */
  intervalMs?: number;
  /** Ticks per burst. Default 12. Bursts arrive in a single task, which is what coalescing is for. */
  burstSize?: number;
  /** Max relative move per tick, e.g. 0.002 = 0.2%. Default 0.002. */
  volatility?: number;
  /** Chance per burst that the feed goes quiet for 3 seconds (for trying a stale indicator). Default 0. */
  stallChance?: number;
}

/**
 * A fake market-data stream. Each subscriber gets its own random walk starting from `open`.
 * Returns a `Subscribe` function with the same shape the component receives in tests.
 */
export function createFakeFeed(instruments: Instrument[], options: FakeFeedOptions = {}): Subscribe {
  const { intervalMs = 250, burstSize = 12, volatility = 0.002, stallChance = 0 } = options;
  return (onTick) => {
    const prices = new Map(instruments.map((i) => [i.symbol, i.open]));
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const burst = () => {
      if (stopped) return;
      for (let n = 0; n < burstSize; n++) {
        const instrument = instruments[Math.floor(Math.random() * instruments.length)];
        const last = prices.get(instrument.symbol)!;
        const next = Math.max(0.01, last * (1 + (Math.random() * 2 - 1) * volatility));
        const decimals = next < 1 ? 4 : 2;
        const price = Number(next.toFixed(decimals));
        prices.set(instrument.symbol, price);
        const tick: Tick = { symbol: instrument.symbol, price };
        onTick(tick);
      }
      const stall = Math.random() < stallChance ? 3000 : 0;
      timer = setTimeout(burst, stall + intervalMs * (0.5 + Math.random()));
    };

    timer = setTimeout(burst, intervalMs);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  };
}
