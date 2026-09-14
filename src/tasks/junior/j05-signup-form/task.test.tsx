// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { SignupValues } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const SignupForm = impl.default;

const field = (label: 'Name' | 'Email' | 'Password' | 'Confirm password') => screen.getByLabelText(label);
const submitButton = () => screen.getByRole('button', { name: /creat/i });

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field('Name'), '  Ada  ');
  await user.type(field('Email'), ' ada@example.com ');
  await user.type(field('Password'), 'password1');
  await user.type(field('Confirm password'), 'password1');
}

describeTask('SignupForm', () => {
  it('renders the four labelled fields and no errors initially', () => {
    render(<SignupForm onSubmit={vi.fn()} />);
    expect(field('Name')).toBeInTheDocument();
    expect(field('Email')).toBeInTheDocument();
    expect(field('Password')).toHaveAttribute('type', 'password');
    expect(field('Confirm password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(field('Name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a linked error on blur and clears it once fixed', async () => {
    const user = userEvent.setup();
    render(<SignupForm onSubmit={vi.fn()} />);
    await user.click(field('Name'));
    await user.tab();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(field('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Name')).toHaveAccessibleDescription(/Name is required/);

    await user.type(field('Name'), 'Ada');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(field('Name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('does not show errors for a field before it is blurred', async () => {
    const user = userEvent.setup();
    render(<SignupForm onSubmit={vi.fn()} />);
    await user.type(field('Email'), 'ada@');
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(field('Email')).toHaveAccessibleDescription(/Enter a valid email address/);
  });

  it('validates password length and confirmation match', async () => {
    const user = userEvent.setup();
    render(<SignupForm onSubmit={vi.fn()} />);
    await user.type(field('Password'), 'short');
    await user.tab();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();

    await user.type(field('Confirm password'), 'shorter');
    await user.tab();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(field('Confirm password')).toHaveAttribute('aria-invalid', 'true');

    await user.clear(field('Password'));
    await user.type(field('Password'), 'shorter1');
    await user.clear(field('Confirm password'));
    await user.type(field('Confirm password'), 'shorter1');
    expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('on an invalid submit, shows every error, focuses the first invalid field and does not call onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    await user.type(field('Name'), 'Ada');
    await user.click(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(field('Email')).toHaveFocus();
  });

  it('submits trimmed values, disables the button while pending, then shows the welcome message', async () => {
    const user = userEvent.setup();
    const d = deferred();
    const onSubmit = vi.fn((_values: SignupValues) => d.promise);
    render(<SignupForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada', email: 'ada@example.com', password: 'password1', confirmPassword: 'password1' });
    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled();

    await user.click(submitButton());
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);

    d.resolve();
    expect(await screen.findByText('Welcome, Ada!')).toBeInTheDocument();
  });

  it('submits with Enter from a field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<SignupForm onSubmit={onSubmit} />);
    await fillValid(user);
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a server error in an alert, re-enables the button and keeps the values', async () => {
    const user = userEvent.setup();
    const d = deferred();
    render(<SignupForm onSubmit={() => d.promise} />);
    await fillValid(user);
    await user.click(submitButton());
    d.reject(new Error('Email already registered'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    expect((field('Email') as HTMLInputElement).value.trim()).toBe('ada@example.com');
    expect(field('Password')).toHaveValue('password1');
  });
});
