/** Small deterministic PRNG so generated datasets are stable between reloads and tests. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

export const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Ben', 'Chloe', 'Diego', 'Elena', 'Farah', 'Gus', 'Hana', 'Ibrahim', 'Jia', 'Kofi',
  'Lena', 'Mateo', 'Nadia', 'Omar', 'Priya', 'Quinn', 'Ravi', 'Sofia', 'Tariq', 'Uma', 'Victor', 'Wen',
  'Ximena', 'Yusuf', 'Zara',
] as const;

export const LAST_NAMES = [
  'Nair', 'Smith', 'Garcia', 'Chen', 'Okafor', 'Rossi', 'Khan', 'Müller', 'Sato', 'Silva', 'Patel',
  'Johnson', 'Kowalski', 'Haddad', 'Menon', 'Dubois', 'Andersson', 'Kim',
] as const;
