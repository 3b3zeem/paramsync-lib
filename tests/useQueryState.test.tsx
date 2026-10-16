import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueryState } from '../src/useQueryState';
import {
  parseAsString,
  parseAsInteger,
  parseAsArray,
  parseAsNumberRange,
} from '../src/parsers';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams('');
const mockPathname = '/products';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe('src/useQueryState.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams('');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads initial value from searchParams when present', () => {
    mockSearchParams = new URLSearchParams('q=laptop');

    const { result } = renderHook(() =>
      useQueryState('q', parseAsString.withDefault(''))
    );

    const [value] = result.current;
    expect(value).toBe('laptop');
  });

  it('uses default value when query param is missing', () => {
    mockSearchParams = new URLSearchParams('');

    const { result } = renderHook(() =>
      useQueryState('page', parseAsInteger.withDefault(1))
    );

    const [page] = result.current;
    expect(page).toBe(1);
  });

  it('immediately updates internal state for zero typing lag (without debounce delay)', () => {
    const { result } = renderHook(() =>
      useQueryState('q', parseAsString.withDefault(''), { debounceMs: 300 })
    );

    act(() => {
      const [, setValue] = result.current;
      setValue('iphone');
    });

    // Local state updates instantaneously
    expect(result.current[0]).toBe('iphone');

    // URL has not been updated yet due to debounce
    expect(mockReplace).not.toHaveBeenCalled();

    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledWith('/products?q=iphone', { scroll: false });
  });

  it('debounces rapid keystrokes and only commits the last value', () => {
    const { result } = renderHook(() =>
      useQueryState('q', parseAsString.withDefault(''), { debounceMs: 250 })
    );

    act(() => {
      const [, setValue] = result.current;
      setValue('a');
    });

    act(() => {
      vi.advanceTimersByTime(100);
      const [, setValue] = result.current;
      setValue('ab');
    });

    act(() => {
      vi.advanceTimersByTime(100);
      const [, setValue] = result.current;
      setValue('abc');
    });

    // Still not fired
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Only called once with final value
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/products?q=abc', { scroll: false });
  });

  it('enforces Clean URL Policy by deleting key on empty string or default value', () => {
    mockSearchParams = new URLSearchParams('q=existing&page=3');

    const { result } = renderHook(() =>
      useQueryState('q', parseAsString.withDefault(''))
    );

    act(() => {
      const [, setValue] = result.current;
      setValue(''); // Empty string should clean key from URL
    });

    expect(mockReplace).toHaveBeenCalledWith('/products?page=3', { scroll: false });
  });

  it('enforces Clean URL Policy by deleting key on empty array', () => {
    mockSearchParams = new URLSearchParams('tags=shoes,watches');

    const { result } = renderHook(() =>
      useQueryState('tags', parseAsArray(parseAsString))
    );

    act(() => {
      const [, setValue] = result.current;
      setValue([]); // Empty array should clean key
    });

    expect(mockReplace).toHaveBeenCalledWith('/products', { scroll: false });
  });

  it('supports functional updates like standard useState', () => {
    const { result } = renderHook(() =>
      useQueryState('page', parseAsInteger.withDefault(1))
    );

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(mockReplace).toHaveBeenCalledWith('/products?page=2', { scroll: false });
  });

  it('supports history: "push" and custom scroll option', () => {
    const { result } = renderHook(() =>
      useQueryState('page', parseAsInteger.withDefault(1), {
        history: 'push',
        scroll: true,
      })
    );

    act(() => {
      const [, setValue] = result.current;
      setValue(5);
    });

    expect(mockPush).toHaveBeenCalledWith('/products?page=5', { scroll: true });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('reset() restores the default value and cleans the URL parameter', () => {
    mockSearchParams = new URLSearchParams('price=50-200&other=stay');

    const { result } = renderHook(() =>
      useQueryState('price', parseAsNumberRange(0, 1000))
    );

    expect(result.current[0]).toEqual({ min: 50, max: 200 });

    act(() => {
      const [, , reset] = result.current;
      reset();
    });

    expect(result.current[0]).toEqual({ min: 0, max: 1000 });
    // Clean URL: price key is removed because it equals default
    expect(mockReplace).toHaveBeenCalledWith('/products?other=stay', { scroll: false });
  });
});
