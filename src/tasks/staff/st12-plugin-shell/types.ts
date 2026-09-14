import type { ComponentType } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * Designing the plugin API is part of the exercise: extend it freely, but don't break it.
 */

export type ExtensionPoint = 'toolbar' | 'sidebarPanels' | 'commands';

export interface ToolbarItem {
  id: string;
  label: string;
  onClick: () => void;
}

export interface SidebarPanel {
  id: string;
  title: string;
  component: ComponentType;
}

export interface Command {
  id: string;
  title: string;
  run: () => void;
}

export interface ContributionMap {
  toolbar: ToolbarItem;
  sidebarPanels: SidebarPanel;
  commands: Command;
}

/** What `getContributions` returns: the item plus the id of the plugin that contributed it. */
export type Contribution<P extends ExtensionPoint> = ContributionMap[P] & { pluginId: string };

/** Values are JSON-serialisable. Keys are private to the plugin. */
export interface PluginStorage {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}

export interface PluginEventBus {
  /** Synchronously delivers `payload` to every subscriber of `event`, across all active plugins. */
  emit(event: string, payload?: unknown): void;
  /** Returns an unsubscribe function. Subscriptions are removed automatically on deactivate. */
  on(event: string, handler: (payload: unknown) => void): () => void;
}

/** The only API a plugin gets. Plugins never see the host itself. */
export interface PluginContext {
  readonly pluginId: string;
  readonly hostVersion: string;
  /** Adds an item to an extension point. Returns a function that removes it. */
  contribute<P extends ExtensionPoint>(point: P, item: ContributionMap[P]): () => void;
  readonly storage: PluginStorage;
  readonly events: PluginEventBus;
  /** Registers cleanup to run when the plugin is deactivated. */
  onDispose(cleanup: () => void): void;
}

export interface Plugin {
  id: string;
  version: string;
  /** Host versions this plugin supports, as a caret range: "^MAJOR.MINOR.PATCH". */
  engines: string;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(): void;
}

/** A plugin whose code is fetched only when it is first activated. */
export interface LazyPluginEntry {
  id: string;
  load: () => Promise<Plugin | { default: Plugin }>;
}

export type PluginStatus = 'registered' | 'loading' | 'active' | 'inactive' | 'incompatible' | 'failed';

/** Subset of the Web Storage API, so tests can inject an in-memory store. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PluginHostOptions {
  hostVersion: string;
  /** Defaults to window.localStorage. */
  storage?: KeyValueStorage;
  /** Called for every error thrown by plugin code. Defaults to console.error. */
  onError?: (error: unknown, pluginId: string) => void;
}

export interface PluginHost {
  readonly hostVersion: string;
  /** Throws if a plugin with the same id is already registered. Never loads or activates. */
  register(entry: Plugin | LazyPluginEntry): void;
  /** Loads (if lazy), checks compatibility, and activates. Never rejects: resolves with the final status. */
  activate(id: string): Promise<PluginStatus>;
  deactivate(id: string): void;
  getStatus(id: string): PluginStatus | undefined;
  /** Must return the same array instance until contributions for that point change. */
  getContributions<P extends ExtensionPoint>(point: P): Contribution<P>[];
  /** Notified whenever statuses or contributions change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Routes an error from plugin code (e.g. a crashed panel) to `onError`. */
  reportError(error: unknown, pluginId: string): void;
}

export interface PluginShellProps {
  host: PluginHost;
}

export interface PluginShellModule {
  default: ComponentType<PluginShellProps>;
  createPluginHost(options: PluginHostOptions): PluginHost;
  satisfiesEngine(hostVersion: string, range: string): boolean;
}
