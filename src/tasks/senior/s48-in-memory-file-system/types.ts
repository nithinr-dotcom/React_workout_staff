export type FsErrorCode = 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'ENOTEMPTY' | 'EINVAL';

/** What every failing method throws: an `Error` with a `code` and the (normalized) `path` it failed on. */
export interface FsError extends Error {
  code: FsErrorCode;
  path: string;
}

/** Part 1 (Airbnb): every path holds a value, and a path can have children. */
export interface IPathStore {
  /** Creates `path` with `value`. Throws ENOENT if the parent path doesn't exist, EEXIST if `path` already exists. */
  create(path: string, value: unknown): void;
  /** Returns the value at `path`. Throws ENOENT if it doesn't exist. */
  get(path: string): unknown;
  /** Replaces the value at an existing `path`. Throws ENOENT if it doesn't exist. */
  set(path: string, value: unknown): void;
}

export type FsEventType = 'create' | 'change' | 'delete';

/** Follow-up 1. */
export interface FsEvent {
  type: FsEventType;
  /** Normalized absolute path of the node that changed. */
  path: string;
}

/** Part 2: files and directories. */
export interface IFileSystem {
  /** Like `mkdir -p`. */
  mkdir(path: string): void;
  writeFile(path: string, content: string): void;
  readFile(path: string): string;
  /** Sorted child names of a directory, or `[name]` for a file. */
  ls(path: string): string[];
  rm(path: string, options?: { recursive?: boolean }): void;
  mv(from: string, to: string): void;
  exists(path: string): boolean;

  /** Follow-up 1. Calls `callback` for changes at `path` or anywhere below it. Returns an unsubscribe function. */
  watch(path: string, callback: (event: FsEvent) => void): () => void;
  /** Follow-up 2. Absolute paths of every *file* matching the glob, sorted. */
  find(pattern: string): string[];
}

export interface FileSystemModule {
  normalizePath(path: string): string;
  PathStore: new () => IPathStore;
  FileSystem: new () => IFileSystem;
}
