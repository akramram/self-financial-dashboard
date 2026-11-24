/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NoteIndicator from '../components/NoteIndicator';

describe('NoteIndicator', () => {
  it('puts the tooltip on a wrapper element, not on the <svg>', () => {
    const { container } = render(<NoteIndicator notes="Cicilan 2/3" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper).toHaveAttribute('title', 'Cicilan 2/3');
    expect(container.querySelector('svg')).not.toHaveAttribute('title');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes the note to screen readers', () => {
    render(<NoteIndicator notes="Bayar pakai kartu kantor" />);
    expect(screen.getByText('Catatan: Bayar pakai kartu kantor')).toHaveClass('sr-only');
  });
});
