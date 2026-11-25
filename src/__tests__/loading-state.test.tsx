/**
 * LoadingState — spinner loading konsisten: role="status" + aria-live="polite"
 * (diumumkan screen reader), ikon aria-hidden, label terlihat, kontras AA
 * (text-slate-600 / dark:text-white/60). Regresi: penggantian ~10 div
 * "Loading..." polos (CategoryMatrix, CategorySettings, IncomeSettings,
 * NetworthEditForm, RecurringManager, BudgetReport, SpendingAnalytics).
 */
/**
 * @vitest-environment jsdom
 * @jest-dom
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingState from '../components/ui/loading-state';

describe('LoadingState', () => {
  it('punya role status, aria-live polite, label, dan ikon aria-hidden', () => {
    render(<LoadingState label="Loading transactions..." />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading transactions...');
    const icon = status.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.className.baseVal).toContain('animate-spin');
  });

  it('kontras AA: tanpa kelas text-slate-500 gelap gagal (dark:text-white/60 dipakai)', () => {
    const { container } = render(<LoadingState label="Loading..." />);
    expect(container.firstChild).not.toHaveTextContent('');
    expect(container.firstChild).toHaveClass('text-slate-600');
    expect(container.firstChild).toHaveClass('dark:text-white/60');
  });
});
