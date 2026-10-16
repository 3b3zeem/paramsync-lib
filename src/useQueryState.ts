'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Parser,
  ParserWithDefault,
  isCleanValue,
} from './parsers';

export interface UseQueryStateOptions<T> {
  /**
   * Fallback value used when query parameter is omitted or cannot be parsed.
   */
  defaultValue?: T;

  /**
   * Debounce delay in milliseconds before updating the browser URL.
   * Internal state updates immediately to eliminate UI typing lag.
   */
  debounceMs?: number;

  /**
   * Navigation method: 'replace' updates URL in-place; 'push' creates a new browser history entry.
   * @default 'replace'
   */
  history?: 'replace' | 'push';

  /**
   * Whether Next.js should scroll to the top of the page after URL update.
   * @default false
   */
  scroll?: boolean;
}

export type StateUpdater<T> = T | ((prev: T) => T);

/**
 * Hook to manage React state synchronized bidirectionally with URL Search Parameters in Next.js App Router.
 *
 * @param key The query string parameter name (e.g. `'q'`, `'page'`, `'sort'`).
 * @param parser The parser instance (e.g. `parseAsString`, `parseAsInteger`, etc.).
 * @param options Configuration options for defaults, debouncing, and history.
 * @returns A tuple of `[value, setValue, reset, isPending] as const`.
 */
export function useQueryState<T>(
  key: string,
  parser: ParserWithDefault<T>,
  options?: UseQueryStateOptions<T>
): readonly [
  value: T,
  setValue: (valueOrUpdater: StateUpdater<T>) => void,
  reset: () => void,
  isPending: boolean
];

export function useQueryState<T>(
  key: string,
  parser: Parser<T>,
  options: UseQueryStateOptions<T> & { defaultValue: T }
): readonly [
  value: T,
  setValue: (valueOrUpdater: StateUpdater<T>) => void,
  reset: () => void,
  isPending: boolean
];

export function useQueryState<T>(
  key: string,
  parser: Parser<T>,
  options?: UseQueryStateOptions<T>
): readonly [
  value: T,
  setValue: (valueOrUpdater: StateUpdater<T>) => void,
  reset: () => void,
  isPending: boolean
];

export function useQueryState<T>(
  key: string,
  parser: Parser<T>,
  options?: UseQueryStateOptions<T>
): readonly [
  value: T,
  setValue: (valueOrUpdater: StateUpdater<T>) => void,
  reset: () => void,
  isPending: boolean
] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const effectiveDefault = options?.defaultValue ?? parser.defaultValue;
  const debounceMs = options?.debounceMs ?? 0;
  const historyMode = options?.history ?? 'replace';
  const shouldScroll = options?.scroll ?? false;

  // Read initial value from current URL search params
  const rawQueryValue = searchParams ? searchParams.get(key) : null;
  const parsedUrlValue = parser.parse(rawQueryValue);
  const initialValue =
    parsedUrlValue !== null && parsedUrlValue !== undefined
      ? parsedUrlValue
      : (effectiveDefault as T);

  // Local state guarantees instantaneous typing and interaction feedback
  const [internalValue, setInternalValue] = useState<T>(initialValue);

  // Keep tracking refs for latest values, debouncing, and external URL sync
  const latestValueRef = useRef<T>(internalValue);
  latestValueRef.current = internalValue;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownUrlParamRef = useRef<string | null>(rawQueryValue);
  const lastCommittedParamRef = useRef<string | null>(rawQueryValue);

  // Synchronize internal state when URL search params change externally (e.g. back/forward navigation)
  useEffect(() => {
    const currentParam = searchParams ? searchParams.get(key) : null;

    if (currentParam !== lastKnownUrlParamRef.current) {
      lastKnownUrlParamRef.current = currentParam;

      if (currentParam !== lastCommittedParamRef.current) {
        lastCommittedParamRef.current = currentParam;
        const parsed = parser.parse(currentParam);
        const nextVal =
          parsed !== null && parsed !== undefined
            ? parsed
            : (effectiveDefault as T);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        setInternalValue(nextVal);
        latestValueRef.current = nextVal;
      }
    }
  }, [searchParams, key, parser, effectiveDefault]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Function to commit changes to the URL
  const commitToUrl = useCallback(
    (targetValue: T) => {
      const currentParams = new URLSearchParams(
        searchParams ? searchParams.toString() : ''
      );
      const serialized = parser.serialize(targetValue);

      // Clean URL Policy: remove if serialized to empty, or matches default/empty state
      if (isCleanValue(targetValue, effectiveDefault) || serialized === '') {
        currentParams.delete(key);
      } else {
        currentParams.set(key, serialized);
      }

      const queryString = currentParams.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      lastCommittedParamRef.current = currentParams.get(key);

      startTransition(() => {
        if (historyMode === 'push') {
          router.push(nextUrl, { scroll: shouldScroll });
        } else {
          router.replace(nextUrl, { scroll: shouldScroll });
        }
      });
    },
    [
      searchParams,
      parser,
      effectiveDefault,
      key,
      pathname,
      historyMode,
      shouldScroll,
      router,
    ]
  );

  // Dispatcher with optional debounce
  const setValue = useCallback(
    (valueOrUpdater: StateUpdater<T>) => {
      const nextValue =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prev: T) => T)(latestValueRef.current)
          : valueOrUpdater;

      // 1. Immediately update internal state for 0ms UI lag
      setInternalValue(nextValue);
      latestValueRef.current = nextValue;

      // 2. Clear existing timer if any
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // 3. Debounce URL navigation or commit synchronously
      if (debounceMs > 0) {
        timerRef.current = setTimeout(() => {
          commitToUrl(nextValue);
          timerRef.current = null;
        }, debounceMs);
      } else {
        commitToUrl(nextValue);
      }
    },
    [debounceMs, commitToUrl]
  );

  // Reset helper to restore default value and clean URL
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const def = effectiveDefault as T;
    setInternalValue(def);
    latestValueRef.current = def;
    commitToUrl(def);
  }, [effectiveDefault, commitToUrl]);

  return [internalValue, setValue, reset, isPending] as const;
}
