# In-memory file system API

## Problem statement
This task has two parts. It starts with the version Airbnb asked in 2024 and then grows into a small file-system API of the kind a browser IDE, a test harness or a sandboxed code runner needs.

**Part 1: `PathStore` (the Airbnb warm-up, about 15 minutes).** A store where every path holds a value:

```ts
const store = new PathStore();
store.create('/a', 1);
store.create('/a/b', 2);
store.get('/a/b');        // 2
store.set('/a/b', 3);
store.create('/c/d', 1);  // throws: parent "/c" doesn't exist
```

**Part 2: `FileSystem`.** The interviewer now says: "Make it a real file system. There are directories and files, and only files have content." Implement `mkdir` (like `mkdir -p`), `writeFile`, `readFile`, `ls`, `rm` (optionally recursive), `mv` and `exists`. Every path goes through the same `normalizePath`, and every failure throws an `Error` with a POSIX-style `code`.

Both parts are graded. Many candidates spend all their time on Part 1, so budget for Part 2.

## Clarifying questions to ask
- Are paths always absolute? *(They should be, but a relative path is treated as relative to `/`. Everything goes through `normalizePath` first.)*
- How are `.`, `..`, repeated slashes and trailing slashes handled? *(Like POSIX: `.` and empty segments are dropped, and `..` removes the previous segment. `..` at the root stays at the root. The normalized form has no trailing slash, except `/` itself.)*
- In Part 1, does `/` exist? *(Yes. It always exists and starts with the value `undefined`. You can't `create` it again.)*
- In Part 1, how are failures reported: return `false`, or throw? *(Throw the same typed errors as Part 2. Discuss the trade-off.)*
- Does `writeFile` create missing parent directories? *(No. It throws `ENOENT`. Only `mkdir` creates directories.)*
- Does `mv` overwrite an existing destination, or move into it when it's a directory? *(Neither. If the destination exists, it throws `EEXIST`.)*
- What order does `ls` return names in? *(Default `Array.prototype.sort` order, i.e. by UTF-16 code units.)*
- Can files be empty? *(Yes. `''` is valid content.)*

## Functional requirements
### Paths
- [ ] `normalizePath(path)` returns an absolute path that starts with `/`, has no empty or `.` segments, resolves `..`, and has no trailing slash (except `/`). `''` → `/`, `'a/b'` → `/a/b`, `'/../x'` → `/x`.
- [ ] Every method of both classes normalizes its path arguments first. Paths that normalize to the same string refer to the same node.

### Errors
- [ ] Failures throw an `Error` with `code` (one of the codes below) and `path` (the normalized path that caused it). A readable `message` such as `ENOENT: no such file or directory, '/a/b'` is recommended.
- [ ] Codes:
  - `ENOENT`: a path, or the parent it needs, doesn't exist.
  - `EEXIST`: the path already exists.
  - `ENOTDIR`: a component that should be a directory is a file.
  - `EISDIR`: a file operation was attempted on a directory.
  - `ENOTEMPTY`: removing a non-empty directory without `recursive`.
  - `EINVAL`: the operation is impossible (removing `/`, moving `/`, moving a directory into itself).

### Part 1: `PathStore`
- [ ] `create(path, value)` adds `path` with `value`. It throws `ENOENT` if the parent doesn't exist and `EEXIST` if `path` already exists (including `/`).
- [ ] `get(path)` returns the value (`undefined` for `/` until set). It throws `ENOENT` for a missing path.
- [ ] `set(path, value)` replaces the value of an existing path and never creates one. It throws `ENOENT` for a missing path.
- [ ] Any path can have children, whatever its value.

### Part 2: `FileSystem`
- [ ] Starts with an empty root directory `/`.
- [ ] `mkdir(path)` creates every missing directory along the path.
  - It's a no-op if the directory already exists.
  - It throws `EEXIST` if `path` is a file, and `ENOTDIR` if one of its ancestors is a file.
- [ ] `writeFile(path, content)` creates or overwrites a file.
  - It throws `ENOENT` if the parent directory doesn't exist, `ENOTDIR` if an ancestor is a file, and `EISDIR` if `path` is a directory (including `/`).
- [ ] `readFile(path)` returns the content.
  - It throws `ENOENT` if missing, `EISDIR` for a directory, and `ENOTDIR` if an ancestor is a file.
- [ ] `ls(path)` returns the sorted child names of a directory, `[]` for an empty one, and `[name]` for a file.
  - It throws `ENOENT` if missing and `ENOTDIR` if an ancestor is a file.
- [ ] `rm(path, { recursive })` removes a file or an empty directory.
  - A non-empty directory needs `recursive: true`, otherwise it throws `ENOTEMPTY`.
  - It throws `ENOENT` if missing and `EINVAL` for `/`.
- [ ] `mv(from, to)` moves a file or a whole directory subtree to the exact path `to`. Afterwards, `from` no longer exists.
  - Source errors: `ENOENT` if `from` is missing, `EINVAL` if `from` is `/`.
  - Destination errors: `EEXIST` if `to` exists, `ENOENT` if `to`'s parent is missing, `ENOTDIR` if `to`'s parent is a file.
  - `EINVAL` if `to` is inside `from`.
  - When `from` and `to` normalize to the same path, it's a no-op.
- [ ] `exists(path)` returns `true` for files and directories and `false` otherwise. It never throws, even when an ancestor is a file.
- [ ] While walking a path, a missing component gives `ENOENT` and a file in the middle of the path gives `ENOTDIR`.
- [ ] Instances don't share state.

## Non-functional requirements
- **Complexity:** looking up a path is O(number of segments). No operation scans the whole tree. `rm -r` and `mv` of a directory should be O(depth), relinking one node, not O(subtree size).
- **Data structure:** choose it deliberately (nested `Map`s, a trie of nodes, or a flat `Map<path, node>`) and be able to defend it against the alternative. A flat map makes `mv` and `rm -r` O(n).
- **Atomic failures:** a method that throws leaves the tree unchanged. For example, `mv` must not detach `from` before it has validated `to`.
- **Encapsulation:** callers can't reach the internal tree. `ls` returns a fresh array.

## Constraints
- 75 minutes for both parts. TypeScript only, no libraries. `node:path` isn't available in the browser.
- Export `normalizePath`, `PathStore` and `FileSystem` from `Solution.ts`. The types are in `types.ts`.
- No mock API needed.

## Data / API contract
```ts
type FsErrorCode = 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'ENOTEMPTY' | 'EINVAL';
interface FsError extends Error { code: FsErrorCode; path: string }

function normalizePath(path: string): string;

class PathStore {
  create(path: string, value: unknown): void;
  get(path: string): unknown;
  set(path: string, value: unknown): void;
}

class FileSystem {
  mkdir(path: string): void;
  writeFile(path: string, content: string): void;
  readFile(path: string): string;
  ls(path: string): string[];
  rm(path: string, options?: { recursive?: boolean }): void;
  mv(from: string, to: string): void;
  exists(path: string): boolean;

  // Follow-ups
  watch(path: string, callback: (event: { type: 'create' | 'change' | 'delete'; path: string }) => void): () => void; // 1
  find(pattern: string): string[];                                                                                    // 2
}
```

## Test contract
- Tests import `normalizePath`, `PathStore` and `FileSystem` as named exports and create a fresh instance per test.
- Errors are checked by catching them: the thrown value must be `instanceof Error` and have the expected `code`. One test also checks `path`. Messages are not checked.
- Some tests check that a failed operation left the tree unchanged, using `exists`, `ls` and `readFile`.
- Follow-up 1 tests collect events into an array and compare with `toEqual`. Callbacks must run synchronously, and events for one call arrive in the order the changes happen (parents before children for `mkdir`).
- Follow-up 2 tests compare `find` results with `toEqual` against sorted arrays of absolute file paths.

## Edge cases
- `normalizePath('/a/b/../../..')` → `/`. `normalizePath('./a/./b/')` → `/a/b`.
- `writeFile('/a/', 'x')` normalizes to `/a`. That's a file named `a`, not a directory.
- `mkdir('/a/file.txt/b')` where `file.txt` is a file → `ENOTDIR`, and nothing is created.
- `mkdir('/x/y/z')` fails halfway because `/x/y` is a file. Were `/x` and anything else left behind? They must not be.
- `mv('/a', '/a/b')` → `EINVAL`. `mv('/a', '/ab')` is fine, so don't use a plain `startsWith('/a')` check.
- `rm('/dir')` where the directory contains only an empty directory → `ENOTEMPTY`.
- Names like `..foo`, `.hidden`, and names with spaces or unicode are ordinary names.
- `ls` on a directory with names `B`, `a`, `10`, `9` → `['10', '9', 'B', 'a']` (code-unit order). Discuss natural sort.

## Follow-ups
1. **Watchers.** Add `watch(path, callback)`, which returns an unsubscribe function. It fires synchronously for changes at `path` or below it, including paths that don't exist yet:
   - `create` for each directory `mkdir` creates (parents first) and for each new file.
   - `change` when `writeFile` overwrites a file.
   - `delete` once for the path `rm` removes, not once per descendant.
   - `mv` emits `delete` at `from` and then `create` at `to`.
   What should a watcher on `/a/b` hear when `/a` is removed?
2. **Glob search.** Add `find(pattern)`, which returns the sorted absolute paths of every **file** that matches. A relative pattern is relative to `/`.
   - `*` matches any characters within one segment and `?` matches one character.
   - `**` as a whole segment matches zero or more segments: `find('**/*.ts')`, `find('/src/*/index.ts')`.
   Can you prune directories that can't possibly match?
3. **Undo via snapshots.** Add `snapshot(): number` and `restore(id)`. Taking a snapshot must be O(1). Hint: make nodes immutable and copy on write, like S49 `produce`, so snapshots share every untouched subtree.
4. **Size quota.** The constructor takes `{ quota: bytes }`. `writeFile` throws `ENOSPC` when the total content size would exceed it, where size means UTF-8 bytes rather than string length. Keep the running total correct across overwrite, `rm -r` and `mv`, without re-scanning the tree.

## Concepts covered
A tree of `Map`s as a trie · normalizing paths with a segment stack · walking a path with precise error codes · typed errors with `code` · validating before you mutate · moving subtrees by relinking one pointer · observer pattern (watchers) · glob matching with `**` and backtracking.

Related: S35 Transactional KV store · S05 File Explorer · S28 Event Emitter · S49 Immutable updates.
