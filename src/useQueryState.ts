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
 * Hook to manage React state synchronized bidirectionally with URL search parameters in Next.js App Router.
 *
 * Features:
 * - **0ms UI Latency**: Local state updates instantaneously while URL navigation transitions asynchronously.
 * - **Debouncing**: Optional debounce delay to prevent flooding browser history during fast typing.
 * - **Clean URL Policy**: Strips default and empty values automatically to keep URLs pristine.
 * - **Non-blocking Transitions**: Integrates with Next.js `useTransition` to keep the UI interactive.
 *
 * @param key The query string parameter name (e.g. `'q'`, `'page'`, `'sort'`).
 * @param parser The parser instance (e.g. `parseAsString`, `parseAsInteger`, etc.).
 * @param options Optional configuration for default values, debouncing, and browser navigation history.
 * @returns A tuple of `[value, setValue, reset, isPending] as const`:
 * - `value`: Current state value parsed from the URL or fallback default.
 * - `setValue`: State updater function accepting either a raw value or a functional update `(prev => next)`.
 * - `reset`: Function to restore state to its default value and remove the parameter from the URL.
 * - `isPending`: Boolean flag indicating if Next.js is actively processing the URL transition.
 *
 * @example
 * ```tsx
 * const [query, setQuery, resetQuery, isPending] = useQueryState(
 *   'q',
 *   parseAsString.withDefault(''),
 *   { debounceMs: 300 }
 * );
 * ```
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

  const rawQueryValue = searchParams ? searchParams.get(key) : null;
  const parsedUrlValue = parser.parse(rawQueryValue);
  const initialValue =
    parsedUrlValue !== null && parsedUrlValue !== undefined
      ? parsedUrlValue
      : (effectiveDefault as T);

  // Local state guarantees instantaneous typing and interaction feedback
  const [internalValue, setInternalValue] = useState<T>(initialValue);

  const latestValueRef = useRef<T>(internalValue);
  latestValueRef.current = internalValue;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownUrlParamRef = useRef<string | null>(rawQueryValue);
  const lastCommittedParamRef = useRef<string | null>(rawQueryValue);

  // Synchronize internal state when URL search params change externally (e.g. browser back/forward navigation)
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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commitToUrl = useCallback(
    (targetValue: T) => {
      const currentParams = new URLSearchParams(
        searchParams ? searchParams.toString() : ''
      );
      const serialized = parser.serialize(targetValue);

      // Clean URL Policy: omit parameter if value is empty or matches default
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

  const setValue = useCallback(
    (valueOrUpdater: StateUpdater<T>) => {
      const nextValue =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prev: T) => T)(latestValueRef.current)
          : valueOrUpdater;

      setInternalValue(nextValue);
      latestValueRef.current = nextValue;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

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
