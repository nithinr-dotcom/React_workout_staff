import type { ImageGalleryProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function ImageGallery({ images, label = 'Photo gallery', syncUrl = false }: ImageGalleryProps) {
  // Your implementation here. Requirements are in README.md.
  void label;
  void syncUrl;
  return <div className={styles.root}>Gallery with {images.length} photos: start coding in Solution.tsx</div>;
}
