/**
 * @vitest-environment jsdom
 * @jest-dom
 *
 * EmptyState — empty state konsisten: ikon aria-hidden, aria-live="polite",
 * hint opsional, CTA link area sentuh >=44px. Regresi penggantian 4 empty
 * state polos (NetworthTable, IncomeSettings, CategoryMatrix, BudgetReport).
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import EmptyState from '../components/ui/empty-state';

describe('EmptyState', () => {
  it('ikon aria-hidden + aria-live polite + pesan', () => {
    const { container } = render(<EmptyState icon={Wallet} message="No networth records yet." />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute('aria-live', 'polite');
    const icon = root.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('text-slate-600', 'dark:text-white/60');
  });

  it('hint tampil dan CTA link >=44px + label jelas', () => {
    render(
      <EmptyState
        icon={Wallet}
        message="No income entries yet."
        hint="Isi formulir di atas."
        action={{ href: '/add', label: 'Add first record' }}
      />
    );
    expect(screen.getByText('Isi formulir di atas.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Add first record' });
    expect(link).toHaveAttribute('href', '/add');
    expect(link).toHaveClass('min-h-[44px]');
  });
});
