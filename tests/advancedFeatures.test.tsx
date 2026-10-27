import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueryState, useBatchQueryParams } from '../src/next';
import { useQueryState as useVanillaQueryState, batchUpdates } from '../src/index';
import { parseAsString, parseAsInteger } from '../src/parsers';
import { resetUrlManagerForTesting } from '../src/urlManager';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams('');
const mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe('Advanced ParamSync Features & Bug Fixes', () => {
  beforeEach(() => {
    resetUrlManagerForTesting();
    vi.useFakeTimers();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams('');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Bug 1 Fix: Race Condition & Stale searchParams Protection', () => {
    it('prevents debounced search from erasing immediate page navigation', () => {
      // Hook 1: debounced search (300ms)
      const { result: searchHook } = renderHook(() =>
        useQueryState('q', parseAsString.withDefault(''), { debounceMs: 300 })
      );

      // Hook 2: immediate pagination (no debounce)
      const { result: pageHook } = renderHook(() =>
        useQueryState('page', parseAsInteger.withDefault(1))
      );

      // Step 1: User types in search box at t = 0ms
      act(() => {
        searchHook.current[1]('laptops');
      });

      expect(searchHook.current[0]).toBe('laptops');
      expect(mockReplace).not.toHaveBeenCalled();

      // Step 2: At t = 100ms, user clicks page 2
      act(() => {
        vi.advanceTimersByTime(100);
        pageHook.current[1](2);
      });

      // Hook 2 committed immediately to URL with ?page=2
      expect(pageHook.current[0]).toBe(2);
      expect(mockReplace).toHaveBeenCalledWith('/dashboard?page=2', { scroll: false });

      // Step 3: At t = 300ms, search debounce timer fires!
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Crucial assertion: search commit DOES NOT overwrite page=2! Both are preserved!
      expect(mockReplace).toHaveBeenLastCalledWith(
        '/dashboard?page=2&q=laptops',
        { scroll: false }
      );
    });
  });

  describe('Feature 2: Router Agnostic / Vanilla Browser Support', () => {
    it('works completely router-agnostically with window.history in plain React / Vite', () => {
      const historyReplaceSpy = vi.spyOn(window.history, 'replaceState');

      const { result } = renderHook(() =>
        useVanillaQueryState('status', parseAsString.withDefault('all'))
      );

      act(() => {
        result.current[1]('active');
      });

      expect(result.current[0]).toBe('active');
      expect(historyReplaceSpy).toHaveBeenCalled();

      historyReplaceSpy.mockRestore();
    });

    it('supports batchUpdates to coalesce multiple independent hooks into 1 navigation', () => {
      const { result: filterAHook } = renderHook(() =>
        useQueryState('role', parseAsString.withDefault('user'))
      );
      const { result: filterBHook } = renderHook(() =>
        useQueryState('page', parseAsInteger.withDefault(1))
      );

      mockReplace.mockClear();

      act(() => {
        batchUpdates(() => {
          filterAHook.current[1]('admin');
          filterBHook.current[1](5);
        });
      });

      expect(filterAHook.current[0]).toBe('admin');
      expect(filterBHook.current[0]).toBe(5);
      // Coalesced into exactly 1 router transition
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith(
        '/dashboard?role=admin&page=5',
        { scroll: false }
      );
    });
  });

  describe('Feature 5: Instantaneous Multi-Reset and Cross-Hook State Sync', () => {
    it('resetAllParams instantly clears local state of active hooks and cancels pending debounce timers', () => {
      // Two active useQueryState hooks on the page
      const { result: searchHook } = renderHook(() =>
        useQueryState('q', parseAsString.withDefault(''), { debounceMs: 400 })
      );
      const { result: categoryHook } = renderHook(() =>
        useQueryState('category', parseAsString.withDefault('all'))
      );

      // useBatchQueryParams hook on the same page
      const { result: batchHook } = renderHook(() => useBatchQueryParams());

      // Set category to shoes
      act(() => {
        categoryHook.current[1]('shoes');
      });
      expect(categoryHook.current[0]).toBe('shoes');

      // User types in search box (timer pending for 400ms)
      act(() => {
        searchHook.current[1]('boots');
      });
      expect(searchHook.current[0]).toBe('boots');

      // Before timer fires, user clicks "Reset All Filters" preserving tab
      act(() => {
        batchHook.current.resetAllParams(['tab']);
      });

      // Internal states must reset IMMEDIATELY (0ms UI latency) without waiting for router
      expect(categoryHook.current[0]).toBe('all');
      expect(searchHook.current[0]).toBe('');

      // Advance time past the original 400ms debounce
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Search debounce timer must NOT resurrect "boots"!
      expect(searchHook.current[0]).toBe('');
    });
  });
});
