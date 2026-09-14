import type { Jumps } from './types';

/** Demo board for the Playground (roughly the classic Milton Bradley layout). Tests build their own. */
export const CLASSIC_LADDERS: Jumps = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

export const CLASSIC_SNAKES: Jumps = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

/** A short board so you can reach the end quickly. */
export const QUICK_LADDERS: Jumps = { 2: 60, 7: 85, 20: 94 };
export const QUICK_SNAKES: Jumps = { 65: 30, 97: 50, 99: 80 };
