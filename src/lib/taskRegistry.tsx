import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Level, TaskMeta } from './types';

/*
 * Tasks are discovered from the filesystem. Adding a folder under
 * src/tasks/<level>/<id>/ with a meta.ts is all it takes to register one.
 */

type AnyModule = Record<string, unknown>;
type Loader = () => Promise<AnyModule>;

const metaModules = import.meta.glob<{ default: TaskMeta }>('../tasks/*/*/meta.ts', { eager: true });
const readmes = import.meta.glob<string>('../tasks/*/*/README.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const designs = import.meta.glob<string>('../tasks/*/*/DESIGN.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const solutions = import.meta.glob<AnyModule>('../tasks/*/*/Solution.{ts,tsx}');
const references = import.meta.glob<AnyModule>('../tasks/*/*/Reference.{ts,tsx}');
const playgrounds = import.meta.glob<AnyModule>('../tasks/*/*/Playground.tsx');

const referenceSources = import.meta.glob<string>('../tasks/*/*/Reference.{ts,tsx}', {
  query: '?raw',
  import: 'default',
});
const referenceCss = import.meta.glob<string>('../tasks/*/*/Reference.module.css', {
  query: '?raw',
  import: 'default',
});
const testSources = import.meta.glob<string>('../tasks/*/*/task.test.tsx', {
  query: '?raw',
  import: 'default',
});

const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/'));

function findIn<T>(record: Record<string, T>, dir: string): [string, T] | undefined {
  const key = Object.keys(record).find((k) => dirOf(k) === dir);
  return key ? [key, record[key]] : undefined;
}

export interface TaskEntry {
  meta: TaskMeta;
  dir: string;
  /** Path relative to the repo root, for display. */
  srcPath: string;
  readme: string;
  design: string | null;
  hasPlayground: boolean;
  loadSolution: Loader;
  loadReference: Loader;
  loadPlayground: Loader | null;
  loadReferenceSource: () => Promise<{ file: string; code: string }[]>;
  loadTestSource: () => Promise<string>;
}

const entries: TaskEntry[] = Object.entries(metaModules)
  .map(([path, mod]) => {
    const dir = dirOf(path);
    const meta = mod.default;
    const solution = findIn(solutions, dir);
    const reference = findIn(references, dir);
    const playground = findIn(playgrounds, dir);
    const test = findIn(testSources, dir);
    return {
      meta,
      dir,
      srcPath: dir.replace('../', 'src/'),
      readme: findIn(readmes, dir)?.[1] ?? `# ${meta.title}\n\n_README.md missing._`,
      design: findIn(designs, dir)?.[1] ?? null,
      hasPlayground: Boolean(playground),
      loadSolution: solution?.[1] ?? (async () => ({})),
      loadReference: reference?.[1] ?? (async () => ({ NOT_IMPLEMENTED: true })),
      loadPlayground: playground?.[1] ?? null,
      loadReferenceSource: async () => {
        const files: { file: string; code: string }[] = [];
        for (const [p, load] of Object.entries(referenceSources)) {
          if (dirOf(p) === dir) files.push({ file: p.slice(p.lastIndexOf('/') + 1), code: await load() });
        }
        for (const [p, load] of Object.entries(referenceCss)) {
          if (dirOf(p) === dir) files.push({ file: p.slice(p.lastIndexOf('/') + 1), code: await load() });
        }
        return files;
      },
      loadTestSource: test ? test[1] : async () => '// No task.test.tsx for this task yet.',
    } satisfies TaskEntry;
  })
  .sort((a, b) => levelRank(a.meta.level) - levelRank(b.meta.level) || a.meta.order - b.meta.order);

function levelRank(level: Level) {
  return level === 'junior' ? 0 : level === 'senior' ? 1 : 2;
}

const byId = new Map(entries.map((e) => [e.meta.id, e]));

export const allTasks = entries;
export const getTask = (id: string) => byId.get(id);
export const tasksByLevel = (level: Level) => entries.filter((e) => e.meta.level === level);

export type PreviewTarget = 'solution' | 'reference';

const previewCache = new Map<string, LazyExoticComponent<ComponentType>>();

/**
 * Returns a lazy component that renders the task's preview.
 * With a Playground.tsx: <Playground impl={module} />. Without: the module's default export.
 */
export function getPreview(entry: TaskEntry, target: PreviewTarget) {
  const key = `${entry.meta.id}:${target}`;
  let cached = previewCache.get(key);
  if (!cached) {
    cached = lazy(async () => {
      const load = target === 'solution' ? entry.loadSolution : entry.loadReference;
      const [impl, playground] = await Promise.all([load(), entry.loadPlayground?.()]);
      if (target === 'reference' && impl.NOT_IMPLEMENTED) {
        return { default: ReferencePending };
      }
      if (playground) {
        const Playground = playground.default as ComponentType<{ impl: AnyModule }>;
        return { default: () => <Playground impl={impl} /> };
      }
      const Component = impl.default as ComponentType | undefined;
      return { default: Component ?? MissingDefault };
    });
    previewCache.set(key, cached);
  }
  return cached;
}

function ReferencePending() {
  return (
    <div className="preview-message">
      <strong>Reference not written yet.</strong>
      <p>Reference solutions are being added in batches. Ask for this one when you are ready.</p>
    </div>
  );
}

function MissingDefault() {
  return (
    <div className="preview-message">
      <strong>No default export.</strong>
      <p>Export your component as the default export of Solution.tsx.</p>
    </div>
  );
}
