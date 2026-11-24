/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import QuickAddTransactionModal from '../components/QuickAddTransactionModal';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('QuickAddTransactionModal — DateTimePicker popover and Paid/Done interaction', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    }));
  });

  it('allows clicking Paid / Done row while DateTimePicker popover is open without React loop error', async () => {
    const onOpenChange = vi.fn();
    render(<QuickAddTransactionModal open={true} onOpenChange={onOpenChange} />);

    // Click on date time picker trigger to open popover
    const dateBtn = screen.getByText(/Today/i);
    fireEvent.click(dateBtn);

    // DateTime picker popover is now open
    const timeInput = screen.getByLabelText('Time');
    expect(timeInput).toBeInTheDocument();

    // The Paid / Done row
    const doneRow = screen.getByTestId('tx-done-row');
    expect(doneRow).toHaveAttribute('role', 'checkbox');
    expect(doneRow).toHaveAttribute('aria-checked', 'true');

    // Click the row itself
    fireEvent.click(doneRow);
    expect(doneRow).toHaveAttribute('aria-checked', 'false');

    // Click again to re-check
    fireEvent.click(doneRow);
    expect(doneRow).toHaveAttribute('aria-checked', 'true');
  });
});
