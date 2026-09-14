// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { DrawingCanvasProps, Point, Stroke } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const DrawingCanvas = impl.default;

const pointerMethods = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const;
const originals = new Map<string, PropertyDescriptor | undefined>();

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  for (const name of pointerMethods) {
    originals.set(name, Object.getOwnPropertyDescriptor(Element.prototype, name));
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      writable: true,
      value: name === 'hasPointerCapture' ? () => false : () => {},
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const name of pointerMethods) {
    const original = originals.get(name);
    if (original) Object.defineProperty(Element.prototype, name, original);
    else delete (Element.prototype as unknown as Record<string, unknown>)[name];
  }
});

function setup(props: Partial<DrawingCanvasProps> = {}) {
  const onChange: Mock<(strokes: Stroke[]) => void> = vi.fn();
  const user = userEvent.setup();
  render(<DrawingCanvas onChange={onChange} {...props} />);
  const canvas = screen.getByRole('img', { name: 'Drawing canvas' });
  const draw = (...points: [number, number][]) => {
    const [first, ...rest] = points;
    fireEvent.pointerDown(canvas, { clientX: first[0], clientY: first[1], button: 0, pointerId: 1 });
    for (const [x, y] of rest) fireEvent.pointerMove(canvas, { clientX: x, clientY: y, button: 0, pointerId: 1 });
    const last = points[points.length - 1];
    fireEvent.pointerUp(canvas, { clientX: last[0], clientY: last[1], button: 0, pointerId: 1 });
  };
  const latest = (): Stroke[] => onChange.mock.lastCall?.[0] ?? [];
  return { onChange, user, canvas, draw, latest };
}

const button = (name: 'Undo' | 'Redo' | 'Clear') => screen.getByRole('button', { name });
const pts = (...p: [number, number][]): Point[] => p.map(([x, y]) => ({ x, y }));

describeTask('DrawingCanvas', () => {
  it('renders the canvas and toolbar with Undo, Redo and Clear disabled, without calling onChange', () => {
    const { onChange } = setup();
    expect(button('Undo')).toBeDisabled();
    expect(button('Redo')).toBeDisabled();
    expect(button('Clear')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Black' })).toBeChecked();
    expect(screen.getByLabelText('Brush size')).toHaveValue('4');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits one stroke per gesture with its points, default colour and size', () => {
    const { draw, latest, onChange } = setup();
    draw([10, 10], [20, 15], [30, 20]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(latest()).toEqual([{ id: expect.any(String), color: '#111827', size: 4, points: pts([10, 10], [20, 15], [30, 20]) }]);
    expect(button('Undo')).toBeEnabled();
    expect(button('Clear')).toBeEnabled();
  });

  it('commits a single-point stroke for a tap and ignores moves with no stroke in progress', () => {
    const { draw, latest, canvas, onChange } = setup();
    fireEvent.pointerMove(canvas, { clientX: 5, clientY: 5, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
    draw([40, 50]);
    expect(latest()).toHaveLength(1);
    expect(latest()[0].points).toEqual(pts([40, 50]));
  });

  it('does not call onChange while a stroke is in progress', () => {
    const { canvas, onChange } = setup();
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1, button: 0, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 2, clientY: 2, button: 0, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(canvas, { clientX: 2, clientY: 2, button: 0, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('uses the selected colour and size for new strokes only', async () => {
    const { draw, latest, user } = setup();
    draw([0, 0], [1, 1]);
    await user.click(screen.getByRole('radio', { name: 'Red' }));
    await user.selectOptions(screen.getByLabelText('Brush size'), '16');
    draw([5, 5], [6, 6]);
    expect(latest().map(({ color, size }) => ({ color, size }))).toEqual([
      { color: '#111827', size: 4 },
      { color: '#dc2626', size: 16 },
    ]);
  });

  it('undoes and redoes strokes, updating disabled states', async () => {
    const { draw, latest, user } = setup();
    draw([0, 0], [1, 1]);
    draw([10, 10], [11, 11]);
    const [first, second] = latest();

    await user.click(button('Undo'));
    expect(latest()).toEqual([first]);
    expect(button('Redo')).toBeEnabled();

    await user.click(button('Undo'));
    expect(latest()).toEqual([]);
    expect(button('Undo')).toBeDisabled();
    expect(button('Clear')).toBeDisabled();

    await user.click(button('Redo'));
    await user.click(button('Redo'));
    expect(latest()).toEqual([first, second]);
    expect(button('Redo')).toBeDisabled();
  });

  it('discards the redo history when drawing after an undo', async () => {
    const { draw, latest, user } = setup();
    draw([0, 0]);
    draw([10, 10]);
    await user.click(button('Undo'));
    draw([20, 20]);
    expect(button('Redo')).toBeDisabled();
    expect(latest().map((s) => s.points[0])).toEqual(pts([0, 0], [20, 20]));
  });

  it('clears all strokes as a single undoable step', async () => {
    const { draw, latest, user } = setup();
    draw([0, 0], [1, 1]);
    draw([10, 10], [11, 11]);
    const before = latest();
    await user.click(button('Clear'));
    expect(latest()).toEqual([]);
    expect(button('Clear')).toBeDisabled();
    await user.click(button('Undo'));
    expect(latest()).toEqual(before);
    await user.click(button('Redo'));
    expect(latest()).toEqual([]);
  });

  it('supports Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z to redo', async () => {
    const { draw, latest, user } = setup();
    draw([0, 0]);
    draw([10, 10]);
    await user.keyboard('{Control>}z{/Control}');
    expect(latest()).toHaveLength(1);
    await user.keyboard('{Meta>}z{/Meta}');
    expect(latest()).toHaveLength(0);
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}');
    expect(latest()).toHaveLength(1);
    await user.keyboard('{Meta>}{Shift>}Z{/Shift}{/Meta}');
    expect(latest()).toHaveLength(2);
  });

  it('starts from initialStrokes, which cannot be undone', async () => {
    const initial: Stroke[] = [{ id: 'seed', color: '#2563eb', size: 8, points: pts([1, 2], [3, 4]) }];
    const { draw, latest, user } = setup({ initialStrokes: initial });
    expect(button('Undo')).toBeDisabled();
    expect(button('Clear')).toBeEnabled();
    draw([50, 50]);
    expect(latest()).toHaveLength(2);
    expect(latest()[0]).toEqual(initial[0]);
    await user.click(button('Undo'));
    expect(latest()).toEqual(initial);
    expect(button('Undo')).toBeDisabled();
  });

  it('renders colour radios from the colors prop and options from sizes', () => {
    setup({
      colors: [
        { label: 'Pink', value: '#ec4899' },
        { label: 'Teal', value: '#14b8a6' },
      ],
      sizes: [3, 6],
    });
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Pink' })).toBeChecked();
    expect(screen.getByLabelText('Brush size')).toHaveValue('6');
    expect(screen.getAllByRole('option').map((o) => (o as HTMLOptionElement).value)).toEqual(['3', '6']);
  });
});
