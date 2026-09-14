import { useMemo, useState, type FormEvent } from 'react';
import type { FileSystemModule, IFileSystem } from './types';

const HELP = 'mkdir <p> · write <p> <text…> · cat <p> · ls [p] · rm [-r] <p> · mv <from> <to> · exists <p> · find <glob> · norm <p>';

const SEED: string[] = [
  'mkdir /src/components',
  'write /src/index.ts export * from "./components"',
  'write /src/components/Button.tsx <button/>',
  'write /README.md # Demo',
  'ls /',
];

function runCommand(impl: FileSystemModule, fs: IFileSystem, line: string): string {
  const [cmd, ...args] = line.trim().split(/\s+/);
  switch (cmd) {
    case 'mkdir':
      fs.mkdir(args[0] ?? '');
      return 'ok';
    case 'write':
      fs.writeFile(args[0] ?? '', args.slice(1).join(' '));
      return 'ok';
    case 'cat':
      return JSON.stringify(fs.readFile(args[0] ?? ''));
    case 'ls':
      return fs.ls(args[0] ?? '/').join('  ') || '(empty)';
    case 'rm': {
      const recursive = args[0] === '-r';
      fs.rm(recursive ? args[1] : args[0], { recursive });
      return 'ok';
    }
    case 'mv':
      fs.mv(args[0] ?? '', args[1] ?? '');
      return 'ok';
    case 'exists':
      return String(fs.exists(args[0] ?? ''));
    case 'find':
      return fs.find(args[0] ?? '**').join('\n') || '(no matches)';
    case 'norm':
      return impl.normalizePath(args[0] ?? '');
    default:
      return `unknown command. ${HELP}`;
  }
}

export default function Playground({ impl }: { impl: FileSystemModule }) {
  const { fs, createError } = useMemo(() => {
    try {
      return { fs: new impl.FileSystem(), createError: null };
    } catch (e) {
      return { fs: null, createError: (e as Error).message };
    }
  }, [impl]);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<{ line: string; out: string; failed: boolean }[]>([]);

  const exec = (lines: string[]) => {
    if (!fs) return;
    const entries = lines.map((line) => {
      try {
        return { line, out: runCommand(impl, fs, line), failed: false };
      } catch (e) {
        const err = e as Error & { code?: string };
        return { line, out: `${err.code ?? 'Error'}: ${err.message}`, failed: true };
      }
    });
    setLog((l) => [...l, ...entries].slice(-40));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    exec([input]);
    setInput('');
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 8, maxWidth: 720 }}>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>{HELP}</p>
      {createError && <p style={{ color: '#b91c1c' }}>Error: {createError}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => exec(SEED)}>
          Seed demo tree
        </button>
        <button type="button" onClick={() => setLog([])}>
          Clear log
        </button>
      </div>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, minHeight: 200, margin: 0, whiteSpace: 'pre-wrap' }}>
        {log.map((entry, i) => (
          <div key={i}>
            <span style={{ color: '#94a3b8' }}>$ {entry.line}</span>
            {'\n'}
            <span style={{ color: entry.failed ? '#fca5a5' : undefined }}>{entry.out}</span>
          </div>
        ))}
      </pre>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
          Command
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="ls /src" style={{ flex: 1, fontFamily: 'monospace', padding: 6 }} />
        </label>
        <button type="submit">Run</button>
      </form>
    </div>
  );
}
