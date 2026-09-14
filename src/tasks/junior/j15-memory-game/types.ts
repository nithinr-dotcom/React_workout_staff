export interface MemoryCard {
  /** Unique per card. The two cards of a pair have different ids but the same symbol. */
  id: string;
  symbol: string;
}

export interface MemoryGameProps {
  /** One entry per pair. Default: 8 emoji, so 16 cards. */
  symbols?: string[];
  /**
   * Returns the cards in play order. Called with the unshuffled deck when a game starts
   * (on mount and on every Restart). Default: a uniform random shuffle.
   * Must not mutate its input.
   */
  shuffle?: (cards: MemoryCard[]) => MemoryCard[];
  /** How long a mismatched pair stays face up, in ms. Default 1000. */
  mismatchDelay?: number;
}
