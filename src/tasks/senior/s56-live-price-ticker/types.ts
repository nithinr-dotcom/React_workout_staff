import type { ComponentType } from 'react';

export interface Tick {
  symbol: string;
  price: number;
}

/** Starts delivering ticks to `onTick`. Returns a function that stops them. */
export type Subscribe = (onTick: (tick: Tick) => void) => () => void;

export interface Instrument {
  symbol: string;
  name: string;
  /** Reference price (e.g. the day's open). Change and change % are measured from it. It is also the price shown before any tick arrives. */
  open: number;
}

export interface PriceTickerProps {
  /** Rows, in this order until the user sorts. */
  instruments: Instrument[];
  subscribe: Subscribe;
  /** ISO 4217 code for price formatting. Default `USD`. */
  currency?: string;
}

export interface PriceTickerModule {
  default: ComponentType<PriceTickerProps>;
}
