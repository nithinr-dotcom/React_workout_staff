import type { PluginHost, PluginHostOptions, PluginShellProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function satisfiesEngine(hostVersion: string, range: string): boolean {
  // Your implementation here. Requirements are in README.md.
  void hostVersion;
  void range;
  throw new Error('satisfiesEngine: not implemented');
}

export function createPluginHost(options: PluginHostOptions): PluginHost {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createPluginHost: not implemented');
}

export default function PluginShell({ host }: PluginShellProps) {
  // Your implementation here. Requirements are in README.md.
  void host;
  return <div className={styles.root}>PluginShell: start coding in Solution.tsx</div>;
}
