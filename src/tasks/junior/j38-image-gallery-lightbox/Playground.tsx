import { useState, type ComponentType } from 'react';
import type { GalleryImage, ImageGalleryProps } from './types';

// picsum.photos serves fixed photos by id; sizes differ on purpose to exercise object-fit.
const photo = (id: number, w: number, h: number): Pick<GalleryImage, 'src' | 'thumbSrc'> => ({
  src: `https://picsum.photos/id/${id}/${w}/${h}`,
  thumbSrc: `https://picsum.photos/id/${id}/300/300`,
});

// Alt text is neutral because picsum photos are random stock shots; in a real app it describes the photo.
const IMAGES: GalleryImage[] = [
  { id: 'p1015', ...photo(1015, 1600, 1067), alt: 'Road trip, day 1: morning departure', caption: 'Leaving before sunrise' },
  { id: 'p1016', ...photo(1016, 1600, 1000), alt: 'Road trip, day 1: first viewpoint' },
  { id: 'p1036', ...photo(1036, 1600, 1067), alt: 'Road trip, day 1: lunch stop', caption: 'Best dal in the valley' },
  { id: 'p1043', ...photo(1043, 1067, 1600), alt: 'Road trip, day 1: forest trail' },
  { id: 'p1018', ...photo(1018, 1600, 900), alt: 'Road trip, day 2: mountain pass', caption: 'Pass at 3,200 m' },
  { id: 'p1011', ...photo(1011, 1600, 1067), alt: 'Road trip, day 2: lakeside break' },
  { id: 'p1002', ...photo(1002, 1600, 1067), alt: 'Road trip, day 2: afternoon detour' },
  { id: 'p1031', ...photo(1031, 1067, 1600), alt: 'Road trip, day 2: evening in town', caption: 'Market street at dusk' },
  { id: 'p1039', ...photo(1039, 1600, 1067), alt: 'Road trip, day 3: early start' },
  { id: 'p1040', ...photo(1040, 1600, 1067), alt: 'Road trip, day 3: scenic overlook' },
  { id: 'p1050', ...photo(1050, 1600, 1067), alt: 'Road trip, day 3: last hike' },
  { id: 'p1022', ...photo(1022, 1600, 1067), alt: 'Road trip, day 3: night sky', caption: 'Worth staying up for' },
];

// Offline fallback: a coloured SVG with the photo number.
function svg(n: number, hue: number) {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="hsl(${hue} 60% 45%)"/><text x="600" y="430" font-family="system-ui" font-size="120" fill="white" text-anchor="middle">Photo ${n}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
const OFFLINE: GalleryImage[] = Array.from({ length: 5 }, (_, i) => ({
  id: `svg-${i + 1}`,
  src: svg(i + 1, i * 70),
  alt: `Placeholder photo ${i + 1}`,
}));

export default function Playground({ impl }: { impl: { default: ComponentType<ImageGalleryProps> } }) {
  const ImageGallery = impl.default;
  const [offline, setOffline] = useState(false);
  const [syncUrl, setSyncUrl] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <label>
          <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} /> Use offline SVG
          images
        </label>
        <label>
          <input type="checkbox" checked={syncUrl} onChange={(e) => setSyncUrl(e.target.checked)} /> syncUrl (follow-up 3)
        </label>
      </div>
      <section>
        <h3>Road trip ({offline ? OFFLINE.length : IMAGES.length} photos)</h3>
        <ImageGallery key={`${offline}-${syncUrl}`} images={offline ? OFFLINE : IMAGES} label="Road trip" syncUrl={syncUrl} />
      </section>
      <section>
        <h3>Single photo</h3>
        <ImageGallery images={IMAGES.slice(2, 3)} label="Single photo" />
      </section>
      <section>
        <h3>Empty</h3>
        <ImageGallery images={[]} />
      </section>
    </div>
  );
}
