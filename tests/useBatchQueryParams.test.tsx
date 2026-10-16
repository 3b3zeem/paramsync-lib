import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchQueryParams } from '../src/useBatchQueryParams';
import {
  parseAsArray,
  parseAsString,
  parseAsNumberRange,
  parseAsInteger,
} from '../src/parsers';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams('');
const mockPathname = '/catalog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe('src/useBatchQueryParams.ts', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams('');
  });

  it('updates multiple query parameters simultaneously in a single transition', () => {
    mockSearchParams = new URLSearchParams('page=2');

    const { result } = renderHook(() => useBatchQueryParams());

    act(() => {
      result.current.setBatchParams({
        search: 'boots',
        category: 'shoes',
        page: 1, // Will set page=1
      });
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      '/catalog?page=1&search=boots&category=shoes',
      { scroll: false }
    );
  });

  it('handles descriptors with parsers and applies Clean URL Policy in batch', () => {
    mockSearchParams = new URLSearchParams('old=keep&color=red');

    const { result } = renderHook(() => useBatchQueryParams());

    act(() => {
      result.current.setBatchParams({
        // Array parser: non-empty adds comma list
        tags: {
          value: ['sale', 'winter'],
          parser: parseAsArray(parseAsString),
        },
        // Range parser: matches default (0-1000) so it must be cleaned from URL
        price: {
          value: { min: 0, max: 1000 },
          parser: parseAsNumberRange(0, 1000),
        },
        // Clean empty string
        search: '',
        // Delete color by passing null
        color: null,
      });
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    // 'old=keep' remains, 'tags' is serialized, 'price', 'search', and 'color' are cleaned!
    expect(mockReplace).toHaveBeenCalledWith(
      '/catalog?old=keep&tags=sale%2Cwinter',
      { scroll: false }
    );
  });

  it('resets all parameters when resetAllParams is called with no preserveKeys', () => {
    mockSearchParams = new URLSearchParams('category=phones&brand=apple&sort=price.asc');

    const { result } = renderHook(() => useBatchQueryParams());

    act(() => {
      result.current.resetAllParams();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/catalog', { scroll: false });
  });

  it('preserves specified keys when resetAllParams is called with preserveKeys', () => {
    mockSearchParams = new URLSearchParams(
      'tab=reviews&utm_source=google&category=shoes&price=100-200&page=3'
    );

    const { result } = renderHook(() => useBatchQueryParams());

    act(() => {
      result.current.resetAllParams(['tab', 'utm_source']);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      '/catalog?tab=reviews&utm_source=google',
      { scroll: false }
    );
  });

  it('supports custom navigation options (history: "push", scroll: true)', () => {
    mockSearchParams = new URLSearchParams('view=grid');

    const { result } = renderHook(() =>
      useBatchQueryParams({ history: 'push', scroll: true })
    );

    act(() => {
      result.current.setBatchParams({
        page: { value: 2, parser: parseAsInteger },
      });
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/catalog?view=grid&page=2', {
      scroll: true,
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
