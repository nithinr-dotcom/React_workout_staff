import { useState, type ComponentType } from 'react';
import type { CarouselImage, ImageCarouselProps } from './types';

// Self-contained SVG slides so the demo works offline.
function slide(title: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="800" height="450" fill="url(#g)"/>
    <text x="400" y="240" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="white" text-anchor="middle">${title}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const IMAGES: CarouselImage[] = [
  { src: slide('Big Billion Sale', '#4f46e5', '#9333ea'), alt: 'Big Billion Sale: up to 80% off electronics' },
  { src: slide('New Sneakers', '#0ea5e9', '#22c55e'), alt: 'New sneaker collection just dropped' },
  { src: slide('Free Delivery', '#f97316', '#ef4444'), alt: 'Free delivery on orders above ₹499' },
  { src: slide('Monsoon Picks', '#0f766e', '#1e3a8a'), alt: 'Monsoon picks: raincoats and umbrellas' },
];

export default function Playground({ impl }: { impl: { default: ComponentType<ImageCarouselProps> } }) {
  const ImageCarousel = impl.default;
  const [interval, setIntervalMs] = useState(3000);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
      <label>
        autoPlayInterval: {interval === 0 ? 'off' : `${interval}ms`}{' '}
        <input
          type="range"
          min={0}
          max={6000}
          step={500}
          value={interval}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
        />
      </label>
      <section>
        <h3>Hero banner</h3>
        <ImageCarousel images={IMAGES} autoPlayInterval={interval} label="Offers" />
      </section>
      <section>
        <h3>Single image</h3>
        <ImageCarousel images={IMAGES.slice(0, 1)} autoPlayInterval={interval} />
      </section>
      <section>
        <h3>Empty</h3>
        <ImageCarousel images={[]} />
      </section>
    </div>
  );
}
