import { useState } from 'react';
import { WORDS } from '../../../mocks/data/datasets';
import type { WordleModule } from './types';

const randomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

export default function Playground({ impl }: { impl: WordleModule }) {
  const Wordle = impl.default;
  const [answer, setAnswer] = useState(randomWord);
  const [game, setGame] = useState(0);
  const [reveal, setReveal] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            setAnswer(randomWord());
            setGame((g) => g + 1);
            setReveal(false);
          }}
        >
          New random word
        </button>
        <label>
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} /> Reveal answer
        </label>
        {reveal && <code>{answer}</code>}
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Allowed words ({WORDS.length}): {WORDS.join(', ')}
      </p>
      {/* key remounts the game for a new answer */}
      <Wordle key={game} answer={answer} />
    </div>
  );
}
