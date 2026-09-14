export interface UploadChunkArgs {
  /** Stable id for one added file. The same across retries, pause/resume and every chunk of that file. */
  fileId: string;
  /** 0-based chunk index. */
  index: number;
  /** `file.slice(index * chunkSize, (index + 1) * chunkSize)` */
  blob: Blob;
  /** Aborted when the file is paused or cancelled, or when the component unmounts. */
  signal: AbortSignal;
}

/** Resolves when the server has acknowledged the chunk. Rejects on failure, or with an AbortError after `signal` aborts. */
export type UploadChunk = (args: UploadChunkArgs) => Promise<void>;

export interface ChunkedUploaderProps {
  uploadChunk: UploadChunk;
  /** Bytes per chunk. Default 1 MiB (1_048_576). */
  chunkSize?: number;
  /** Maximum chunks in flight across ALL files. Default 3. */
  concurrency?: number;
  /** Retries per chunk after the first failed attempt. Default 3 (so up to 4 attempts). */
  maxRetries?: number;
  /** Delay before retry n is `retryDelayMs * n`. Default 500. Tests pass 0. */
  retryDelayMs?: number;
  /** Maximum file size in bytes. Default 50 MiB. */
  maxFileSize?: number;
  /** Allowed MIME types. Exact ("image/png") or wildcard ("image/*"). Default: any type. */
  accept?: string[];
}
