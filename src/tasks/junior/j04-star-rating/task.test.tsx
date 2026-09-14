// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const StarRating = impl.default;

const star = (n: number) => screen.getByRole('radio', { name: n === 1 ? '1 star' : `${n} stars` });
const checkedCount = () => screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked || r.getAttribute('aria-checked') === 'true').length;

describeTask('StarRating', () => {
  it('renders a labelled radiogroup with max stars, none checked by default', () => {
    render(<StarRating />);
    expect(screen.getByRole('radiogroup', { name: 'Rating' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    for (let n = 1; n <= 5; n++) expect(star(n)).not.toBeChecked();
  });

  it('supports a custom max, label and defaultValue', () => {
    render(<StarRating max={10} defaultValue={7} label="Food" />);
    expect(screen.getByRole('radiogroup', { name: 'Food' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(star(7)).toBeChecked();
    expect(checkedCount()).toBe(1);
  });

  it('clicking a star selects it and calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating onChange={onChange} />);
    await user.click(star(4));
    expect(star(4)).toBeChecked();
    expect(checkedCount()).toBe(1);
    expect(onChange).toHaveBeenLastCalledWith(4);
    await user.click(star(2));
    expect(star(2)).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('clicking the current star clears the rating', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating defaultValue={3} onChange={onChange} />);
    await user.click(star(3));
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(checkedCount()).toBe(0);
  });

  it('hovering does not call onChange or change the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating defaultValue={2} onChange={onChange} />);
    await user.hover(star(5));
    await user.unhover(star(5));
    expect(onChange).not.toHaveBeenCalled();
    expect(star(2)).toBeChecked();
  });

  it('in controlled mode, reflects `value` and only reports changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<StarRating value={2} onChange={onChange} />);
    await user.click(star(5));
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(star(2)).toBeChecked();
    expect(star(5)).not.toBeChecked();
    rerender(<StarRating value={5} onChange={onChange} />);
    expect(star(5)).toBeChecked();
  });

  it('works with a parent that owns the state', async () => {
    const user = userEvent.setup();
    function Parent() {
      const [v, setV] = useState(1);
      return (
        <>
          <StarRating value={v} onChange={setV} />
          <output>value:{v}</output>
        </>
      );
    }
    render(<Parent />);
    await user.click(star(3));
    expect(screen.getByText('value:3')).toBeInTheDocument();
    expect(star(3)).toBeChecked();
  });

  it('arrow keys change the value and move focus', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating defaultValue={4} onChange={onChange} />);
    await user.click(star(3));
    expect(star(3)).toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(star(4)).toBeChecked();
    expect(star(4)).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith(4);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(star(2)).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('readOnly ignores clicks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={3} readOnly onChange={onChange} />);
    await user.click(star(5));
    await user.click(star(3));
    expect(onChange).not.toHaveBeenCalled();
    expect(star(3)).toBeChecked();
  });
});
