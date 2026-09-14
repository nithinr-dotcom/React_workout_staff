import type { ComponentType } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * You may add options, fields and exports (API design is part of the exercise), but don't break these.
 */

/** Insert `text` before index `pos`. */
export interface InsertComponent {
  type: 'insert';
  pos: number;
  text: string;
}

/** Remove `len` characters starting at index `pos`. */
export interface DeleteComponent {
  type: 'delete';
  pos: number;
  len: number;
}

export type Component = InsertComponent | DeleteComponent;

/**
 * An operation is a list of components applied left to right.
 * Each component's `pos` refers to the document as left by the previous component.
 * `[]` is the identity operation.
 */
export type Operation = Component[];

/** Which side wins when both operations insert at the same position. `'left'` = the first argument's text goes first. */
export type TieBreak = 'left' | 'right';

// ---------- Protocol ----------

export type ClientMessage = {
  type: 'op';
  /** The server revision this op was based on. */
  revision: number;
  op: Operation;
};

export type ServerMessage =
  /** Your in-flight op was accepted. `revision` is the server revision after applying it. */
  | { type: 'ack'; revision: number }
  /** Someone else's op, already transformed by the server. `revision` is the server revision after applying it. */
  | { type: 'op'; revision: number; op: Operation };

export type Message = ClientMessage | ServerMessage;

/**
 * Transport between peers. Delivery on each (from → to) link is FIFO, like a WebSocket,
 * but messages on different links interleave arbitrarily and may be delayed.
 */
export interface Network {
  send(from: string, to: string, message: Message): void;
  /** Register the handler for messages addressed to `id`. Returns an unsubscribe function. */
  listen(id: string, handler: (from: string, message: Message) => void): () => void;
}

export interface OTServer {
  getDoc(): string;
  /** Number of operations in the server history. */
  getRevision(): number;
  /** Register a client for broadcasts and return the snapshot it should start from. */
  join(clientId: string): { doc: string; revision: number };
  leave(clientId: string): void;
  destroy(): void;
}

export interface CreateServerOptions {
  doc: string;
  network: Network;
  /** Network id of the server. Default `'server'`. */
  id?: string;
}

export type ClientState = 'synchronized' | 'awaitingConfirm' | 'awaitingWithBuffer';

export interface ClientChange {
  op: Operation;
  source: 'local' | 'remote';
}

export interface OTClient {
  readonly id: string;
  getDoc(): string;
  /** The last server revision this client has seen (via ack or remote op). */
  getRevision(): number;
  getState(): ClientState;
  /** The user edited the local document. Apply immediately; send or buffer. */
  applyLocal(op: Operation): void;
  /** Called after every change to the local document. Returns an unsubscribe function. */
  subscribe(listener: (change: ClientChange) => void): () => void;
  destroy(): void;
}

export interface CreateClientOptions {
  id: string;
  /** Snapshot from `server.join(id)`. */
  doc: string;
  revision: number;
  network: Network;
  /** Network id of the server. Default `'server'`. */
  serverId?: string;
}

export interface CollabDemoProps {
  /** Text both editors start with. Default `''`. */
  initialText?: string;
  /** Starting value of the "Network delay" slider, in ms. Default `300`. */
  initialDelayMs?: number;
}

export interface CollabModule {
  apply(doc: string, op: Operation): string;
  transform(a: Operation, b: Operation, tieBreak: TieBreak): Operation;
  compose(a: Operation, b: Operation): Operation;
  createServer(options: CreateServerOptions): OTServer;
  createClient(options: CreateClientOptions): OTClient;
  default: ComponentType<CollabDemoProps>;
  /** Follow-up 1 (optional). */
  transformPosition?(pos: number, op: Operation, isOwnOp: boolean): number;
}
