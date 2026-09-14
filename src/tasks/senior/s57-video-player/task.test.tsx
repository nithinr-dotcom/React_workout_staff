// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const VideoPlayer = impl.default;

/* ------------------------------------------------------------------------------------------------
 * Fake media layer. jsdom has no playback, so we emulate the parts of HTMLMediaElement the player
 * uses: play/pause, currentTime, duration, volume, muted, playbackRate, buffered, and their events.
 * ---------------------------------------------------------------------------------------------- */

interface MediaState {
  paused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  buffered: [number, number][];
}

const media = new WeakMap<HTMLMediaElement, MediaState>();
const stateOf = (el: HTMLMediaElement): MediaState => {
  let s = media.get(el);
  if (!s) {
    s = { paused: true, currentTime: 0, duration: NaN, volume: 1, muted: false, playbackRate: 1, buffered: [] };
    media.set(el, s);
  }
  return s;
};

const PROPS = ['paused', 'currentTime', 'duration', 'volume', 'muted', 'playbackRate', 'buffered', 'play', 'pause'] as const;
const originalMedia = new Map<string, PropertyDescriptor | undefined>();
const originalRequestFullscreen = Object.getOwnPropertyDescriptor(Element.prototype, 'requestFullscreen');
const originalExitFullscreen = Object.getOwnPropertyDescriptor(Document.prototype, 'exitFullscreen');
const originalFullscreenElement = Object.getOwnPropertyDescriptor(Document.prototype, 'fullscreenElement');

let playSpy: ReturnType<typeof vi.fn>;
let pauseSpy: ReturnType<typeof vi.fn>;
let requestFullscreenSpy: ReturnType<typeof vi.fn>;
let exitFullscreenSpy: ReturnType<typeof vi.fn>;
let fullscreenElement: Element | null = null;

function installFakes() {
  const proto = HTMLMediaElement.prototype;
  for (const p of PROPS) originalMedia.set(p, Object.getOwnPropertyDescriptor(proto, p));

  const accessor = (name: keyof MediaState, event?: string) => ({
    configurable: true,
    get(this: HTMLMediaElement) {
      return stateOf(this)[name];
    },
    set(this: HTMLMediaElement, value: never) {
      (stateOf(this) as unknown as Record<string, unknown>)[name] = value;
      if (event) this.dispatchEvent(new Event(event));
    },
  });

  Object.defineProperty(proto, 'paused', { configurable: true, get: accessor('paused').get });
  Object.defineProperty(proto, 'duration', { configurable: true, get: accessor('duration').get });
  Object.defineProperty(proto, 'currentTime', accessor('currentTime', 'timeupdate'));
  Object.defineProperty(proto, 'volume', accessor('volume', 'volumechange'));
  Object.defineProperty(proto, 'muted', accessor('muted', 'volumechange'));
  Object.defineProperty(proto, 'playbackRate', accessor('playbackRate', 'ratechange'));
  Object.defineProperty(proto, 'buffered', {
    configurable: true,
    get(this: HTMLMediaElement) {
      const ranges = stateOf(this).buffered;
      return { length: ranges.length, start: (i: number) => ranges[i][0], end: (i: number) => ranges[i][1] };
    },
  });

  playSpy = vi.fn(function (this: HTMLMediaElement) {
    const s = stateOf(this);
    if (s.paused) {
      s.paused = false;
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    }
    return Promise.resolve();
  });
  pauseSpy = vi.fn(function (this: HTMLMediaElement) {
    const s = stateOf(this);
    if (!s.paused) {
      s.paused = true;
      this.dispatchEvent(new Event('pause'));
    }
  });
  Object.defineProperty(proto, 'play', { configurable: true, writable: true, value: playSpy });
  Object.defineProperty(proto, 'pause', { configurable: true, writable: true, value: pauseSpy });

  fullscreenElement = null;
  requestFullscreenSpy = vi.fn(function (this: Element) {
    fullscreenElement = this;
    this.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
    return Promise.resolve();
  });
  exitFullscreenSpy = vi.fn(() => {
    const previous = fullscreenElement;
    fullscreenElement = null;
    (previous ?? document).dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
    return Promise.resolve();
  });
  Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, writable: true, value: requestFullscreenSpy });
  Object.defineProperty(Document.prototype, 'exitFullscreen', { configurable: true, writable: true, value: exitFullscreenSpy });
  Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
}

function restore(target: object, name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else delete (target as Record<string, unknown>)[name];
}

beforeEach(installFakes);
afterEach(() => {
  for (const p of PROPS) restore(HTMLMediaElement.prototype, p, originalMedia.get(p));
  restore(Element.prototype, 'requestFullscreen', originalRequestFullscreen);
  restore(Document.prototype, 'exitFullscreen', originalExitFullscreen);
  restore(Document.prototype, 'fullscreenElement', originalFullscreenElement);
});

/* ---------------------------------------------------------------------------------------------- */

const TITLE = 'Big Buck Bunny';

function setup() {
  const user = vi.isFakeTimers() ? userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) : userEvent.setup();
  render(<VideoPlayer src="bunny.mp4" title={TITLE} poster="bunny.jpg" />);
  const region = screen.getByRole('region', { name: TITLE });
  const video = region.querySelector('video');
  if (!video) throw new Error('expected a <video> inside the player region');
  return { user, region, video };
}

/** Simulate the browser loading metadata. */
function loadMetadata(video: HTMLVideoElement, duration: number) {
  act(() => {
    stateOf(video).duration = duration;
    video.dispatchEvent(new Event('loadedmetadata'));
    video.dispatchEvent(new Event('durationchange'));
  });
}

/** Simulate playback progressing to `seconds`. */
function playheadTo(video: HTMLVideoElement, seconds: number) {
  act(() => {
    video.currentTime = seconds;
  });
}

const button = (name: string) => screen.getByRole('button', { name });
const controls = () => screen.getByRole('group', { name: 'Video controls', hidden: true });

describeTask('VideoPlayer', () => {
  it('renders a named region with the video and all controls', () => {
    const { video } = setup();
    expect(video).toHaveAttribute('src', 'bunny.mp4');
    expect(video).toHaveAttribute('poster', 'bunny.jpg');
    expect(video).not.toHaveAttribute('controls');
    expect(controls()).toBeVisible();
    expect(button('Play')).toBeInTheDocument();
    expect(button('Mute')).toBeInTheDocument();
    expect(button('Enter full screen')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Seek' })).toHaveAttribute('aria-valuetext', '0:00 of 0:00');
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Buffered' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Playback speed' })).toHaveValue('1');
  });

  it('plays and pauses, and follows pauses it did not cause', async () => {
    const { user, video } = setup();
    await user.click(button('Play'));
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(button('Pause')).toBeInTheDocument();

    await user.click(button('Pause'));
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(button('Play')).toBeInTheDocument();

    await user.click(button('Play'));
    // The video pauses by itself (e.g. it ended or a headset was unplugged).
    act(() => {
      video.pause();
    });
    expect(button('Play')).toBeInTheDocument();
  });

  it('shows time on the seek slider and seeks when the slider changes', () => {
    const { video } = setup();
    loadMetadata(video, 200);
    playheadTo(video, 65);
    const seek = screen.getByRole('slider', { name: 'Seek' });
    expect(seek).toHaveAttribute('aria-valuetext', '1:05 of 3:20');
    expect(seek).toHaveAttribute('max', '200');

    fireEvent.change(seek, { target: { value: '120' } });
    expect(video.currentTime).toBe(120);
    expect(seek).toHaveAttribute('aria-valuetext', '2:00 of 3:20');
  });

  it('formats long durations as h:mm:ss', () => {
    const { video } = setup();
    loadMetadata(video, 3725);
    playheadTo(video, 62);
    expect(screen.getByRole('slider', { name: 'Seek' })).toHaveAttribute('aria-valuetext', '1:02 of 1:02:05');
  });

  it('shows the buffered amount as a percentage', () => {
    const { video } = setup();
    loadMetadata(video, 200);
    act(() => {
      stateOf(video).buffered = [[0, 50]];
      video.dispatchEvent(new Event('progress'));
    });
    expect(screen.getByRole('progressbar', { name: 'Buffered' })).toHaveAttribute('aria-valuenow', '25');
  });

  it('mutes, unmutes and sets the volume', async () => {
    const { user, video } = setup();
    await user.click(button('Mute'));
    expect(video.muted).toBe(true);
    expect(button('Unmute')).toBeInTheDocument();
    await user.click(button('Unmute'));
    expect(video.muted).toBe(false);
    expect(button('Mute')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '30' } });
    expect(video.volume).toBeCloseTo(0.3);
  });

  it('changes the playback speed', async () => {
    const { user, video } = setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Playback speed' }), '1.5');
    expect(video.playbackRate).toBe(1.5);
    expect(screen.getByRole('combobox', { name: 'Playback speed' })).toHaveValue('1.5');
  });

  it('enters and exits full screen on the player region', async () => {
    const { user, region } = setup();
    await user.click(button('Enter full screen'));
    expect(requestFullscreenSpy).toHaveBeenCalledTimes(1);
    expect(requestFullscreenSpy.mock.contexts[0]).toBe(region);
    expect(button('Exit full screen')).toBeInTheDocument();

    await user.click(button('Exit full screen'));
    expect(exitFullscreenSpy).toHaveBeenCalledTimes(1);
    expect(button('Enter full screen')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts while the player has focus', async () => {
    const { user, region, video } = setup();
    loadMetadata(video, 200);
    playheadTo(video, 50);
    region.focus();

    await user.keyboard('k');
    expect(playSpy).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    await user.keyboard('l');
    expect(video.currentTime).toBe(60);
    await user.keyboard('j');
    expect(video.currentTime).toBe(50);
    await user.keyboard('{ArrowRight}');
    expect(video.currentTime).toBe(55);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(video.currentTime).toBe(45);

    playheadTo(video, 3);
    await user.keyboard('j');
    expect(video.currentTime).toBe(0);
    playheadTo(video, 195);
    await user.keyboard('l');
    expect(video.currentTime).toBe(200);

    await user.keyboard('m');
    expect(video.muted).toBe(true);
    await user.keyboard('f');
    expect(requestFullscreenSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts when focus is outside the player', async () => {
    const { user, video } = setup();
    loadMetadata(video, 200);
    document.body.focus();
    await user.keyboard('k l m');
    expect(playSpy).not.toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
    expect(video.muted).toBe(false);
  });

  it('auto-hides the controls after 3s of inactivity while playing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user, region } = setup();
    await user.click(button('Play'));
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(controls()).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(controls()).not.toBeVisible();

    fireEvent.pointerMove(region);
    fireEvent.mouseMove(region);
    expect(controls()).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(controls()).not.toBeVisible();

    // Pausing always shows the controls, and they stay visible.
    act(() => {
      (region.querySelector('video') as HTMLVideoElement).pause();
    });
    expect(controls()).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(controls()).toBeVisible();
  });
});
