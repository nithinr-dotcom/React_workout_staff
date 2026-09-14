import { useEffect, useRef, useState, type ComponentType } from 'react';
import { createChunkServer, type ServerKnobs } from './server';
import type { ChunkedUploaderProps } from './types';

const MiB = 1_048_576;

export default function Playground({ impl }: { impl: { default: ComponentType<ChunkedUploaderProps> } }) {
  const ChunkedUploader = impl.default;
  const [failRate, setFailRate] = useState(0);
  const [kibPerSecond, setSpeed] = useState(2048);
  const [chunkSize, setChunkSize] = useState(MiB / 4);
  const [concurrency, setConcurrency] = useState(3);
  const [session, setSession] = useState(0);
  const [stats, setStats] = useState({ inFlight: 0, peak: 0 });

  // Knobs are read per request, so changing them doesn't remount the uploader.
  const knobs = useRef<ServerKnobs>({ failRate, kibPerSecond });
  useEffect(() => {
    knobs.current = { failRate, kibPerSecond };
  }, [failRate, kibPerSecond]);
  const [server] = useState(() => createChunkServer(() => knobs.current));

  useEffect(() => {
    const id = setInterval(() => setStats({ inFlight: server.inFlight(), peak: server.peak() }), 200);
    return () => clearInterval(id);
  }, [server]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <label>
          Failure rate{' '}
          <select value={failRate} onChange={(e) => setFailRate(Number(e.target.value))}>
            <option value={0}>0%</option>
            <option value={0.2}>20%</option>
            <option value={0.6}>60%</option>
            <option value={1}>100%</option>
          </select>
        </label>
        <label>
          Speed{' '}
          <select value={kibPerSecond} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={256}>256 KiB/s</option>
            <option value={2048}>2 MiB/s</option>
            <option value={20480}>20 MiB/s</option>
          </select>
        </label>
        <label>
          Chunk size (remounts){' '}
          <select
            value={chunkSize}
            onChange={(e) => {
              setChunkSize(Number(e.target.value));
              setSession((s) => s + 1);
            }}
          >
            <option value={MiB / 16}>64 KiB</option>
            <option value={MiB / 4}>256 KiB</option>
            <option value={MiB}>1 MiB</option>
          </select>
        </label>
        <label>
          Concurrency (remounts){' '}
          <select
            value={concurrency}
            onChange={(e) => {
              setConcurrency(Number(e.target.value));
              setSession((s) => s + 1);
            }}
          >
            {[1, 2, 3, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            server.reset();
            setSession((s) => s + 1);
          }}
        >
          Reset
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Server: {stats.inFlight} request(s) in flight, peak {stats.peak} (should never exceed {concurrency}). Pick a few
        MB of any files. Images and PDFs up to 200 MiB are accepted.
      </p>
      <ChunkedUploader
        key={session}
        uploadChunk={server.uploadChunk}
        chunkSize={chunkSize}
        concurrency={concurrency}
        maxFileSize={200 * MiB}
        accept={['image/*', 'application/pdf', 'video/*', 'text/plain']}
      />
    </div>
  );
}
