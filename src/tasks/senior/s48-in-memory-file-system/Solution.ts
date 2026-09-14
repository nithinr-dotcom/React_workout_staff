import type { FsEvent, IFileSystem, IPathStore } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function normalizePath(path: string): string {
  void path;
  throw new Error('normalizePath: not implemented');
}

/** Part 1. */
export class PathStore implements IPathStore {
  create(path: string, value: unknown): void {
    void path;
    void value;
    throw new Error('PathStore.create: not implemented');
  }

  get(path: string): unknown {
    void path;
    throw new Error('PathStore.get: not implemented');
  }

  set(path: string, value: unknown): void {
    void path;
    void value;
    throw new Error('PathStore.set: not implemented');
  }
}

/** Part 2. */
export class FileSystem implements IFileSystem {
  mkdir(path: string): void {
    void path;
    throw new Error('FileSystem.mkdir: not implemented');
  }

  writeFile(path: string, content: string): void {
    void path;
    void content;
    throw new Error('FileSystem.writeFile: not implemented');
  }

  readFile(path: string): string {
    void path;
    throw new Error('FileSystem.readFile: not implemented');
  }

  ls(path: string): string[] {
    void path;
    throw new Error('FileSystem.ls: not implemented');
  }

  rm(path: string, options: { recursive?: boolean } = {}): void {
    void path;
    void options;
    throw new Error('FileSystem.rm: not implemented');
  }

  mv(from: string, to: string): void {
    void from;
    void to;
    throw new Error('FileSystem.mv: not implemented');
  }

  exists(path: string): boolean {
    void path;
    throw new Error('FileSystem.exists: not implemented');
  }

  /** Follow-up 1. */
  watch(path: string, callback: (event: FsEvent) => void): () => void {
    void path;
    void callback;
    throw new Error('FileSystem.watch: not implemented');
  }

  /** Follow-up 2. */
  find(pattern: string): string[] {
    void pattern;
    throw new Error('FileSystem.find: not implemented');
  }
}
