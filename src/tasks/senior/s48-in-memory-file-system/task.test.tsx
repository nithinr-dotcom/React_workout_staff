// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { FileSystemModule, FsErrorCode, FsEvent } from './types';

const { impl: rawImpl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const impl = rawImpl as unknown as FileSystemModule;

function caught(run: () => unknown): { code?: string; path?: string } & Error {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
    return e as Error & { code?: string; path?: string };
  }
  throw new Error('expected the call to throw');
}
const expectCode = (run: () => unknown, code: FsErrorCode) => expect(caught(run).code).toBe(code);

describeTask('normalizePath', () => {
  it('resolves ., .., duplicate and trailing slashes', () => {
    expect(impl.normalizePath('//a///b/./c/../d/')).toBe('/a/b/d');
    expect(impl.normalizePath('/a/b/../../..')).toBe('/');
    expect(impl.normalizePath('./a/./b/')).toBe('/a/b');
    expect(impl.normalizePath('a/b')).toBe('/a/b');
    expect(impl.normalizePath('')).toBe('/');
    expect(impl.normalizePath('/')).toBe('/');
    expect(impl.normalizePath('/..foo/.hidden')).toBe('/..foo/.hidden');
  });
});

describeTask('Part 1: PathStore', () => {
  it('creates nested paths and reads and updates their values', () => {
    const store = new impl.PathStore();
    store.create('/a', 1);
    store.create('/a/b', 2);
    expect(store.get('/a')).toBe(1);
    expect(store.get('/a/b/')).toBe(2);
    store.set('/a//b', 3);
    expect(store.get('/a/b')).toBe(3);
    expect(store.get('/')).toBeUndefined();
  });

  it('refuses to create when the parent is missing or the path exists', () => {
    const store = new impl.PathStore();
    const missingParent = caught(() => store.create('/c/d', 1));
    expect(missingParent.code).toBe('ENOENT');
    expect(missingParent.path).toBe('/c/d');
    store.create('/c', 0);
    expectCode(() => store.create('/c', 5), 'EEXIST');
    expectCode(() => store.create('/', 5), 'EEXIST');
    expect(store.get('/c')).toBe(0);
  });

  it('get and set throw ENOENT for missing paths, and set never creates', () => {
    const store = new impl.PathStore();
    expectCode(() => store.get('/nope'), 'ENOENT');
    expectCode(() => store.set('/nope', 1), 'ENOENT');
    expectCode(() => store.get('/nope'), 'ENOENT');
  });
});

describeTask('Part 2: FileSystem', () => {
  it('mkdir -p creates missing directories and is idempotent', () => {
    const fs = new impl.FileSystem();
    expect(fs.ls('/')).toEqual([]);
    fs.mkdir('/a/b/c');
    fs.mkdir('/a/b/c/');
    fs.mkdir('/a/x');
    expect(fs.ls('/a')).toEqual(['b', 'x']);
    expect(fs.ls('/a/b')).toEqual(['c']);
    expect(fs.exists('/a/b/c')).toBe(true);
  });

  it('writes, overwrites and reads files; ls sorts names and returns [name] for a file', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/docs');
    fs.writeFile('/docs/b.md', 'bee');
    fs.writeFile('/docs/a.md', '');
    fs.writeFile('/docs/B.md', 'upper');
    fs.writeFile('/docs/b.md', 'bee 2');
    expect(fs.readFile('/docs/./b.md')).toBe('bee 2');
    expect(fs.readFile('/docs/a.md')).toBe('');
    expect(fs.ls('/docs')).toEqual(['B.md', 'a.md', 'b.md']);
    expect(fs.ls('/docs/a.md')).toEqual(['a.md']);
  });

  it('throws typed errors for impossible file operations', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/dir');
    fs.writeFile('/dir/file.txt', 'x');
    expectCode(() => fs.writeFile('/missing/f.txt', 'x'), 'ENOENT');
    expectCode(() => fs.writeFile('/dir', 'x'), 'EISDIR');
    expectCode(() => fs.writeFile('/', 'x'), 'EISDIR');
    expectCode(() => fs.writeFile('/dir/file.txt/child', 'x'), 'ENOTDIR');
    expectCode(() => fs.readFile('/dir/nope.txt'), 'ENOENT');
    expectCode(() => fs.readFile('/dir'), 'EISDIR');
    expectCode(() => fs.readFile('/dir/file.txt/x'), 'ENOTDIR');
    expectCode(() => fs.ls('/nope'), 'ENOENT');
    expectCode(() => fs.ls('/dir/file.txt/x'), 'ENOTDIR');
  });

  it('mkdir fails on files without creating anything', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/x');
    fs.writeFile('/x/y', 'file');
    expectCode(() => fs.mkdir('/x/y'), 'EEXIST');
    expectCode(() => fs.mkdir('/x/y/z/w'), 'ENOTDIR');
    expect(fs.readFile('/x/y')).toBe('file');
    expect(fs.ls('/x')).toEqual(['y']);
  });

  it('rm removes files and empty dirs, and needs recursive for non-empty dirs', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/a/empty');
    fs.mkdir('/a/full/inner');
    fs.writeFile('/a/full/inner/f', '1');
    fs.writeFile('/a/g', '2');
    fs.rm('/a/g');
    fs.rm('/a/empty');
    expect(fs.ls('/a')).toEqual(['full']);
    expectCode(() => fs.rm('/a/full'), 'ENOTEMPTY');
    expectCode(() => fs.rm('/a/full', { recursive: false }), 'ENOTEMPTY');
    expect(fs.readFile('/a/full/inner/f')).toBe('1');
    fs.rm('/a/full', { recursive: true });
    expect(fs.exists('/a/full')).toBe(false);
    expect(fs.exists('/a/full/inner/f')).toBe(false);
    expectCode(() => fs.rm('/a/full'), 'ENOENT');
    expectCode(() => fs.rm('/', { recursive: true }), 'EINVAL');
    expect(fs.ls('/')).toEqual(['a']);
  });

  it('mv moves files and whole subtrees', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/src/lib');
    fs.writeFile('/src/lib/util.ts', 'export {}');
    fs.writeFile('/src/index.ts', 'main');
    fs.mkdir('/archive');
    fs.mv('/src/index.ts', '/archive/old-index.ts');
    expect(fs.readFile('/archive/old-index.ts')).toBe('main');
    expect(fs.exists('/src/index.ts')).toBe(false);
    fs.mv('/src', '/archive/src');
    expect(fs.ls('/')).toEqual(['archive']);
    expect(fs.readFile('/archive/src/lib/util.ts')).toBe('export {}');
    fs.mv('/archive/src', '/archive/src/');
    expect(fs.ls('/archive')).toEqual(['old-index.ts', 'src']);
  });

  it('mv validates both ends and leaves the tree unchanged on failure', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/a/b');
    fs.writeFile('/a/f', 'f');
    fs.mkdir('/taken');
    expectCode(() => fs.mv('/nope', '/x'), 'ENOENT');
    expectCode(() => fs.mv('/a', '/taken'), 'EEXIST');
    expectCode(() => fs.mv('/a', '/missing/a'), 'ENOENT');
    expectCode(() => fs.mv('/a/b', '/a/f/b'), 'ENOTDIR');
    expectCode(() => fs.mv('/a', '/a/b/a'), 'EINVAL');
    expectCode(() => fs.mv('/', '/root'), 'EINVAL');
    expect(fs.ls('/')).toEqual(['a', 'taken']);
    expect(fs.ls('/a')).toEqual(['b', 'f']);
    fs.mv('/a', '/ab');
    expect(fs.ls('/')).toEqual(['ab', 'taken']);
  });

  it('exists never throws and instances do not share state', () => {
    const fs1 = new impl.FileSystem();
    const fs2 = new impl.FileSystem();
    fs1.writeFile('/f', 'x');
    expect(fs1.exists('/f')).toBe(true);
    expect(fs1.exists('/')).toBe(true);
    expect(fs1.exists('/f/child')).toBe(false);
    expect(fs2.exists('/f')).toBe(false);
    expect(fs2.ls('/')).toEqual([]);
  });
});

describeFollowUp(1, 'watch', () => {
  it('emits create, change and delete events for the watched path and below', () => {
    const fs = new impl.FileSystem();
    const events: FsEvent[] = [];
    const other: FsEvent[] = [];
    const stop = fs.watch('/docs', (e) => events.push(e));
    fs.watch('/other', (e) => other.push(e));
    fs.mkdir('/docs/a/b');
    fs.writeFile('/docs/a/note.md', 'v1');
    fs.writeFile('/docs/a/note.md', 'v2');
    fs.mkdir('/docsearch');
    fs.rm('/docs/a', { recursive: true });
    expect(events).toEqual([
      { type: 'create', path: '/docs' },
      { type: 'create', path: '/docs/a' },
      { type: 'create', path: '/docs/a/b' },
      { type: 'create', path: '/docs/a/note.md' },
      { type: 'change', path: '/docs/a/note.md' },
      { type: 'delete', path: '/docs/a' },
    ]);
    expect(other).toEqual([]);
    stop();
    fs.writeFile('/docs/after.md', 'x');
    expect(events).toHaveLength(6);
  });

  it('mv emits delete at the source and create at the destination', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/in');
    fs.mkdir('/out');
    fs.writeFile('/in/f', '1');
    const events: FsEvent[] = [];
    fs.watch('/', (e) => events.push(e));
    fs.mv('/in/f', '/out/f');
    expect(events).toEqual([
      { type: 'delete', path: '/in/f' },
      { type: 'create', path: '/out/f' },
    ]);
  });
});

describeFollowUp(2, 'find (glob)', () => {
  it('matches *, ? and ** against files only', () => {
    const fs = new impl.FileSystem();
    fs.mkdir('/src/a');
    fs.mkdir('/src/lib/x');
    fs.mkdir('/src/dir.ts');
    fs.writeFile('/src/index.ts', '');
    fs.writeFile('/src/a/b.ts', '');
    fs.writeFile('/src/a/b.tsx', '');
    fs.writeFile('/src/lib/x/y.ts', '');
    fs.writeFile('/test.ts', '');
    fs.writeFile('/readme.md', '');
    expect(fs.find('**/*.ts')).toEqual(['/src/a/b.ts', '/src/index.ts', '/src/lib/x/y.ts', '/test.ts']);
    expect(fs.find('/src/*.ts')).toEqual(['/src/index.ts']);
    expect(fs.find('src/**/b.*')).toEqual(['/src/a/b.ts', '/src/a/b.tsx']);
    expect(fs.find('/src/a/b.t?')).toEqual(['/src/a/b.ts']);
    expect(fs.find('*.md')).toEqual(['/readme.md']);
    expect(fs.find('/nothing/**')).toEqual([]);
  });
});
