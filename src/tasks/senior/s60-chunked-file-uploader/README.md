# File Uploader with chunking, progress & resume

## Problem statement
Build the upload widget of a media product, like attaching photos and videos to a post. Large files are unreliable over a single request, so `ChunkedUploader` splits each file into fixed-size **chunks** with `Blob.slice` and uploads them one request at a time, through an injected `uploadChunk({ fileId, index, blob, signal })`.

The widget must:
- accept files from a **file picker** and a **drop zone**, with client-side validation of type and size
- upload at most **N chunks at the same time across all files**
- show a **progress bar per file** plus an **overall** progress bar
- let the user **pause**, **resume** and **cancel** each file. Resume must not re-upload chunks the server already acknowledged.
- **retry** a failed chunk up to 3 times. After that, mark the file as failed, with a Retry button.

> "Media uploads" is a recurring Meta frontend topic, and chunked, resumable upload is a common frontend system design question. Here you implement the client half for real.

## Clarifying questions to ask
- Is the concurrency limit per file or global? *(Global: at most `concurrency` chunk requests in flight across all files, as browsers limit connections per host.)*
- In what order are chunks scheduled? *(Files in the order they were added. Within a file, lowest index first.)*
- Does the upload start automatically? *(Yes, as soon as a valid file is added.)*
- How is progress measured? *(By acknowledged bytes: the sum of the sizes of acknowledged chunks, divided by the file size, as an integer percentage. Per-chunk byte progress is not needed. The injected function has no progress callback.)*
- What does "retry up to 3 times" mean exactly? *(Up to 4 attempts per chunk: 1 plus `maxRetries`. Wait `retryDelayMs × retryNumber` before each retry. A request aborted by pause or cancel is not a failure and doesn't use up a retry.)*
- When a chunk runs out of retries, what happens to the file's other chunks? *(The file becomes `Failed`. Abort its other in-flight chunks and start no new ones for it. Other files continue.)*
- What does Cancel do? *(It aborts the file's in-flight requests and removes the file from the list. Server-side cleanup is out of scope.)*
- Is there a final "complete upload" call? *(No. The file is `Complete` when every chunk is acknowledged.)*
- Are empty (0-byte) files allowed? *(No. Reject them with `<name> is empty`.)*

## Functional requirements
- [ ] **File picker:** a file input labelled `Choose files` that accepts multiple files.
- [ ] **Drop zone:** a region that shows `Drop files here`. Dropping files adds them, with the same validation as the picker. Highlight it while files are dragged over (`dragover` must `preventDefault`).
- [ ] **Validation**, per file, before anything is uploaded:
  - Larger than `maxFileSize`: show `<name> is too large`.
  - Type not matching `accept`: show `<name> is not an allowed file type`. `accept` entries match exactly (`image/png`) or by wildcard (`image/*`). Without `accept`, any type is allowed.
  - Size 0: show `<name> is empty`.
  - Show rejected files' messages in an alert. Rejected files never appear in the list and are never uploaded. Valid files in the same batch are still added.
- [ ] **Chunking:**
  - A file of size `S` has `ceil(S / chunkSize)` chunks.
  - Chunk `i` is `file.slice(i * chunkSize, (i + 1) * chunkSize)`.
  - Each added file gets a unique `fileId`, used in every call for that file.
- [ ] **Scheduling:**
  - Never have more than `concurrency` `uploadChunk` calls in flight in total.
  - When one settles, start the next pending chunk: files in the order they were added, lowest index first within a file.
  - Skip paused, failed, cancelled and completed files.
- [ ] **Per-file row:**
  - Show the file name and a status: `Uploading` (including queued), `Paused`, `Complete` or `Failed`.
  - A progress bar whose value is the integer percentage of acknowledged bytes.
  - Buttons that depend on the status: `Pause <name>` while uploading, `Resume <name>` while paused, `Retry <name>` when failed, and `Cancel <name>` unless complete.
- [ ] **Overall progress:** a progress bar showing the acknowledged bytes of every listed file divided by their total bytes, as an integer percentage. Cancelled files don't count.
- [ ] **Pause:** abort the file's in-flight requests (via their `signal`) and start no new ones. Chunks acknowledged before the pause stay acknowledged, and progress doesn't go backwards.
- [ ] **Resume:** continue with only the chunks that haven't been acknowledged yet.
- [ ] **Cancel:** abort the file's in-flight requests, remove the row, and never call `uploadChunk` for that `fileId` again.
- [ ] **Retry policy:**
  - When `uploadChunk` rejects (not because of an abort), retry that chunk after `retryDelayMs × n`, where `n` is the retry number (1, 2, 3).
  - After `maxRetries` failed retries, mark the file `Failed` and abort its other in-flight chunks.
  - `Retry <name>` resumes the file with fresh retry counts, skipping acknowledged chunks.
- [ ] **Unmount:** abort every in-flight request and cancel pending retry timers. No state updates after unmount.

## Non-functional requirements
- **Accessibility:**
  - Uploads are a `<ul aria-label="Uploads">`.
  - Each file's progress bar has `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`, and an accessible name equal to the file name (`aria-label`). A native `<progress>` is fine if you also set `aria-valuenow` and the label.
  - The overall bar is named `Overall progress`.
  - The drop zone is not the only way in: the labelled file input is keyboard-accessible.
  - Validation errors are announced with `role="alert"`. Status changes to `Complete` and `Failed` should be announced politely.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Reaches the file input and every row's Pause/Resume/Retry/Cancel buttons |
  | `Enter` / `Space` | Activates the focused button, or opens the file picker from its input or label |

- **Performance:**
  - Never read a whole file into memory. `slice` is lazy.
  - Keep the scheduler's bookkeeping (in-flight count, acknowledged sets, controllers) in refs or a plain object, not in React state that re-renders on every tick.
  - Render progress from state that changes once per acknowledged chunk.
  - A 1 GB file with 1 MiB chunks has 1,024 chunks. Don't create 1,024 promises up front.
- **UX states:** empty (no files), uploading, paused, failed with retry, complete. Rejected-file errors can be dismissed, or are replaced by the next batch's errors.

## Constraints
- 90 minutes. React and CSS Modules only. No upload, queue or retry libraries.
- Talk to the server only through `uploadChunk`. The Playground uses `createChunkServer` from `./server.ts`.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface UploadChunkArgs { fileId: string; index: number; blob: Blob; signal: AbortSignal }
type UploadChunk = (args: UploadChunkArgs) => Promise<void>;   // rejects with AbortError after abort

interface ChunkedUploaderProps {
  uploadChunk: UploadChunk;
  chunkSize?: number;      // default 1_048_576 (1 MiB)
  concurrency?: number;    // default 3, global
  maxRetries?: number;     // default 3 → up to 4 attempts per chunk
  retryDelayMs?: number;   // default 500; wait retryDelayMs × n before retry n
  maxFileSize?: number;    // default 50 MiB
  accept?: string[];       // e.g. ['image/*', 'application/pdf']; default: any
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `uploadChunk` is a `vi.fn`. Most tests keep each call pending, and resolve or reject it by hand. Its fake listens to `signal` and rejects with an `AbortError` when aborted.
- Tests pass small numbers (for example a 10-byte file with `chunkSize={4}`, so chunk sizes are 4, 4 and 2) and `retryDelayMs={0}`.
- Files are added with `user.upload(getByLabelText('Choose files'), files)`, with `applyAccept: false`, or by firing a `drop` event with `dataTransfer.files` on the element with the text `Drop files here`. The event bubbles, so a handler on an ancestor works.
- Rows are the `listitem`s of the `list` named `Uploads`, identified by the file name in their text. Status is checked with `toHaveTextContent('Uploading' | 'Paused' | 'Complete' | 'Failed')`.
- Progress bars are `getByRole('progressbar', { name: '<file name>' })` and `{ name: 'Overall progress' }`. Tests read `aria-valuenow`.
- The buttons are named `Pause <name>`, `Resume <name>`, `Cancel <name>` and `Retry <name>`.
- Validation messages appear inside a `role="alert"` element: `<name> is too large`, `<name> is not an allowed file type`, `<name> is empty`.
- Tests check the concurrency cap by counting calls whose promise hasn't settled yet. They wait for async scheduling with `waitFor`.

## Edge cases
- A file whose size is an exact multiple of `chunkSize`: no trailing 0-byte chunk.
- A file smaller than one chunk.
- Pause, then Resume, clicked before the aborted request has rejected. The late `AbortError` must not mark the file failed or double-start a chunk.
- A chunk resolves after its file was cancelled or paused (the server ignored the abort): ignore it, or count it as acknowledged, but never start extra work.
- The same file added twice: it gets two independent rows with different `fileId`s.
- Many files dropped at once: 50 rows but still only `concurrency` requests.
- Retry timers still pending when the user pauses or cancels.
- React StrictMode double effects must not double-upload.

## Follow-ups
1. **Resume after page reload.** Persist each file's acknowledged chunk indexes to `localStorage`, keyed by a fingerprint (`name + size + lastModified`). When the user re-selects the same file after a reload, skip the chunks the server already has. What if the server's state disagrees? Add a `getUploadedChunks(fileId)` call.
2. **Checksum per chunk.** Compute a SHA-256 of each chunk with `crypto.subtle.digest` and send it with the chunk. The server rejects mismatches with a 422, which should retry right away rather than with backoff.
3. **Hash in a Web Worker.** Hashing large chunks blocks the main thread. Move it into a Worker, stream chunks to it with transferable `ArrayBuffer`s, and keep the UI at 60 fps. How do you cancel hashing on pause?
4. **Adaptive concurrency.** Start with 2 concurrent chunks. Increase by 1 (up to 6) after each run of fast successes. Halve on a failure or when latency spikes, similar to TCP congestion control. Show the current level in the UI.
5. **Upload speed and ETA.** Show the bytes per second (smoothed with an exponential moving average) and the estimated time remaining per file, updated at most 4 times a second.

## Concepts covered
The File and Blob APIs (`slice`, lazy reading) · a concurrency-limited scheduler over a priority order · `AbortController` per request · retry with linear or exponential delay · refs for in-flight bookkeeping vs state for rendering · drag and drop events · `role="progressbar"` · cleanup on unmount.

Related: S27 Concurrency-limited task runner · S32 Retry with backoff · S09 Progress Bars Queue · J10 Progress Bar.
