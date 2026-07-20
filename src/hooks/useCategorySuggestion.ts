import { useState, useEffect, useRef } from 'react';

export interface CategorySuggestionResult {
  category: string | null;
  confidence: number;
  match_type: 'exact' | 'prefix' | null;
  sample_count: number;
}

export interface UseCategorySuggestionReturn {
  /** The suggested category name, or null if no suggestion */
  suggestedCategory: string | null;
  /** Confidence score 0-1 */
  confidence: number;
  /** Whether a request is in-flight */
  isLoading: boolean;
  /** Whether the suggestion was auto-filled into the field (vs user-typed) */
  isAutoFilled: boolean;
  /** Clear the auto-filled state (call when user manually edits category) */
  clearAutoFill: () => void;
}

/**
 * Custom hook that fetches a category suggestion for a transaction title
 * via the /api/suggest-category endpoint.
 *
 * Features:
 * - Debounce 250ms to avoid excessive requests while typing
 * - AbortController cancels in-flight requests on new input
 * - Only fetches when title is at least 2 characters
 * - Gracefully handles network errors (returns null suggestion)
 *
 * Usage:
 *   const { suggestedCategory, isAutoFilled, clearAutoFill } = useCategorySuggestion(title);
 *   // When suggestedCategory arrives and category field is empty, auto-fill it
 */
export function useCategorySuggestion(title: string): UseCategorySuggestionReturn {
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = title.trim();

    // Cancel any pending debounce + in-flight request
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (trimmed.length < 2) {
      setSuggestedCategory(null);
      setConfidence(0);
      setIsLoading(false);
      setIsAutoFilled(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({ q: trimmed });
        const res = await fetch(`/api/suggest-category?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestedCategory(null);
          setConfidence(0);
          setIsAutoFilled(false);
          return;
        }
        const data: CategorySuggestionResult = await res.json();
        setSuggestedCategory(data.category);
        setConfidence(data.confidence ?? 0);
        setIsAutoFilled(data.category !== null);
      } catch (err: any) {
        // AbortError is expected when a new request supersedes this one
        if (err?.name !== 'AbortError') {
          setSuggestedCategory(null);
          setConfidence(0);
          setIsAutoFilled(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [title]);

  const clearAutoFill = () => {
    setIsAutoFilled(false);
  };

  return {
    suggestedCategory,
    confidence,
    isLoading,
    isAutoFilled,
    clearAutoFill,
  };
}
