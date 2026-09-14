import type { ImageCarouselProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function ImageCarousel({ images, autoPlayInterval = 0, label = 'Image carousel' }: ImageCarouselProps) {
  // Your implementation here. Requirements are in README.md.
  void autoPlayInterval;
  void label;
  return <div className={styles.root}>ImageCarousel with {images.length} images: start coding in Solution.tsx</div>;
}
