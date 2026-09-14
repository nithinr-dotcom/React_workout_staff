// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const ProgressBar = impl.default;

describeTask('ProgressBar', () => {
  it('renders a labelled progressbar with min, max and now', () => {
    render(<ProgressBar value={42} label="Uploading" />);
    const bar = screen.getByRole('progressbar', { name: 'Uploading' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('shows the visible label and the percentage text', () => {
    render(<ProgressBar value={42} label="Uploading" />);
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('rounds the visible percentage', () => {
    render(<ProgressBar value={33.6} label="Rounding" />);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });

  it('clamps values below 0 and above 100', () => {
    const { rerender } = render(<ProgressBar value={-10} label="Clamp" />);
    expect(screen.getByRole('progressbar', { name: 'Clamp' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
    rerender(<ProgressBar value={150} label="Clamp" />);
    expect(screen.getByRole('progressbar', { name: 'Clamp' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('treats NaN as 0', () => {
    render(<ProgressBar value={Number.NaN} label="Broken" />);
    expect(screen.getByRole('progressbar', { name: 'Broken' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('updates when value changes', () => {
    const { rerender } = render(<ProgressBar value={10} label="Live" />);
    rerender(<ProgressBar value={75} label="Live" />);
    expect(screen.getByRole('progressbar', { name: 'Live' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.queryByText('10%')).not.toBeInTheDocument();
  });

  it('hides the percentage text when showValue is false but keeps the ARIA value', () => {
    render(<ProgressBar value={42} label="Quiet" showValue={false} />);
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Quiet' })).toHaveAttribute('aria-valuenow', '42');
  });

  it('keeps two bars independently labelled', () => {
    render(
      <>
        <ProgressBar value={20} label="First file" />
        <ProgressBar value={80} label="Second file" />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'First file' })).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByRole('progressbar', { name: 'Second file' })).toHaveAttribute('aria-valuenow', '80');
  });
});

describeFollowUp(1, 'indeterminate', () => {
  it('omits aria-valuenow and the percentage text', () => {
    render(<ProgressBar value={42} label="Connecting" indeterminate />);
    const bar = screen.getByRole('progressbar', { name: 'Connecting' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });
});
