import { CATEGORIES, type Item } from './types';

/** Demo data for the Playground. Tests build their own items. */

const ADJECTIVES = ['Compact', 'Rugged', 'Smart', 'Modular', 'Wireless', 'Premium', 'Eco', 'Portable', 'Silent'];
const NOUNS = ['Router', 'Sensor', 'Licence', 'Keyboard', 'Monitor', 'Audit', 'Dock', 'Backup Plan', 'Headset', 'Gateway', 'Server'];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeItems(count = 500, seed = 7): Item[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]} ${NOUNS[Math.floor(rand() * NOUNS.length)]} ${String(i + 1).padStart(3, '0')}`,
    category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
    price: 5 + Math.floor(rand() * 995),
    stock: Math.floor(rand() * 200),
  }));
}
