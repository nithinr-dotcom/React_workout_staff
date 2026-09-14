import { useEffect, useState } from 'react';
import s from '../shell.module.css';

/** Loads source text lazily (so reference code never ships to the page until asked for). */
export function AsyncCode({ load }: { load: () => Promise<{ file: string; code: string }[]> }) {
  const [files, setFiles] = useState<{ file: string; code: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then((f) => {
      if (!cancelled) setFiles(f);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!files) return <p className={s.muted}>Loading…</p>;
  if (files.length === 0) return <p className={s.muted}>No files.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {files.map((f) => (
        <div key={f.file}>
          <div className={s.code} style={{ marginBottom: 4 }}>
            {f.file}
          </div>
          <pre className={s.codeBlock}>{f.code}</pre>
        </div>
      ))}
    </div>
  );
}
