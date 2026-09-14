import { useCallback, useState, type ComponentType } from 'react';
import { MockSocket } from '../../../mocks/mockSocket';
import type { ChatSocket, ChatUIProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<ChatUIProps> } }) {
  const ChatUI = impl.default;
  const [intervalMs, setIntervalMs] = useState(1500);
  const [bursts, setBursts] = useState(false);
  const [maxMessages, setMaxMessages] = useState(50);
  const [withReconnect, setWithReconnect] = useState(true);
  const [current, setCurrent] = useState<MockSocket | null>(null);
  const [session, setSession] = useState(0);

  const createSocket = useCallback((): ChatSocket => {
    const socket = new MockSocket('chat', { intervalMs, burstEvery: bursts ? 5 : 0, burstSize: 8 });
    setCurrent(socket);
    return socket;
  }, [intervalMs, bursts]);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <label>
          Message every{' '}
          <select value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))}>
            <option value={300}>300ms</option>
            <option value={1500}>1.5s</option>
            <option value={4000}>4s</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={bursts} onChange={(e) => setBursts(e.target.checked)} /> Bursts
        </label>
        <label>
          maxMessages{' '}
          <input
            type="number"
            min={5}
            max={500}
            value={maxMessages}
            onChange={(e) => setMaxMessages(Number(e.target.value))}
            style={{ width: 64 }}
          />
        </label>
        <label>
          <input type="checkbox" checked={withReconnect} onChange={(e) => setWithReconnect(e.target.checked)} /> Reconnect
          (follow-up 1)
        </label>
        <button type="button" onClick={() => current?.simulateDrop()}>
          Simulate network drop
        </button>
        <button type="button" onClick={() => setSession((s) => s + 1)}>
          Remount
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Scroll up while messages arrive to see the unread button. Your own messages are echoed back by the mock server as
        author “you”.
      </p>
      <div style={{ height: 480 }}>
        <ChatUI
          key={`${session}-${intervalMs}-${bursts}`}
          createSocket={createSocket}
          maxMessages={maxMessages}
          reconnect={withReconnect ? { baseDelay: 1000, maxDelay: 8000 } : undefined}
        />
      </div>
    </div>
  );
}
