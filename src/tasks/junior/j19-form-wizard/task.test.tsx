// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { WizardData } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const FormWizard = impl.default;

type User = ReturnType<typeof userEvent.setup>;

const button = (name: string) => screen.getByRole('button', { name });
const currentStep = () =>
  within(screen.getByRole('list', { name: 'Progress' }))
    .getAllByRole('listitem')
    .filter((li) => li.getAttribute('aria-current') === 'step');

async function completeAccount(user: User, email = 'ada@example.com', password = 'supersecret') {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(button('Next'));
}

async function completeProfile(user: User, fullName = 'Ada Lovelace', jobTitle = '') {
  await user.type(screen.getByLabelText('Full name'), fullName);
  if (jobTitle) await user.type(screen.getByLabelText('Job title'), jobTitle);
  await user.click(button('Next'));
}

describeTask('FormWizard', () => {
  it('starts on the Account step with the indicator on Account and no usable Back', () => {
    render(<FormWizard onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    const current = currentStep();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Account');
    const back = screen.queryByRole('button', { name: 'Back' });
    if (back) expect(back).toBeDisabled();
  });

  it('blocks Next on an empty Account step, showing errors and focusing the first invalid field', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await user.click(button('Next'));
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('rejects a malformed email and a short password', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await completeAccount(user, 'ada@example', 'short');
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
  });

  it('advances to Profile when Account is valid and moves the indicator', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await completeAccount(user);
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(currentStep()[0]).toHaveTextContent('Profile');
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('keeps entered data when going Back and forward again', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await completeAccount(user);
    await user.type(screen.getByLabelText('Full name'), 'Grace Hopper');
    await user.click(button('Back'));
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('supersecret');
    await user.click(button('Next'));
    expect(screen.getByLabelText('Full name')).toHaveValue('Grace Hopper');
  });

  it('requires a non-blank full name on Profile', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await completeAccount(user);
    await completeProfile(user, '   ');
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a review summary without the plain-text password', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await completeAccount(user);
    await completeProfile(user, 'Ada Lovelace', 'Engineer');
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(currentStep()[0]).toHaveTextContent('Review');
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByText(/supersecret/)).not.toBeInTheDocument();
  });

  it('shows "Not provided" for an empty job title', async () => {
    const user = userEvent.setup();
    render(<FormWizard onSubmit={vi.fn()} />);
    await completeAccount(user);
    await completeProfile(user);
    expect(screen.getByText('Not provided')).toBeInTheDocument();
  });

  it('submits all data once, disabling Submit while pending, then shows success', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onSubmit = vi.fn((_data: WizardData) => new Promise<void>((r) => (resolve = r)));
    render(<FormWizard onSubmit={onSubmit} />);
    await completeAccount(user);
    await completeProfile(user, '  Ada Lovelace ', 'Engineer');
    await user.click(button('Submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'supersecret',
      fullName: 'Ada Lovelace',
      jobTitle: 'Engineer',
    });
    expect(button('Submit')).toBeDisabled();
    await user.click(button('Submit')).catch(() => {});
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolve();
    expect(await screen.findByText('Account created')).toBeInTheDocument();
  });
});
