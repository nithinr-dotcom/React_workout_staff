import { Component, useEffect, useState, type ReactNode } from 'react';
import { SAMPLE_ENTRIES } from './data';
import type { PluginHost, PluginShellModule, PluginStatus } from './types';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

function createDemoHost(impl: PluginShellModule): { host: PluginHost | null; error: string | null } {
  try {
    const host = impl.createPluginHost({
      hostVersion: '1.4.0',
      onError: (error, pluginId) => console.warn(`[plugin:${pluginId}]`, error),
    });
    for (const entry of SAMPLE_ENTRIES) host.register(entry);
    return { host, error: null };
  } catch (e) {
    return { host: null, error: (e as Error).message };
  }
}

export default function Playground({ impl }: { impl: PluginShellModule }) {
  const [{ host, error }] = useState(() => createDemoHost(impl));
  const [statuses, setStatuses] = useState<Record<string, PluginStatus | 'error'>>({});
  const Shell = impl.default;

  const activate = async (id: string) => {
    if (!host) return;
    try {
      const status = await host.activate(id);
      setStatuses((s) => ({ ...s, [id]: status }));
    } catch {
      setStatuses((s) => ({ ...s, [id]: 'error' }));
    }
  };

  useEffect(() => {
    if (!host) return;
    for (const entry of SAMPLE_ENTRIES) {
      host
        .activate(entry.id)
        .then((status) => setStatuses((s) => ({ ...s, [entry.id]: status })))
        .catch(() => setStatuses((s) => ({ ...s, [entry.id]: 'error' })));
    }
  }, [host]);

  if (error || !host) return <p style={{ color: '#b91c1c' }}>Error: {error}</p>;

  return (
    <div style={{ display: 'grid', gap: 16, fontFamily: 'system-ui', maxWidth: 900 }}>
      <section>
        <h3>Plugins (host 1.4.0)</h3>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {SAMPLE_ENTRIES.map((entry) => (
              <tr key={entry.id}>
                <td style={{ padding: '2px 12px 2px 0', fontFamily: 'monospace' }}>{entry.id}</td>
                <td style={{ padding: '2px 12px' }}>{statuses[entry.id] ?? host.getStatus(entry.id) ?? '…'}</td>
                <td>
                  <button onClick={() => activate(entry.id)}>Activate</button>{' '}
                  <button
                    onClick={() => {
                      try {
                        host.deactivate(entry.id);
                        setStatuses((s) => ({ ...s, [entry.id]: host.getStatus(entry.id) ?? 'inactive' }));
                      } catch {
                        setStatuses((s) => ({ ...s, [entry.id]: 'error' }));
                      }
                    }}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12 }}>
        <Boundary>
          <Shell host={host} />
        </Boundary>
      </section>
    </div>
  );
}
