/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `IDR ${n.toLocaleString('id-ID')}`,
  };
});

vi.mock('../lib/api', () => ({
  fetchCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Food', color: '#22c55e', monthly_limit: 2000000 },
  ]),
  createCategory: vi.fn(),
  updateCategoryApi: vi.fn(),
  deleteCategoryApi: vi.fn(),
  fetchMonthlyIncome: vi.fn().mockResolvedValue([
    { month: 'August 2026', date: '2026-08-21', income: 15000000, other_income: 500000 },
  ]),
  upsertMonthlyIncomeApi: vi.fn(),
  updateMonthlyIncomeApi: vi.fn(),
  deleteMonthlyIncomeApi: vi.fn(),
  importDataApi: vi.fn(),
}));

vi.mock('../components/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

import SettingsView from '../components/SettingsView';

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = '';
});

describe('SettingsView Hub', () => {
  it('renders all tab triggers and default all view', async () => {
    render(<SettingsView />);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /all settings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /categories & limits/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /monthly income/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /backup & restore/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /system & shortcuts/i })).toBeInTheDocument();

    // In 'all' view, categories, income, data export, and system cards are visible
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /categories settings/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /income settings/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /data and backup settings/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /system preferences/i })).toBeInTheDocument();
    });
  });

  it('filters to categories only when Categories tab is clicked', async () => {
    render(<SettingsView />);

    fireEvent.click(screen.getByRole('tab', { name: /categories & limits/i }));

    expect(screen.getByRole('region', { name: /categories settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /income settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /data and backup settings/i })).not.toBeInTheDocument();
  });

  it('filters to monthly income only when Monthly Income tab is clicked', async () => {
    render(<SettingsView />);

    fireEvent.click(screen.getByRole('tab', { name: /monthly income/i }));

    expect(screen.getByRole('region', { name: /income settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /categories settings/i })).not.toBeInTheDocument();
  });

  it('filters to data backup only when Backup & Restore tab is clicked', async () => {
    render(<SettingsView />);

    fireEvent.click(screen.getByRole('tab', { name: /backup & restore/i }));

    expect(screen.getByRole('region', { name: /data and backup settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /categories settings/i })).not.toBeInTheDocument();
  });

  it('dispatches open events for alerts and command palette in system section', async () => {
    const alertSpy = vi.fn();
    const cmdSpy = vi.fn();
    window.addEventListener('fin-alerts-drawer-open', alertSpy);
    window.addEventListener('cmd-palette-open', cmdSpy);

    render(<SettingsView />);

    fireEvent.click(screen.getByRole('tab', { name: /system & shortcuts/i }));

    const alertBtn = screen.getByRole('button', { name: /open alert settings/i });
    fireEvent.click(alertBtn);
    expect(alertSpy).toHaveBeenCalled();

    const cmdBtn = screen.getByRole('button', { name: /command palette/i });
    fireEvent.click(cmdBtn);
    expect(cmdSpy).toHaveBeenCalled();

    window.removeEventListener('fin-alerts-drawer-open', alertSpy);
    window.removeEventListener('cmd-palette-open', cmdSpy);
  });
});
