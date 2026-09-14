import { useState } from 'react';
import type { VideoPlayerModule } from './types';

const VIDEOS = [
  {
    title: 'Flower (MDN sample, 0:05)',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    poster: undefined,
  },
  {
    title: 'Big Buck Bunny (9:56)',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
  },
];

export default function Playground({ impl }: { impl: VideoPlayerModule }) {
  const VideoPlayer = impl.default;
  const [index, setIndex] = useState(1);
  const video = VIDEOS[index];
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
      <label>
        Video{' '}
        <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
          {VIDEOS.map((v, i) => (
            <option key={v.src} value={i}>
              {v.title}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0 }}>
        Click the player, then try <kbd>K</kbd>, <kbd>J</kbd>/<kbd>L</kbd>, <kbd>←</kbd>/<kbd>→</kbd>, <kbd>M</kbd> and{' '}
        <kbd>F</kbd>. Pause from your OS media keys to check the UI follows the element.
      </p>
      <VideoPlayer key={video.src} src={video.src} title={video.title} poster={video.poster} />
    </div>
  );
}
