import type { ComponentType } from 'react';
import type { PollOption, PollWidgetProps } from './types';

const FRAMEWORKS: PollOption[] = [
  { id: 'react', label: 'React', votes: 128 },
  { id: 'vue', label: 'Vue', votes: 64 },
  { id: 'svelte', label: 'Svelte', votes: 31 },
  { id: 'solid', label: 'SolidJS', votes: 12 },
];

const THREE_WAY: PollOption[] = [
  { id: 'tabs', label: 'Tabs', votes: 1 },
  { id: 'spaces', label: 'Spaces', votes: 1 },
  { id: 'both', label: 'Whatever the formatter says', votes: 0 },
];

export default function Playground({ impl }: { impl: { default: ComponentType<PollWidgetProps> } }) {
  const PollWidget = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 480 }}>
      <PollWidget pollId="playground-frameworks" question="Which framework do you reach for first?" options={FRAMEWORKS} />
      <PollWidget pollId="playground-indent" question="Tabs or spaces?" options={THREE_WAY} />
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem('poll:playground-frameworks');
          localStorage.removeItem('poll:playground-indent');
          location.reload();
        }}
      >
        Clear stored votes and reload
      </button>
    </div>
  );
}
