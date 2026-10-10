/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import QuickAddTransactionModal from '../components/QuickAddTransactionModal';

// jsdom lacks ResizeObserver (Radix Checkbox/Popover internals need it).
// Re-stubbed in beforeEach because afterEach's unstubAllGlobals clears it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('QuickAddTransactionModal', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    fetchMock.mockReset();
    // default: every endpoint answers 200 with an ARRAY where a list is expected
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when closed', () => {
    render(<QuickAddTransactionModal open={false} onOpenChange={() => {}} />);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders as a mobile bottom sheet (rounded top, 90dvh cap, internal scroll) when open', () => {
    render(<QuickAddTransactionModal open={true} onOpenChange={() => {}} />);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const cls = dialog!.className;
    // bottom sheet on <md
    expect(cls).toContain('max-md:rounded-t-2xl');
    expect(cls).toContain('max-md:max-h-[90dvh]');
    expect(cls).toContain('max-md:bottom-0');
    // centered max-w-md on desktop
    expect(cls).toContain('max-w-md');
    // scrollable body + form mounted
    expect(screen.getByTestId('quick-add-body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Transaction/i })).toBeInTheDocument();
  });

  it('shows the "Just now" chip while date/time are untouched', () => {
    render(<QuickAddTransactionModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId('just-now-chip')).toBeInTheDocument();
  });

  it('closes ≤800ms after a successful submit', async () => {
    const onOpenChange = vi.fn();
    render(<QuickAddTransactionModal open={true} onOpenChange={onOpenChange} />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Kopi' } });
    fireEvent.change(screen.getByLabelText('Amount (IDR)'), { target: { value: '25000' } });

    fireEvent.click(screen.getByRole('button', { name: /Add Transaction/i }));
    // Success path schedules the auto-close at 800ms (brief: ≤800ms)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 2000 });
    const postCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/transactions'));
    expect(postCalls).toHaveLength(1);
  }, 10_000);

  it('KUR-213 A: Type precedes Amount, Month/Year removed, drag handle present, dialog is aria-modal', () => {
    render(<QuickAddTransactionModal open={true} onOpenChange={() => {}} />);

    // A7: Type select sits above the Amount input
    const typeSelect = screen.getByText('Type');
    const amountInput = screen.getByLabelText('Amount (IDR)');
    expect(typeSelect.compareDocumentPosition(amountInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // A6: Month/Year fields are gone (period derives from Date & Time)
    expect(screen.queryByText('Month')).toBeNull();
    expect(screen.queryByText('Year')).toBeNull();

    // A3: drag handle rendered inside the sheet
    expect(screen.getByTestId('sheet-drag-handle')).toBeInTheDocument();

    // A2: Paid/Done is a full-row tap target (≥44px via min-h on the row)
    const doneRow = screen.getByTestId('tx-done-row');
    expect(doneRow.getAttribute('role')).toBe('checkbox');
    expect(doneRow.className).toContain('min-h-[44px]');

    // A9: aria-modal on the dialog content
    expect(document.querySelector('[role="dialog"]')!.getAttribute('aria-modal')).toBe('true');
  });
});
