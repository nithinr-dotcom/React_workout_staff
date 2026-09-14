import type {
  CollabDemoProps,
  CreateClientOptions,
  CreateServerOptions,
  OTClient,
  OTServer,
  Operation,
  TieBreak,
} from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function apply(doc: string, op: Operation): string {
  void doc;
  void op;
  throw new Error('apply: not implemented');
}

export function transform(a: Operation, b: Operation, tieBreak: TieBreak): Operation {
  void a;
  void b;
  void tieBreak;
  throw new Error('transform: not implemented');
}

export function compose(a: Operation, b: Operation): Operation {
  void a;
  void b;
  throw new Error('compose: not implemented');
}

export function createServer(options: CreateServerOptions): OTServer {
  void options;
  throw new Error('createServer: not implemented');
}

export function createClient(options: CreateClientOptions): OTClient {
  void options;
  throw new Error('createClient: not implemented');
}

export default function CollabDemo({ initialText = '', initialDelayMs = 300 }: CollabDemoProps) {
  // Two textareas ("Alice" and "Bob") plus a "Network delay" slider. Use createDelayedNetwork from ./network.
  void initialText;
  void initialDelayMs;
  return <div className={styles.root}>CollabDemo: start coding in Solution.tsx</div>;
}
