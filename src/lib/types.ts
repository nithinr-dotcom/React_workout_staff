export type Level = 'junior' | 'senior' | 'staff';
export type Kind = 'ui' | 'app' | 'game' | 'js' | 'hook' | 'design';
export type Track = 'components' | 'apps' | 'games' | 'js' | 'design';
export type Frequency = 'very-common' | 'common' | 'occasional';

export interface TaskMeta {
  /** Folder name, e.g. "j02-accordion". Also the route param and test filter. */
  id: string;
  /** Short code shown in the UI, e.g. "J02". */
  code: string;
  title: string;
  level: Level;
  /** Position inside the level's learning path. */
  order: number;
  kind: Kind;
  /** Suggested time box in minutes. */
  minutes: number;
  /** One-line summary shown in lists. */
  summary: string;
  concepts: string[];
  companies: string[];
  /** Task ids worth doing first. */
  prerequisites: string[];
  frequency: Frequency;
  /** Top-15 most asked across sources. */
  star?: boolean;
}

export type Status = 'todo' | 'in-progress' | 'solved' | 'solved-with-help' | 'revisit';

export interface Attempt {
  finishedAt: string;
  minutes: number;
  revealed: boolean;
  status: Status;
}

export interface TaskProgress {
  status: Status;
  attempts: Attempt[];
  confidence: number | null;
  notes: string;
  /** ISO date (yyyy-mm-dd) when this task should be revisited. */
  nextReview: string | null;
  /** Accumulated ms for the current attempt (excluding the running segment). */
  timerMs: number;
  /** Epoch ms when the timer was started, null when paused. */
  timerStartedAt: number | null;
  /** Reference was revealed during the current attempt. */
  revealedThisAttempt: boolean;
  /** Reference has ever been revealed (code stays viewable). */
  revealedEver: boolean;
  followUpsUnlocked: number;
  solveCount: number;
}

export interface LabState {
  version: 1;
  tasks: Record<string, TaskProgress>;
  /** yyyy-mm-dd dates with any practice activity. */
  activity: string[];
}

export const LEVELS: Level[] = ['junior', 'senior', 'staff'];

export const LEVEL_LABEL: Record<Level, string> = {
  junior: 'Junior',
  senior: 'Senior',
  staff: 'Staff',
};

export const TRACK_LABEL: Record<Track, string> = {
  components: 'Components',
  apps: 'Apps',
  games: 'Games',
  js: 'JS & Hooks',
  design: 'Design',
};

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'Todo',
  'in-progress': 'In progress',
  solved: 'Solved',
  'solved-with-help': 'Solved with help',
  revisit: 'Revisit',
};

export function trackOf(kind: Kind): Track {
  switch (kind) {
    case 'ui':
      return 'components';
    case 'app':
      return 'apps';
    case 'game':
      return 'games';
    case 'js':
    case 'hook':
      return 'js';
    case 'design':
      return 'design';
  }
}
