import type { ChunkedUploaderProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function ChunkedUploader({
  uploadChunk,
  chunkSize = 1_048_576,
  concurrency = 3,
  maxRetries = 3,
  retryDelayMs = 500,
  maxFileSize = 50 * 1_048_576,
  accept,
}: ChunkedUploaderProps) {
  // Your implementation here. Requirements are in README.md.
  void uploadChunk;
  void chunkSize;
  void concurrency;
  void maxRetries;
  void retryDelayMs;
  void maxFileSize;
  void accept;
  return <div className={styles.root}>Chunked file uploader: start coding in Solution.tsx</div>;
}
