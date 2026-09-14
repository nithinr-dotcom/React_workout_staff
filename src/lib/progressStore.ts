import { useSyncExternalStore } from 'react';
import type { Attempt, LabState, Status, TaskProgress } from './types';

const STORAGE_KEY = 'mc-lab:v1';

/** Days until the next revisit, indexed by how many times the task was solved. */
const REVIEW_INTERVALS = [3, 7, 21, 45];

export const emptyProgress = (): TaskProgress => ({
  status: 'todo',
  attempts: [],
  confidence: null,
  notes: '',
  nextReview: null,
  timerMs: 0,
  timerStartedAt: null,
  revealedThisAttempt: false,
  revealedEver: false,
  followUpsUnlocked: 0,
  solveCount: 0,
});

const emptyState = (): LabState => ({ version: 1, tasks: {}, activity: [] });

function load(): LabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as LabState;
    if (parsed.version !== 1) return emptyState();
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

let state: LabState = load();
const listeners = new Set<() => void>();

function commit(next: LabState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: keep in memory
  }
  listeners.forEach((l) => l());
}

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    state = load();
    listeners.forEach((l) => l());
  }
});

export const today = () => new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTaskProgress(id: string): TaskProgress {
  return state.tasks[id] ?? EMPTY;
}
const EMPTY = emptyProgress();

export function updateTask(id: string, fn: (p: TaskProgress) => Partial<TaskProgress>) {
  const current = state.tasks[id] ?? emptyProgress();
  const patch = fn(current);
  const activity = state.activity.includes(today()) ? state.activity : [...state.activity, today()];
  commit({ ...state, activity, tasks: { ...state.tasks, [id]: { ...current, ...patch } } });
}

export function useTaskProgress(id: string) {
  return useSyncExternalStore(subscribe, () => getTaskProgress(id));
}

export function useLabState() {
  return useSyncExternalStore(subscribe, () => state);
}

/* ---------- timer ---------- */

export const elapsedMs = (p: TaskProgress, now = Date.now()) =>
  p.timerMs + (p.timerStartedAt ? now - p.timerStartedAt : 0);

export function startTimer(id: string) {
  updateTask(id, (p) => ({
    timerStartedAt: p.timerStartedAt ?? Date.now(),
    status: p.status === 'todo' || p.status === 'revisit' ? 'in-progress' : p.status,
  }));
}

export function pauseTimer(id: string) {
  updateTask(id, (p) => ({ timerMs: elapsedMs(p), timerStartedAt: null }));
}

export function resetTimer(id: string) {
  updateTask(id, () => ({ timerMs: 0, timerStartedAt: null }));
}

/* ---------- status & attempts ---------- */

export function setStatus(id: string, status: Status) {
  updateTask(id, (p) => {
    if (status !== 'solved' && status !== 'solved-with-help') return { status };
    return finishPatch(p, p.revealedThisAttempt ? 'solved-with-help' : status);
  });
}

/** Logs the current attempt and resets the timer for the next one. */
export function finishAttempt(id: string, status?: Status) {
  updateTask(id, (p) => finishPatch(p, status ?? (p.revealedThisAttempt ? 'solved-with-help' : p.status)));
}

function finishPatch(p: TaskProgress, status: Status): Partial<TaskProgress> {
  const minutes = Math.round(elapsedMs(p) / 60000);
  const solved = status === 'solved' || status === 'solved-with-help';
  const attempt: Attempt = { finishedAt: new Date().toISOString(), minutes, revealed: p.revealedThisAttempt, status };
  const solveCount = solved ? p.solveCount + 1 : p.solveCount;
  const lowConfidence = (p.confidence ?? 3) <= 2;
  const interval = status === 'solved-with-help' || lowConfidence ? 2 : REVIEW_INTERVALS[Math.min(solveCount - 1, 3)];
  return {
    status,
    attempts: minutes > 0 || solved ? [...p.attempts, attempt] : p.attempts,
    timerMs: 0,
    timerStartedAt: null,
    revealedThisAttempt: false,
    solveCount,
    nextReview: solved ? addDays(interval) : p.nextReview,
  };
}

export function setConfidence(id: string, confidence: number) {
  updateTask(id, () => ({ confidence }));
}

export function revealReference(id: string) {
  updateTask(id, () => ({ revealedThisAttempt: true, revealedEver: true }));
}

/** Hide the reference again, e.g. before a revisit attempt. */
export function hideReference(id: string) {
  updateTask(id, () => ({ revealedEver: false }));
}

export function unlockFollowUp(id: string) {
  updateTask(id, (p) => ({ followUpsUnlocked: p.followUpsUnlocked + 1 }));
}

export function setNotes(id: string, notes: string) {
  updateTask(id, () => ({ notes }));
}

export function isDue(p: TaskProgress) {
  return p.nextReview !== null && p.nextReview <= today();
}

/* ---------- import / export ---------- */

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string) {
  const parsed = JSON.parse(json) as LabState;
  if (parsed.version !== 1 || typeof parsed.tasks !== 'object') {
    throw new Error('Not a Machine Coding Lab export (version 1).');
  }
  commit({ ...emptyState(), ...parsed });
}

export function resetAll() {
  commit(emptyState());
}
