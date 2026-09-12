/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${Math.round(n).toLocaleString()}`,
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// lucide-react: stub svg per icon used by CommandPalette (avoids real icons in jsdom)
vi.mock('lucide-react', () => {
  const stub = (name: string) => {
    const Comp = ({ className }: { className?: string }) =>
      React.createElement('svg', { 'data-testid': `icon-${name}`, className });
    return Comp;
  };
  const icons = [
    'LayoutDashboard', 'ArrowRightLeft', 'PieChart', 'Target', 'Settings',
    'TrendingUp', 'Calendar', 'Shield', 'Wallet', 'CreditCard',
    'Trophy', 'Zap', 'Heart', 'BarChart3', 'FlaskConical', 'Briefcase', 'PiggyBank',
    'Repeat', 'Search', 'FileText', 'GitCompare', 'Activity', 'Layers', 'CalendarDays', 'Grid3x3',
    'Plus', 'LogOut', 'Flame', 'Moon', 'ArrowUpRight', 'ArrowDownRight',
  ];
  const mock: Record<string, unknown> = { __esModule: true };
  for (const i of icons) mock[i] = stub(i);
  return mock;
});

import CommandPalette from '../components/CommandPalette';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => [] })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders nothing until opened', () => {
    const { container } = render(<CommandPalette />);
    expect(container.innerHTML).toBe('');
  });

  it('opens on cmd-palette-open event and lists all sidebar pages + actions', async () => {
    render(<CommandPalette />);
    window.dispatchEvent(new CustomEvent('cmd-palette-open'));
    await waitFor(() => {
      // Every previously-missing sidebar destination is searchable
      for (const label of ['Budget Pace', 'Runway', 'Credit', 'Streaks', 'Rhythm', 'Category Matrix', 'Merchants', 'FIRE', 'What-If', 'Portfolio', 'Weekly', 'Yearly', 'Cashflow', 'Recurring Audit', 'Tips', 'Net Worth']) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });
    expect(screen.getByText('Quick Add Transaction')).toBeInTheDocument();
    expect(screen.getByText('Log Out')).toBeInTheDocument();
    expect(screen.getByText('Toggle Dark Mode')).toBeInTheDocument();
  });

  it('filters pages by fuzzy query', async () => {
    render(<CommandPalette />);
    window.dispatchEvent(new CustomEvent('cmd-palette-open'));
    await waitFor(() => expect(screen.getByText('Runway')).toBeInTheDocument());
    const input = screen.getByPlaceholderText('Search pages, actions, transactions...');
    await userEvent.type(input, 'runwy');
    // label is wrapped in multiple <mark> nodes when highlighted — match on element text
    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent === 'Runway' && el.tagName === 'DIV')).toBeInTheDocument();
    });
    // live tx search fetch must settle first, else its "Transactions" group header lingers
    await waitFor(() => expect(screen.queryByText('Searching transactions…')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText(/^Transactions$/)).not.toBeInTheDocument());
  });

  it('dispatches quick-add-open when Quick Add action is clicked', async () => {
    const spy = vi.fn();
    window.addEventListener('quick-add-open', spy);
    render(<CommandPalette />);
    window.dispatchEvent(new CustomEvent('cmd-palette-open'));
    await waitFor(() => expect(screen.getByText('Quick Add Transaction')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Quick Add Transaction'));
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener('quick-add-open', spy);
  });

  it('Shift+N dispatches quick-add-open without opening the palette', () => {
    const spy = vi.fn();
    window.addEventListener('quick-add-open', spy);
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'N', shiftKey: true, metaKey: false, ctrlKey: false });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener('quick-add-open', spy);
  });

  it('Shift+N is ignored while typing in an input', async () => {
    const spy = vi.fn();
    window.addEventListener('quick-add-open', spy);
    render(<CommandPalette />);
    window.dispatchEvent(new CustomEvent('cmd-palette-open'));
    const input = await screen.findByPlaceholderText('Search pages, actions, transactions...');
    fireEvent.keyDown(input, { key: 'N', shiftKey: true });
    expect(spy).not.toHaveBeenCalled();
    window.removeEventListener('quick-add-open', spy);
  });

  it('closes on Escape', async () => {
    render(<CommandPalette />);
    window.dispatchEvent(new CustomEvent('cmd-palette-open'));
    await waitFor(() => expect(screen.getByText('Quick Add Transaction')).toBeInTheDocument());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Quick Add Transaction')).not.toBeInTheDocument());
  });
});
