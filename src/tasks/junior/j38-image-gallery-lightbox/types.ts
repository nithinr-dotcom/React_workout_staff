export interface GalleryImage {
  /** Unique, stable id. Also used in the `?photo=` deep link (follow-up 3). */
  id: string;
  /** Full-size image shown in the lightbox. */
  src: string;
  /** Smaller image for the grid. Falls back to `src`. */
  thumbSrc?: string;
  /** Required alt text. Names the thumbnail button and the large image. */
  alt: string;
  /** Optional visible caption shown under the large image. */
  caption?: string;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  /** Accessible name of the thumbnail list. Default "Photo gallery". */
  label?: string;
  /** Follow-up 3: keep the open photo in the URL as `?photo=<id>`. */
  syncUrl?: boolean;
}
