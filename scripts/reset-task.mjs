#!/usr/bin/env node
// Resets a task's Solution files to the blank starter for a fresh attempt.
// The starter is taken from the git commit that first added the file, so commit your work first.
//
// Usage: npm run reset-task -- j02            (prefix match on the folder name)
//        npm run reset-task -- j02 --force    (discard uncommitted changes)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [query, ...flags] = process.argv.slice(2);
const force = flags.includes('--force');
if (!query) {
  console.error('Usage: npm run reset-task -- <task-id-prefix> [--force]');
  process.exit(1);
}

const repo = new URL('..', import.meta.url).pathname;
const tasksRoot = join(repo, 'src/tasks');
const matches = ['junior', 'senior', 'staff'].flatMap((level) =>
  readdirSync(join(tasksRoot, level))
    .filter((name) => name.startsWith(query))
    .map((name) => join(tasksRoot, level, name)),
);
if (matches.length !== 1) {
  console.error(matches.length ? `Ambiguous: ${matches.map((m) => relative(repo, m)).join(', ')}` : `No task matches "${query}"`);
  process.exit(1);
}

const dir = matches[0];
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

for (const file of ['Solution.tsx', 'Solution.ts', 'Solution.module.css']) {
  const abs = join(dir, file);
  if (!existsSync(abs)) continue;
  const rel = relative(repo, abs);
  let firstCommit;
  try {
    firstCommit = git('log', '--diff-filter=A', '--format=%H', '--', rel).trim().split('\n').pop();
  } catch {
    firstCommit = '';
  }
  if (!firstCommit) {
    console.error(`✗ ${rel} is not committed yet. Commit the starter first: git add -A && git commit -m "starter"`);
    process.exit(1);
  }
  const dirty = git('status', '--porcelain', '--', rel).trim();
  if (dirty && !force) {
    console.error(`✗ ${rel} has uncommitted changes. Commit your attempt first, or pass --force to discard it.`);
    process.exit(1);
  }
  writeFileSync(abs, git('show', `${firstCommit}:${rel}`));
  console.log(`↺ ${rel} reset to starter (${firstCommit.slice(0, 7)})`);
}
console.log('Done. Hide the reference again in the app before your fresh attempt (🙈 Hide reference).');
