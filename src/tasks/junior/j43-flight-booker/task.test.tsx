// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const FlightBooker = impl.default;

const TODAY = '2026-09-14';

afterEach(() => {
  vi.useRealTimers();
});

function setup(today: string | undefined = TODAY) {
  const user = userEvent.setup();
  render(<FlightBooker today={today} />);
  return { user };
}

const flightType = () => screen.getByRole('combobox', { name: 'Flight type' });
const departure = () => screen.getByLabelText('Departure date');
const returnDate = () => screen.getByLabelText('Return date');
const book = () => screen.getByRole('button', { name: 'Book' });
const setDate = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function expectError(input: HTMLElement, message: string) {
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(new RegExp(escape(message)));
}

describeTask('FlightBooker', () => {
  it('starts as a one-way flight on today with the return date disabled', () => {
    setup();
    expect((screen.getByRole('option', { name: 'One-way flight' }) as HTMLOptionElement).selected).toBe(true);
    expect(screen.getByRole('option', { name: 'Return flight' })).toBeInTheDocument();
    expect(departure()).toHaveValue(TODAY);
    expect(returnDate()).toHaveValue(TODAY);
    expect(returnDate()).toBeDisabled();
    expect(book()).toBeEnabled();
    expect(departure()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('enables the return date for a return flight', async () => {
    const { user } = setup();
    await user.selectOptions(flightType(), 'Return flight');
    expect(returnDate()).toBeEnabled();
    await user.selectOptions(flightType(), 'One-way flight');
    expect(returnDate()).toBeDisabled();
  });

  it('books a one-way flight', async () => {
    const { user } = setup();
    setDate(departure(), '2026-09-20');
    await user.click(book());
    expect(screen.getByText('You have booked a one-way flight on 2026-09-20.')).toBeInTheDocument();
  });

  it('books a return flight, allowing the same day for both dates', async () => {
    const { user } = setup();
    await user.selectOptions(flightType(), 'Return flight');
    setDate(departure(), '2026-09-20');
    setDate(returnDate(), '2026-09-20');
    expect(book()).toBeEnabled();
    setDate(returnDate(), '2026-09-25');
    await user.click(book());
    expect(
      screen.getByText('You have booked a return flight departing on 2026-09-20 and returning on 2026-09-25.'),
    ).toBeInTheDocument();
  });

  it('rejects a return date before the departure date', async () => {
    const { user } = setup();
    await user.selectOptions(flightType(), 'Return flight');
    setDate(returnDate(), '2026-09-20');
    setDate(departure(), '2026-09-21');
    expectError(returnDate(), 'Return date cannot be before departure date');
    expect(departure()).not.toHaveAttribute('aria-invalid', 'true');
    expect(book()).toBeDisabled();

    setDate(returnDate(), '2026-10-01');
    expect(screen.queryByText('Return date cannot be before departure date')).not.toBeInTheDocument();
    expect(returnDate()).not.toHaveAttribute('aria-invalid', 'true');
    expect(book()).toBeEnabled();
  });

  it('rejects a departure date in the past, across a month boundary', () => {
    setup();
    setDate(departure(), '2026-08-31');
    expectError(departure(), 'Departure date cannot be in the past');
    expect(book()).toBeDisabled();
    setDate(departure(), '2027-01-01');
    expect(screen.queryByText('Departure date cannot be in the past')).not.toBeInTheDocument();
    expect(book()).toBeEnabled();
  });

  it('requires dates that are filled in', async () => {
    const { user } = setup();
    setDate(departure(), '');
    expectError(departure(), 'Enter a departure date');
    expect(book()).toBeDisabled();
    setDate(departure(), TODAY);
    await user.selectOptions(flightType(), 'Return flight');
    setDate(returnDate(), '');
    expectError(returnDate(), 'Enter a return date');
    expect(book()).toBeDisabled();
  });

  it('ignores the return date for one-way flights', async () => {
    const { user } = setup();
    await user.selectOptions(flightType(), 'Return flight');
    setDate(departure(), '2026-09-21');
    expect(screen.getByText('Return date cannot be before departure date')).toBeInTheDocument();
    await user.selectOptions(flightType(), 'One-way flight');
    expect(screen.queryByText('Return date cannot be before departure date')).not.toBeInTheDocument();
    expect(book()).toBeEnabled();
    expect(returnDate()).toHaveValue(TODAY);
  });

  it('hides the confirmation when a field changes', async () => {
    const { user } = setup();
    await user.click(book());
    expect(screen.getByText(`You have booked a one-way flight on ${TODAY}.`)).toBeInTheDocument();
    setDate(departure(), '2026-09-15');
    expect(screen.queryByText(/You have booked/)).not.toBeInTheDocument();
  });

  it('defaults today to the local date, not the UTC date', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    for (const [h, m, expected] of [
      [0, 30, '2026-03-05'],
      [23, 30, '2026-03-05'],
    ] as const) {
      vi.setSystemTime(new Date(2026, 2, 5, h, m));
      const { unmount } = render(<FlightBooker />);
      expect(departure()).toHaveValue(expected);
      setDate(departure(), '2026-03-04');
      expect(screen.getByText('Departure date cannot be in the past')).toBeInTheDocument();
      unmount();
    }
  });
});
