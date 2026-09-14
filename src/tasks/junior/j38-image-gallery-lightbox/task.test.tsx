// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { GalleryImage, ImageGalleryProps } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const ImageGallery = impl.default;

const IMAGES: GalleryImage[] = [
  { id: 'fort', src: '/img/fort.jpg', thumbSrc: '/img/fort-thumb.jpg', alt: 'Amber Fort at sunrise', caption: 'Jaipur, day 1' },
  { id: 'lake', src: '/img/lake.jpg', alt: 'Boats on Lake Pichola' },
  { id: 'dunes', src: '/img/dunes.jpg', alt: 'Camels crossing the Thar dunes', caption: 'Jaisalmer' },
  { id: 'market', src: '/img/market.jpg', alt: 'Spice market in Jodhpur' },
];

function setup(props: Partial<ImageGalleryProps> = {}) {
  const user = userEvent.setup();
  render(<ImageGallery images={IMAGES} {...props} />);
  return { user };
}

const thumb = (alt: string) => screen.getByRole('button', { name: alt });
const dialog = () => screen.getByRole('dialog', { name: 'Photo viewer' });
const expectShowing = (index: number) => {
  const image = IMAGES[index];
  expect(within(dialog()).getByRole('img', { name: image.alt })).toHaveAttribute('src', image.src);
  expect(within(dialog()).getByText(`${index + 1} / ${IMAGES.length}`)).toBeInTheDocument();
};

describeTask('Image Gallery with Lightbox', () => {
  it('renders a labelled list of thumbnail buttons named by alt text', () => {
    setup();
    const list = screen.getByRole('list', { name: 'Photo gallery' });
    for (const image of IMAGES) {
      expect(within(list).getByRole('button', { name: image.alt })).toBeInTheDocument();
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders "No photos" for an empty gallery', () => {
    render(<ImageGallery images={[]} />);
    expect(screen.getByText('No photos')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('opens a modal dialog on the clicked photo with image, caption and counter', async () => {
    const { user } = setup();
    await user.click(thumb('Camels crossing the Thar dunes'));
    expect(dialog()).toHaveAttribute('aria-modal', 'true');
    expectShowing(2);
    expect(within(dialog()).getByText('Jaisalmer')).toBeInTheDocument();
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);
  });

  it('moves with Next/Previous buttons and wraps at both ends', async () => {
    const { user } = setup();
    await user.click(thumb('Spice market in Jodhpur'));
    expectShowing(3);
    await user.click(within(dialog()).getByRole('button', { name: 'Next photo' }));
    expectShowing(0);
    await user.click(within(dialog()).getByRole('button', { name: 'Previous photo' }));
    expectShowing(3);
    await user.click(within(dialog()).getByRole('button', { name: 'Previous photo' }));
    expectShowing(2);
  });

  it('navigates with ArrowRight / ArrowLeft, wrapping', async () => {
    const { user } = setup();
    await user.click(thumb('Amber Fort at sunrise'));
    expectShowing(0);
    await user.keyboard('{ArrowLeft}');
    expectShowing(3);
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expectShowing(1);
  });

  it('closes on Escape and focuses the thumbnail of the photo last shown', async () => {
    const { user } = setup();
    await user.click(thumb('Boats on Lake Pichola'));
    await user.keyboard('{ArrowRight}');
    expectShowing(2);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(thumb('Camels crossing the Thar dunes')).toHaveFocus();
  });

  it('closes with the Close button and restores focus to the opening thumbnail', async () => {
    const { user } = setup();
    await user.click(thumb('Spice market in Jodhpur'));
    await user.click(within(dialog()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(thumb('Spice market in Jodhpur')).toHaveFocus();
  });

  it('opens from the keyboard and traps Tab / Shift+Tab inside the dialog', async () => {
    const { user } = setup();
    thumb('Amber Fort at sunrise').focus();
    await user.keyboard('{Enter}');
    const d = dialog();
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(d).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(d).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('hides Previous/Next for a single photo and ignores arrow keys', async () => {
    const user = userEvent.setup();
    render(<ImageGallery images={[IMAGES[1]]} />);
    await user.click(thumb('Boats on Lake Pichola'));
    expect(within(dialog()).queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: 'Previous photo' })).not.toBeInTheDocument();
    expect(within(dialog()).getByText('1 / 1')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(within(dialog()).getByRole('img', { name: 'Boats on Lake Pichola' })).toBeInTheDocument();
    expect(within(dialog()).getByText('1 / 1')).toBeInTheDocument();
  });

  it('uses a custom label for the list', () => {
    setup({ label: 'Rajasthan trip' });
    expect(screen.getByRole('list', { name: 'Rajasthan trip' })).toBeInTheDocument();
  });
});

describeFollowUp(3, 'deep link via ?photo=', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/blog/rajasthan?tab=photos');
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });
  const photoParam = () => new URLSearchParams(window.location.search).get('photo');

  it('writes the open photo to the URL, keeps other params, and removes it on close', async () => {
    const { user } = setup({ syncUrl: true });
    await user.click(thumb('Boats on Lake Pichola'));
    await waitFor(() => expect(photoParam()).toBe('lake'));
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('photos');

    await user.click(within(dialog()).getByRole('button', { name: 'Next photo' }));
    await waitFor(() => expect(photoParam()).toBe('dunes'));

    await user.click(within(dialog()).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(photoParam()).toBeNull());
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('photos');
  });

  it('opens on the photo from the URL at mount and ignores unknown ids', async () => {
    window.history.replaceState(null, '', '/blog/rajasthan?photo=market');
    const { unmount } = render(<ImageGallery images={IMAGES} syncUrl />);
    await waitFor(() => expectShowing(3));
    unmount();

    window.history.replaceState(null, '', '/blog/rajasthan?photo=nope');
    render(<ImageGallery images={IMAGES} syncUrl />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
