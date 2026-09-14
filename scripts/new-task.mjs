#!/usr/bin/env node
// Scaffolds a new task folder with every required file.
// Usage: npm run new-task -- senior s37-color-picker "Color Picker" ui
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [level, id, title, kind = 'ui'] = process.argv.slice(2);
const kinds = ['ui', 'app', 'game', 'js', 'hook', 'design'];
if (!['junior', 'senior', 'staff'].includes(level) || !id || !title || !kinds.includes(kind)) {
  console.error('Usage: npm run new-task -- <junior|senior|staff> <id e.g. s37-color-picker> "<Title>" [ui|app|game|js|hook|design]');
  process.exit(1);
}

const dir = join(new URL('../src/tasks/', import.meta.url).pathname, level, id);
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

const code = id.split('-')[0].toUpperCase();
const order = Number(code.replace(/\D/g, '')) || 99;
const isJs = kind === 'js' || kind === 'hook';
const component = title.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase());

const files = {
  'meta.ts': `import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: '${id}',
  code: '${code}',
  title: '${title}',
  level: '${level}',
  order: ${order},
  kind: '${kind}',
  minutes: ${level === 'junior' ? 40 : level === 'senior' ? 75 : 110},
  summary: 'TODO one-line summary',
  concepts: [],
  companies: [],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
`,
  'README.md': `# ${title}

## Problem statement

## Clarifying questions to ask
-

## Functional requirements
- [ ]

## Non-functional requirements
-

## Constraints
-

## Data / API contract
\`\`\`ts
\`\`\`

## Test contract
-

## Edge cases
-

## Follow-ups
1. **TODO.**

## Concepts covered
`,
  'types.ts': isJs ? `export interface ${component}Module {}\n` : `export interface ${component}Props {}\n`,
  [isJs ? 'Solution.ts' : 'Solution.tsx']: isJs
    ? `// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export {};
`
    : `import type { ${component}Props } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function ${component}(props: ${component}Props) {
  void props;
  return <div className={styles.root}>${title}: start coding in Solution.tsx</div>;
}
`,
  [isJs ? 'Reference.ts' : 'Reference.tsx']: `// Reference solution not written yet.
export const NOT_IMPLEMENTED = true;
${isJs ? '' : 'export default function Reference() {\n  return null;\n}\n'}`,
  'task.test.tsx': `import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);

describeTask('${title}', () => {
  it.todo('write acceptance tests');
  void impl;
  void expect;
});
`,
};
if (!isJs) files['Solution.module.css'] = '.root {\n}\n';
if (level === 'staff') files['DESIGN.md'] = `# ${title}: design notes\n\n_Fill this in. See other staff tasks for the template._\n`;

for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
console.log(`Created ${dir}`);
