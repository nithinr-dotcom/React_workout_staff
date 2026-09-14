export interface CarouselImage {
  src: string;
  alt: string;
}

export interface ImageCarouselProps {
  images: CarouselImage[];
  /** Milliseconds between automatic advances. 0 or undefined turns autoplay off. */
  autoPlayInterval?: number;
  /** Accessible name of the carousel region. Default "Image carousel". */
  label?: string;
}
