import type { ComponentType } from 'react';

export interface VideoPlayerProps {
  src: string;
  /** Names the player region, e.g. "Big Buck Bunny". */
  title: string;
  poster?: string;
}

export interface VideoPlayerModule {
  default: ComponentType<VideoPlayerProps>;
}
