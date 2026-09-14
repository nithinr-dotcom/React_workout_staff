// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const MortgageCalculator = impl.default;

const AMOUNT_ERROR = 'Enter a loan amount greater than 0';
const RATE_ERROR = 'Enter an interest rate between 0 and 100';
const TERM_ERROR = 'Enter a loan term between 1 and 50 years';

const amount = () => screen.getByLabelText('Loan amount');
const rate = () => screen.getByLabelText('Annual interest rate (%)');
const term = () => screen.getByLabelText('Loan term (years)');
const calculate = () => screen.getByRole('button', { name: 'Calculate' });

async function fill(user: ReturnType<typeof userEvent.setup>, values: { amount?: string; rate?: string; term?: string }) {
  for (const [get, value] of [
    [amount, values.amount],
    [rate, values.rate],
    [term, values.term],
  ] as const) {
    if (value === undefined) continue;
    await user.clear(get());
    if (value !== '') await user.type(get(), value);
  }
}

describeTask('MortgageCalculator', () => {
  it('renders prefilled labelled inputs and no results yet', () => {
    render(<MortgageCalculator />);
    expect(String((amount() as HTMLInputElement).value)).toBe('300000');
    expect(String((rate() as HTMLInputElement).value)).toBe('5');
    expect(String((term() as HTMLInputElement).value)).toBe('30');
    expect(calculate()).toBeInTheDocument();
    expect(screen.queryByText('$1,610.46')).not.toBeInTheDocument();
  });

  it('calculates monthly payment, total payment and total interest', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await user.click(calculate());
    expect(screen.getByText('$1,610.46')).toBeInTheDocument();
    expect(screen.getByText('$579,767.35')).toBeInTheDocument();
    expect(screen.getByText('$279,767.35')).toBeInTheDocument();
  });

  it('recalculates with new values', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await fill(user, { amount: '250000', rate: '6.5', term: '15' });
    await user.click(calculate());
    expect(screen.getByText('$2,177.77')).toBeInTheDocument();
    expect(screen.getByText('$391,998.31')).toBeInTheDocument();
    expect(screen.getByText('$141,998.31')).toBeInTheDocument();
  });

  it('handles a 0% interest rate', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await fill(user, { amount: '120000', rate: '0', term: '10' });
    await user.click(calculate());
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('submits when Enter is pressed in a field', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await user.click(term());
    await user.keyboard('{Enter}');
    expect(screen.getByText('$1,610.46')).toBeInTheDocument();
  });

  it('shows a linked error for an empty loan amount and hides results', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await user.click(calculate());
    expect(screen.getByText('$1,610.46')).toBeInTheDocument();

    await fill(user, { amount: '' });
    await user.click(calculate());
    expect(amount()).toHaveAttribute('aria-invalid', 'true');
    expect(amount()).toHaveAccessibleDescription(new RegExp(AMOUNT_ERROR));
    expect(screen.queryByText('$1,610.46')).not.toBeInTheDocument();
  });

  it('rejects out-of-range rate and term, showing every error at once', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await fill(user, { rate: '150', term: '0' });
    await user.click(calculate());
    expect(rate()).toHaveAttribute('aria-invalid', 'true');
    expect(rate()).toHaveAccessibleDescription(new RegExp(RATE_ERROR));
    expect(term()).toHaveAttribute('aria-invalid', 'true');
    expect(term()).toHaveAccessibleDescription(new RegExp(TERM_ERROR));
    expect(amount()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a negative amount and a term above 50', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await fill(user, { amount: '-5', term: '51' });
    await user.click(calculate());
    expect(screen.getByText(AMOUNT_ERROR)).toBeInTheDocument();
    expect(screen.getByText(TERM_ERROR)).toBeInTheDocument();
  });

  it('moves focus to the first invalid field', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await fill(user, { rate: '', term: '' });
    await user.click(calculate());
    expect(rate()).toHaveFocus();
  });

  it('clears errors once inputs are fixed', async () => {
    const user = userEvent.setup();
    render(<MortgageCalculator />);
    await fill(user, { amount: '0' });
    await user.click(calculate());
    expect(screen.getByText(AMOUNT_ERROR)).toBeInTheDocument();
    await fill(user, { amount: '300000' });
    await user.click(calculate());
    expect(screen.queryByText(AMOUNT_ERROR)).not.toBeInTheDocument();
    expect(amount()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('$1,610.46')).toBeInTheDocument();
  });
});
