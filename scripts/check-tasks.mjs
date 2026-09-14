#!/usr/bin/env node
// Verifies every task folder has the required files and a consistent meta.ts.
// Usage: npm run check-tasks
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/tasks/', import.meta.url).pathname;
const levels = ['junior', 'senior', 'staff'];
const prefix = { junior: 'J', senior: 'S', staff: 'ST' };
const README_HEADINGS = [
  '## Problem statement',
  '## Clarifying questions to ask',
  '## Functional requirements',
  '## Non-functional requirements',
  '## Constraints',
  '## Data / API contract',
  '## Test contract',
  '## Edge cases',
  '## Follow-ups',
  '## Concepts covered',
];

let problems = 0;
const counts = {};
let withReference = 0;
const report = (dir, msg) => {
  problems++;
  console.log(`✗ ${dir}: ${msg}`);
};

for (const level of levels) {
  const levelDir = join(root, level);
  if (!existsSync(levelDir)) continue;
  const dirs = readdirSync(levelDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  counts[level] = dirs.length;
  for (const { name } of dirs) {
    const dir = join(levelDir, name);
    const has = (f) => existsSync(join(dir, f));
    const rel = `${level}/${name}`;

    for (const f of ['meta.ts', 'README.md', 'types.ts', 'task.test.tsx']) if (!has(f)) report(rel, `missing ${f}`);
    if (!has('Solution.tsx') && !has('Solution.ts')) report(rel, 'missing Solution.ts(x)');
    if (!has('Reference.tsx') && !has('Reference.ts')) report(rel, 'missing Reference.ts(x)');
    if (level === 'staff' && !has('DESIGN.md')) report(rel, 'staff task missing DESIGN.md');

    if (has('meta.ts')) {
      const meta = readFileSync(join(dir, 'meta.ts'), 'utf8');
      if (!meta.includes(`id: '${name}'`)) report(rel, `meta id must equal folder name '${name}'`);
      if (!meta.includes(`level: '${level}'`)) report(rel, `meta level must be '${level}'`);
      const code = /code: '([A-Z]+)(\d+)'/.exec(meta);
      if (!code || code[1] !== prefix[level]) report(rel, `meta code must start with ${prefix[level]}`);
      const hint = name.split('-')[0].toUpperCase();
      if (code && `${code[1]}${code[2]}` !== hint) report(rel, `meta code ${code[1]}${code[2]} does not match folder prefix ${hint}`);
    }
    if (has('README.md')) {
      const readme = readFileSync(join(dir, 'README.md'), 'utf8');
      for (const h of README_HEADINGS) if (!readme.includes(h)) report(rel, `README missing "${h}"`);
    }
    const solution = has('Solution.tsx') ? 'Solution.tsx' : has('Solution.ts') ? 'Solution.ts' : null;
    if (solution && !readFileSync(join(dir, solution), 'utf8').includes('export const NOT_STARTED')) {
      console.log(`• ${rel}: started (NOT_STARTED removed)`);
    }
    const reference = has('Reference.tsx') ? 'Reference.tsx' : has('Reference.ts') ? 'Reference.ts' : null;
    if (reference && !readFileSync(join(dir, reference), 'utf8').includes('NOT_IMPLEMENTED')) withReference++;
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`\nTasks: ${total} (${levels.map((l) => `${l} ${counts[l] ?? 0}`).join(', ')})`);
console.log(`Reference solutions written: ${withReference}/${total}`);
if (problems) {
  console.log(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log('All task folders look consistent ✓');
