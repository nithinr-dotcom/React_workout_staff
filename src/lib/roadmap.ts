export interface Phase {
  title: string;
  weeks: string;
  goal: string;
  codes: string[];
}

/** Concept-ordered learning path. Codes refer to TaskMeta.code. */
export const ROADMAP: Phase[] = [
  {
    title: 'Warm-up: JavaScript you must write from memory',
    weeks: 'Week 1',
    goal: 'Closures, timers, `this`, recursion. These show up inside every React round.',
    codes: ['J23', 'J24', 'J26', 'J27', 'J28'],
  },
  {
    title: 'Junior I: state, lists, forms',
    weeks: 'Week 1–2',
    goal: 'Controlled inputs, derived state, keys, basic ARIA. Aim for 30–40 min each without hints.',
    codes: ['J01', 'J02', 'J03', 'J04', 'J05', 'J09', 'J17', 'J18', 'J20'],
  },
  {
    title: 'Junior II: time, effects, refs',
    weeks: 'Week 2',
    goal: 'setTimeout/setInterval cleanup, refs, focus movement, small async flows.',
    codes: ['J06', 'J07', 'J08', 'J10', 'J11', 'J12', 'J13', 'J19', 'J21', 'J22', 'J25'],
  },
  {
    title: 'Junior III: game logic',
    weeks: 'Week 2 (optional)',
    goal: 'Board state and win detection. Good speed drills.',
    codes: ['J14', 'J15', 'J16'],
  },
  {
    title: 'Senior I: async correctness',
    weeks: 'Week 3',
    goal: 'Promises, cancellation, race conditions, concurrency. The #1 senior differentiator.',
    codes: ['S26', 'S27', 'S28', 'S32', 'S33', 'S02', 'S03', 'S09'],
  },
  {
    title: 'Senior II: accessible components',
    weeks: 'Week 4',
    goal: 'Focus management, portals, keyboard maps, ARIA patterns from the APG.',
    codes: ['S01', 'S10', 'S11', 'S14', 'S15', 'S12'],
  },
  {
    title: 'Senior III: trees, tables, performance',
    weeks: 'Week 5',
    goal: 'Recursive UIs, normalized state, derived data, windowing.',
    codes: ['S05', 'S06', 'S07', 'S08', 'S04', 'S13', 'S16', 'S29', 'S30', 'S31', 'S34', 'S35', 'S36'],
  },
  {
    title: 'Senior IV: full apps in 90 minutes',
    weeks: 'Week 6',
    goal: 'Scope under pressure: ship the core, then layer follow-ups.',
    codes: ['S17', 'S18', 'S19', 'S20', 'S21'],
  },
  {
    title: 'Senior V: games (optional speed drills)',
    weeks: 'Any time',
    goal: 'Keyboard handling, game loops, pure update functions you can unit test.',
    codes: ['S22', 'S23', 'S24', 'S25'],
  },
  {
    title: 'Staff I: primitives and state architecture',
    weeks: 'Week 7',
    goal: 'Design APIs other engineers consume. Explain tradeoffs in DESIGN.md.',
    codes: ['ST01', 'ST02', 'ST05', 'ST06', 'ST07'],
  },
  {
    title: 'Staff II: scale and data-heavy UIs',
    weeks: 'Week 8',
    goal: 'Performance budgets, virtualization in two dimensions, dependency graphs.',
    codes: ['ST03', 'ST04', 'ST08', 'ST10'],
  },
  {
    title: 'Staff III: platform concerns',
    weeks: 'Week 9',
    goal: 'Things a staff engineer owns across teams: flags, offline, extensibility, i18n, observability.',
    codes: ['ST09', 'ST11', 'ST12', 'ST13', 'ST14'],
  },
];
