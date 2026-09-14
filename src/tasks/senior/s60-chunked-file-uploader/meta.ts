import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's60-chunked-file-uploader',
  code: 'S60',
  title: 'File Uploader with chunking, progress & resume',
  level: 'senior',
  order: 60,
  kind: 'app',
  minutes: 90,
  summary: 'Drag-and-drop uploader that slices files with Blob.slice, uploads chunks under a global concurrency cap, retries failures, and supports pause, resume and cancel with per-file and overall progress.',
  concepts: [
    'Blob.slice / File API',
    'concurrency-limited scheduling',
    'AbortController',
    'retry policies',
    'refs vs state for in-flight work',
    'drag and drop',
    'progressbar a11y',
  ],
  companies: ['Meta'],
  prerequisites: ['s27-concurrency-runner', 's32-retry-backoff', 's09-progress-bars-queue'],
  frequency: 'occasional',
};

export default meta;
