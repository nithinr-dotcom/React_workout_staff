// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { MasonryItem, MasonryPosition, Photo } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Masonry = impl.default;

const item = (id: string, width: number, height: number): MasonryItem => ({ id, width, height });

function expectPosition(actual: MasonryPosition, expected: Omit<MasonryPosition, 'id'> & { id: string }) {
  expect(actual.id).toBe(expected.id);
  expect(actual.column).toBe(expected.column);
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.width).toBeCloseTo(expected.width);
  expect(actual.height).toBeCloseTo(expected.height);
}

describeTask('computeMasonry (pure)', () => {
  it('returns an empty array for no items', () => {
    expect(impl.computeMasonry([], 3, 100, 10)).toEqual([]);
  });

  it('stacks items in a single column, scaled to the column width, with gaps between them', () => {
    const result = impl.computeMasonry([item('a', 200, 100), item('b', 50, 100), item('c', 100, 100)], 1, 100, 10);
    expect(result).toHaveLength(3);
    expectPosition(result[0], { id: 'a', column: 0, x: 0, y: 0, width: 100, height: 50 });
    expectPosition(result[1], { id: 'b', column: 0, x: 0, y: 60, width: 100, height: 200 });
    expectPosition(result[2], { id: 'c', column: 0, x: 0, y: 270, width: 100, height: 100 });
  });

  it('places each item in the shortest column, leftmost on ties, with x including the gap', () => {
    const items = [
      item('a', 100, 150), // col 0 (all empty → leftmost)
      item('b', 100, 100), // col 1
      item('c', 100, 50), //  col 2
      item('d', 100, 100), // col 2 is shortest (50)
      item('e', 100, 30), //  col 1 is shortest (100 vs 150 vs 160)
      item('f', 100, 10), //  col 1 (140) vs col 0 (150) vs col 2 (160) → col 1
    ];
    const result = impl.computeMasonry(items, 3, 100, 10);
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expectPosition(result[0], { id: 'a', column: 0, x: 0, y: 0, width: 100, height: 150 });
    expectPosition(result[1], { id: 'b', column: 1, x: 110, y: 0, width: 100, height: 100 });
    expectPosition(result[2], { id: 'c', column: 2, x: 220, y: 0, width: 100, height: 50 });
    expectPosition(result[3], { id: 'd', column: 2, x: 220, y: 60, width: 100, height: 100 });
    expectPosition(result[4], { id: 'e', column: 1, x: 110, y: 110, width: 100, height: 30 });
    expectPosition(result[5], { id: 'f', column: 1, x: 110, y: 150, width: 100, height: 10 });
  });

  it('breaks ties between equally short columns to the left, and does not mutate the input', () => {
    const items = [item('a', 100, 100), item('b', 100, 100), item('c', 100, 100), item('d', 100, 100)];
    const copy = structuredClone(items);
    const result = impl.computeMasonry(items, 2, 100, 0);
    expect(result.map((p) => p.column)).toEqual([0, 1, 0, 1]);
    expect(result.map((p) => p.y)).toEqual([0, 0, 100, 100]);
    expect(items).toEqual(copy);
  });
});

// 632px wide, minColumnWidth 200, gap 16 → 3 columns of exactly 200px.
const PHOTOS: Photo[] = [
  { id: 'a', width: 400, height: 300, src: 'a.jpg', alt: 'Lake' }, //     col 0, h 150
  { id: 'b', width: 400, height: 400, src: 'b.jpg', alt: 'Forest' }, //   col 1, h 200
  { id: 'c', width: 400, height: 200, src: 'c.jpg', alt: 'Desert' }, //   col 2, h 100
  { id: 'd', width: 400, height: 400, src: 'd.jpg', alt: 'Mountain' }, // col 2, y 116, h 200
  { id: 'e', width: 400, height: 200, src: 'e.jpg', alt: 'Beach' }, //    col 0, y 166, h 100
];

const list = (name = 'Photos') => screen.getByRole('list', { name });
const cardFor = (alt: string) => screen.getByRole('img', { name: alt }).closest('li, [role="listitem"]') as HTMLElement;

type ROCallback = (entries: { contentRect: { width: number }; target: Element }[]) => void;
type IOCallback = (entries: { isIntersecting: boolean; target: Element }[]) => void;

let resizeObservers: { callback: ROCallback; targets: Set<Element> }[] = [];
let intersectionObservers: { callback: IOCallback; targets: Set<Element> }[] = [];

// The shared test setup defines no-op observers as writable globals; swap in fakes and put the originals back after each test.
const OriginalResizeObserver = globalThis.ResizeObserver;
const OriginalIntersectionObserver = globalThis.IntersectionObserver;

beforeEach(() => {
  resizeObservers = [];
  intersectionObservers = [];
  globalThis.ResizeObserver = class {
      targets = new Set<Element>();
      constructor(callback: ROCallback) {
        resizeObservers.push({ callback, targets: this.targets });
      }
      observe(el: Element) {
        this.targets.add(el);
      }
      unobserve(el: Element) {
        this.targets.delete(el);
      }
      disconnect() {
        this.targets.clear();
      }
    } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = class {
      targets = new Set<Element>();
      constructor(callback: IOCallback) {
        intersectionObservers.push({ callback, targets: this.targets });
      }
      observe(el: Element) {
        this.targets.add(el);
      }
      unobserve(el: Element) {
        this.targets.delete(el);
      }
      disconnect() {
        this.targets.clear();
      }
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalResizeObserver;
  globalThis.IntersectionObserver = OriginalIntersectionObserver;
});

function resizeTo(width: number) {
  act(() => {
    for (const ro of resizeObservers) {
      if (ro.targets.size === 0) continue;
      ro.callback([...ro.targets].map((target) => ({ contentRect: { width }, target })));
    }
  });
}

function scrollSentinelIntoView() {
  act(() => {
    for (const io of intersectionObservers) {
      if (io.targets.size === 0) continue;
      io.callback([...io.targets].map((target) => ({ isIntersecting: true, target })));
    }
  });
}

describeTask('Masonry (component)', () => {
  it('renders a labelled list of photos in input order', () => {
    render(<Masonry items={PHOTOS} minColumnWidth={200} width={632} />);
    const items = within(list()).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items.map((li) => within(li).getByRole('img').getAttribute('alt'))).toEqual([
      'Lake',
      'Forest',
      'Desert',
      'Mountain',
      'Beach',
    ]);
    expect(screen.getByRole('img', { name: 'Lake' })).toHaveAttribute('src', 'a.jpg');
  });

  it('derives the column count from the width and positions items shortest-column-first', () => {
    render(<Masonry items={PHOTOS} minColumnWidth={200} width={632} gap={16} />);
    expect(cardFor('Lake')).toHaveStyle({ position: 'absolute', left: '0px', top: '0px', width: '200px', height: '150px' });
    expect(cardFor('Forest')).toHaveStyle({ left: '216px', top: '0px', width: '200px', height: '200px' });
    expect(cardFor('Desert')).toHaveStyle({ left: '432px', top: '0px', height: '100px' });
    expect(cardFor('Mountain')).toHaveStyle({ left: '432px', top: '116px', height: '200px' });
    expect(cardFor('Beach')).toHaveStyle({ left: '0px', top: '166px', height: '100px' });
    // Tallest column: Desert + gap + Mountain = 316px.
    expect(list()).toHaveStyle({ height: '316px' });
  });

  it('uses one full-width column when the container is narrower than minColumnWidth', () => {
    render(<Masonry items={PHOTOS.slice(0, 2)} minColumnWidth={200} width={150} gap={16} />);
    expect(cardFor('Lake')).toHaveStyle({ left: '0px', top: '0px', width: '150px', height: '112.5px' });
    expect(cardFor('Forest')).toHaveStyle({ left: '0px', top: '128.5px', width: '150px', height: '150px' });
  });

  it('lets the columns prop override the derived column count', () => {
    render(<Masonry items={PHOTOS.slice(0, 2)} minColumnWidth={200} columns={2} width={632} gap={32} />);
    // (632 - 32) / 2 = 300px columns.
    expect(cardFor('Lake')).toHaveStyle({ left: '0px', top: '0px', width: '300px', height: '225px' });
    expect(cardFor('Forest')).toHaveStyle({ left: '332px', top: '0px', width: '300px', height: '300px' });
  });

  it('measures the container with ResizeObserver when no width is passed, and re-lays out on resize', () => {
    render(<Masonry items={PHOTOS} minColumnWidth={200} gap={16} />);
    resizeTo(632);
    expect(cardFor('Mountain')).toHaveStyle({ left: '432px', top: '116px', width: '200px' });

    // 416px → 2 columns of 200px. DOM order is unchanged.
    resizeTo(416);
    expect(cardFor('Lake')).toHaveStyle({ left: '0px', top: '0px', width: '200px' });
    expect(cardFor('Forest')).toHaveStyle({ left: '216px', top: '0px' });
    expect(cardFor('Desert')).toHaveStyle({ left: '0px', top: '166px' });
    expect(within(list()).getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      'Lake',
      'Forest',
      'Desert',
      'Mountain',
      'Beach',
    ]);
  });

  it('calls onLoadMore once when the sentinel is visible, and again only after items grow', () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <Masonry items={PHOTOS.slice(0, 3)} minColumnWidth={200} width={632} hasMore onLoadMore={onLoadMore} />,
    );
    scrollSentinelIntoView();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    scrollSentinelIntoView();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<Masonry items={PHOTOS} minColumnWidth={200} width={632} hasMore onLoadMore={onLoadMore} />);
    scrollSentinelIntoView();
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('does not call onLoadMore when hasMore is false, and handles an empty list', () => {
    const onLoadMore = vi.fn();
    render(<Masonry items={[]} minColumnWidth={200} width={632} hasMore={false} onLoadMore={onLoadMore} />);
    scrollSentinelIntoView();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(within(list()).queryAllByRole('listitem')).toHaveLength(0);
  });
});
