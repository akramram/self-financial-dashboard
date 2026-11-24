import React from 'react';
import { StickyNote } from 'lucide-react';

/**
 * Notes marker for a transaction row. The tooltip lives on a wrapping <span>:
 * a `title` prop on a Lucide icon becomes an attribute on <svg>, which browsers
 * do not show as a tooltip and screen readers ignore.
 */
export default function NoteIndicator({ notes, className = '' }: { notes: string; className?: string }) {
  return (
    <span title={notes} className={`inline-flex align-middle shrink-0 ${className}`}>
      <StickyNote aria-hidden="true" className="w-3 h-3 text-gold-400" />
      <span className="sr-only">Catatan: {notes}</span>
    </span>
  );
}
