import type { Direction, Point, SnakeProps, SnakeState } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createInitialState(size: number, random: () => number = Math.random): SnakeState {
  // Your implementation here. Requirements are in README.md.
  void size;
  void random;
  throw new Error('createInitialState: not implemented');
}

export function step(state: SnakeState, direction: Direction, random: () => number = Math.random): SnakeState {
  void state;
  void direction;
  void random;
  throw new Error('step: not implemented');
}

export function placeFood(snake: Point[], size: number, random: () => number): Point | null {
  void snake;
  void size;
  void random;
  throw new Error('placeFood: not implemented');
}

export default function Snake({ size = 15, tickMs = 150, random = Math.random }: SnakeProps) {
  // Your implementation here. Requirements are in README.md.
  void random;
  return (
    <div className={styles.root}>
      Snake {size}×{size} @ {tickMs}ms: start coding in Solution.tsx
    </div>
  );
}
