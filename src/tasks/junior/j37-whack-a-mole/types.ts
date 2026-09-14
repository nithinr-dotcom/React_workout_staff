export interface WhackAMoleProps {
  /** Game length in seconds. Default 30. */
  duration?: number;
  /** Milliseconds between pop-ups. The first mole pops up this long after the game starts. Default 1000. */
  popInterval?: number;
  /** Milliseconds a mole stays up if nobody whacks it. Always less than popInterval. Default 700. */
  upTime?: number;
  /**
   * Returns a number in [0, 1). Called exactly once per pop-up; the mole appears in
   * hole `Math.floor(random() * 9)` (0-based, reading order). Default: Math.random.
   */
  random?: () => number;
}

/** Follow-up 3: localStorage key the best score is stored under (a number as a string). */
export const HIGH_SCORE_STORAGE_KEY = 'j37-whack-a-mole:high-score';
