// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { CarouselImage } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const ImageCarousel = impl.default;

const images: CarouselImage[] = [
  { src: '/a.jpg', alt: 'Alpine lake' },
  { src: '/b.jpg', alt: 'Beach at sunset' },
  { src: '/c.jpg', alt: 'City skyline' },
];

const showing = (alt: string) => screen.queryByRole('img', { name: alt }) !== null;
const expectOnly = (index: number) => {
  images.forEach((img, i) => expect(showing(img.alt)).toBe(i === index));
  expect(screen.getByText(`Slide ${index + 1} of ${images.length}`)).toBeInTheDocument();
};
const next = () => screen.getByRole('button', { name: 'Next slide' });
const prev = () => screen.getByRole('button', { name: 'Previous slide' });

function fakeTimersUser() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describeTask('ImageCarousel', () => {
  it('renders a labelled carousel region showing only the first slide', () => {
    render(<ImageCarousel images={images} />);
    const region = screen.getByRole('region', { name: 'Image carousel' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expectOnly(0);
  });

  it('uses a custom label', () => {
    render(<ImageCarousel images={images} label="Offers" />);
    expect(screen.getByRole('region', { name: 'Offers' })).toBeInTheDocument();
  });

  it('Next and Previous change slides and wrap around', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={images} />);
    await user.click(next());
    expectOnly(1);
    await user.click(next());
    await user.click(next());
    expectOnly(0);
    await user.click(prev());
    expectOnly(2);
  });

  it('dots jump to a slide and mark the active one', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={images} />);
    expect(screen.getByRole('button', { name: 'Go to slide 1' })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: 'Go to slide 3' }));
    expectOnly(2);
    expect(screen.getByRole('button', { name: 'Go to slide 3' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Go to slide 1' })).not.toHaveAttribute('aria-current', 'true');
  });

  it('ArrowRight / ArrowLeft navigate while focus is inside the carousel', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={images} />);
    act(() => screen.getByRole('button', { name: 'Go to slide 1' }).focus());
    await user.keyboard('{ArrowRight}');
    expectOnly(1);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expectOnly(2);
  });

  it('does not autoplay without autoPlayInterval', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ImageCarousel images={images} />);
    act(() => vi.advanceTimersByTime(10_000));
    expectOnly(0);
  });

  it('autoplays every interval and wraps', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ImageCarousel images={images} autoPlayInterval={3000} />);
    expectOnly(0);
    act(() => vi.advanceTimersByTime(3000));
    expectOnly(1);
    act(() => vi.advanceTimersByTime(3000));
    expectOnly(2);
    act(() => vi.advanceTimersByTime(3000));
    expectOnly(0);
  });

  it('pauses autoplay while hovered and resumes after', async () => {
    const user = fakeTimersUser();
    render(<ImageCarousel images={images} autoPlayInterval={3000} />);
    const current = screen.getByRole('img', { name: 'Alpine lake' });
    await user.hover(current);
    act(() => vi.advanceTimersByTime(10_000));
    expectOnly(0);
    await user.unhover(current);
    act(() => vi.advanceTimersByTime(3000));
    expectOnly(1);
  });

  it('pauses autoplay while focus is inside and resumes on blur', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ImageCarousel images={images} autoPlayInterval={3000} />);
    const dot = screen.getByRole('button', { name: 'Go to slide 1' });
    act(() => dot.focus());
    act(() => vi.advanceTimersByTime(10_000));
    expectOnly(0);
    act(() => dot.blur());
    act(() => vi.advanceTimersByTime(3000));
    expectOnly(1);
  });

  it('renders "No images" for an empty list', () => {
    render(<ImageCarousel images={[]} />);
    expect(screen.getByText('No images')).toBeInTheDocument();
  });
});
