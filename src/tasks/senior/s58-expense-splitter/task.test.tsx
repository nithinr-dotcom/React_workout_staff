// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Balances, Settlement } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const ExpenseSplitter = impl.default;

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
const lines = (name: string) => {
  const list = screen.queryByRole('list', { name });
  return list ? within(list).queryAllByRole('listitem').map((li) => norm(li.textContent)) : [];
};

async function addMembers(user: UserEvent, names: string[]) {
  for (const name of names) {
    await user.type(screen.getByLabelText('Member name'), name);
    await user.click(screen.getByRole('button', { name: 'Add member' }));
  }
}

async function addExpense(
  user: UserEvent,
  { description, amount, paidBy, uncheck = [] }: { description: string; amount: string; paidBy?: string; uncheck?: string[] },
) {
  if (description) await user.type(screen.getByLabelText('Description'), description);
  if (amount) await user.type(screen.getByLabelText('Amount'), amount);
  if (paidBy) await user.selectOptions(screen.getByLabelText('Paid by'), paidBy);
  for (const name of uncheck) await user.click(screen.getByRole('checkbox', { name }));
  await user.click(screen.getByRole('button', { name: 'Add expense' }));
}

async function setup(members = ['Asha', 'Ben', 'Chen']) {
  const user = userEvent.setup();
  render(<ExpenseSplitter />);
  await addMembers(user, members);
  return { user };
}

function applySettlements(balances: Balances, settlements: Settlement[]) {
  const next = { ...balances };
  for (const s of settlements) {
    next[s.from] += s.amount;
    next[s.to] -= s.amount;
  }
  return next;
}

function expectValidSettlements(balances: Balances, settlements: Settlement[]) {
  const after = applySettlements(balances, settlements);
  for (const v of Object.values(after)) expect(v).toBe(0);
  const nonZero = Object.values(balances).filter((v) => v !== 0).length;
  expect(settlements.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
  const payers = new Set(settlements.map((s) => s.from));
  for (const s of settlements) {
    expect(Number.isInteger(s.amount)).toBe(true);
    expect(s.amount).toBeGreaterThan(0);
    expect(payers.has(s.to)).toBe(false);
    expect(balances[s.from]).toBeLessThan(0);
    expect(balances[s.to]).toBeGreaterThan(0);
  }
}

describeTask('ExpenseSplitter', () => {
  it('adds trimmed members, rejects duplicates and ignores blanks', async () => {
    const user = userEvent.setup();
    render(<ExpenseSplitter />);
    expect(screen.getByText('Add at least two members to add expenses')).toBeInTheDocument();
    await addMembers(user, ['  Asha ', 'Ben']);
    expect(screen.queryByText('Add at least two members to add expenses')).not.toBeInTheDocument();
    await addMembers(user, ['asha']);
    expect(screen.getByText('Member already exists')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add member' }));
    expect(lines('Balances')).toEqual(['Asha is settled up', 'Ben is settled up']);
    expect(screen.getByRole('checkbox', { name: 'Asha' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Ben' })).toBeChecked();
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });

  it('splits equally and shows balances and settlements', async () => {
    const { user } = await setup();
    await addExpense(user, { description: 'Dinner', amount: '900', paidBy: 'Asha' });
    expect(lines('Expenses')).toHaveLength(1);
    expect(lines('Expenses')[0]).toContain('Dinner');
    expect(lines('Expenses')[0]).toContain('₹900.00');
    expect(lines('Expenses')[0]).toContain('paid by Asha');
    expect(lines('Balances')).toEqual(['Asha is owed ₹600.00', 'Ben owes ₹300.00', 'Chen owes ₹300.00']);
    expect(lines('Settlements').sort()).toEqual(['Ben pays Asha ₹300.00', 'Chen pays Asha ₹300.00']);
  });

  it('assigns leftover paise deterministically in member order', async () => {
    const { user } = await setup();
    await addExpense(user, { description: 'Cab', amount: '100', paidBy: 'Ben' });
    expect(lines('Balances')).toEqual(['Asha owes ₹33.34', 'Ben is owed ₹66.67', 'Chen owes ₹33.33']);
  });

  it('does exact money math with integer paise', async () => {
    const { user } = await setup();
    await addExpense(user, { description: 'Chai', amount: '0.10', paidBy: 'Asha', uncheck: ['Chen'] });
    await addExpense(user, { description: 'Biscuits', amount: '0.2', paidBy: 'Asha', uncheck: ['Chen'] });
    expect(lines('Balances')).toEqual(['Asha is owed ₹0.15', 'Ben owes ₹0.15', 'Chen is settled up']);
    expect(lines('Settlements')).toEqual(['Ben pays Asha ₹0.15']);
  });

  it('resets the form after adding an expense', async () => {
    const { user } = await setup();
    await addExpense(user, { description: 'Snacks', amount: '60', paidBy: 'Chen', uncheck: ['Ben'] });
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect((screen.getByLabelText('Paid by') as HTMLSelectElement).selectedOptions[0]).toHaveTextContent('Chen');
    expect(screen.getByRole('checkbox', { name: 'Ben' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Equally' })).toBeChecked();
    expect(lines('Balances')).toEqual(['Asha owes ₹30.00', 'Ben is settled up', 'Chen is owed ₹30.00']);
  });

  it('validates description, amount and participants without adding', async () => {
    const { user } = await setup();
    await addExpense(user, { description: '', amount: '' });
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid amount')).toBeInTheDocument();

    for (const bad of ['abc', '0', '-5', '1.234']) {
      await user.clear(screen.getByLabelText('Description'));
      await user.clear(screen.getByLabelText('Amount'));
      await addExpense(user, { description: 'Bad', amount: bad });
      expect(screen.getByText('Enter a valid amount')).toBeInTheDocument();
    }

    await user.clear(screen.getByLabelText('Amount'));
    await addExpense(user, { description: '', amount: '10', uncheck: ['Asha', 'Ben', 'Chen'] });
    expect(screen.getByText('Select at least one participant')).toBeInTheDocument();
    expect(lines('Expenses')).toEqual([]);
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });

  it('validates that exact shares add up to the total', async () => {
    const { user } = await setup();
    await user.type(screen.getByLabelText('Description'), 'Hotel');
    await user.type(screen.getByLabelText('Amount'), '900');
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }));
    await user.type(screen.getByLabelText('Share for Asha'), '200');
    await user.type(screen.getByLabelText('Share for Ben'), '300');
    await user.type(screen.getByLabelText('Share for Chen'), '300');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(screen.getByText('Shares must add up to ₹900.00')).toBeInTheDocument();
    expect(lines('Expenses')).toEqual([]);

    await user.clear(screen.getByLabelText('Share for Chen'));
    await user.type(screen.getByLabelText('Share for Chen'), '400');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(screen.queryByText('Shares must add up to ₹900.00')).not.toBeInTheDocument();
    expect(lines('Balances')).toEqual(['Asha is owed ₹700.00', 'Ben owes ₹300.00', 'Chen owes ₹400.00']);
  });

  it('updates balances when an expense is deleted', async () => {
    const { user } = await setup();
    await addExpense(user, { description: 'Dinner', amount: '900', paidBy: 'Asha' });
    await addExpense(user, { description: 'Tickets', amount: '300', paidBy: 'Ben' });
    expect(lines('Balances')).toEqual(['Asha is owed ₹500.00', 'Ben owes ₹100.00', 'Chen owes ₹400.00']);
    await user.click(screen.getByRole('button', { name: 'Delete Dinner' }));
    expect(lines('Balances')).toEqual(['Asha owes ₹100.00', 'Ben is owed ₹200.00', 'Chen owes ₹100.00']);
    await user.click(screen.getByRole('button', { name: 'Delete Tickets' }));
    expect(lines('Balances')).toEqual(['Asha is settled up', 'Ben is settled up', 'Chen is settled up']);
    expect(screen.getByText('All settled up')).toBeInTheDocument();
    expect(lines('Settlements')).toEqual([]);
  });

  it('simplifyDebts handles the trivial cases', () => {
    expect(impl.simplifyDebts({})).toEqual([]);
    expect(impl.simplifyDebts({ Asha: 0, Ben: 0 })).toEqual([]);
    expect(impl.simplifyDebts({ Asha: -500, Ben: 500 })).toEqual([{ from: 'Asha', to: 'Ben', amount: 500 }]);
    // A owes B and B owes C nets out to a single payment from A to C.
    expect(impl.simplifyDebts({ A: -100, B: 0, C: 100 })).toEqual([{ from: 'A', to: 'C', amount: 100 }]);
  });

  it('simplifyDebts zeroes every balance within n − 1 payments, deterministically and without mutating', () => {
    const cases: Balances[] = [
      { Asha: 70000, Ben: -30000, Chen: -25000, Dev: -15000 },
      { A: -3334, B: 6667, C: -3333 },
      { A: -500, B: -500, C: 400, D: 600, E: 0 },
      { P: 1, Q: 1, R: 1, S: -3 },
      { Zed: -12345, Amy: 2345, Kim: 10000, Lee: -1, Max: 1 },
    ];
    for (const balances of cases) {
      const copy = { ...balances };
      const result = impl.simplifyDebts(balances);
      expect(balances).toEqual(copy);
      expectValidSettlements(balances, result);
      // Key order must not change the answer.
      const reversed = Object.fromEntries(Object.entries(balances).reverse());
      expect(impl.simplifyDebts(reversed)).toEqual(result);
    }
  });

  it('simplifyDebts rejects balances that do not sum to zero or are not integers', () => {
    expect(() => impl.simplifyDebts({ A: -100, B: 99 })).toThrow(RangeError);
    expect(() => impl.simplifyDebts({ A: -0.5, B: 0.5 })).toThrow(RangeError);
  });
});

describeFollowUp(5, 'persist to localStorage', () => {
  it('restores members and expenses from storageKey after a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ExpenseSplitter storageKey="trip" />);
    await addMembers(user, ['Asha', 'Ben']);
    await addExpense(user, { description: 'Fuel', amount: '50', paidBy: 'Ben' });
    unmount();
    render(<ExpenseSplitter storageKey="trip" />);
    expect(lines('Expenses')[0]).toContain('Fuel');
    expect(lines('Balances')).toEqual(['Asha owes ₹25.00', 'Ben is owed ₹25.00']);
  });
});
