'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { Parser, ParserWithDefault, isCleanValue } from './parsers';
import {
  UseQueryStateOptions,
  StateUpdater,
  RouterAdapter,
} from './types';
import { vanillaAdapter } from './adapters/vanilla';
import {
  getCommittedSearchParams,
  commitUrlParam,
  registerHook,
} from './urlManager';

/**
 * Router-agnostic React hook to manage state synchronized bidirectionally with URL search parameters.
 * Works out of the box with Vite, React Router, Remix, TanStack Router, Astro, and plain React.
 *
 * Features:
 * - **0ms UI Latency**: Local state updates instantaneously while URL navigation transitions asynchronously.
 * - **Microtask Batching**: Coalesces concurrent state updates within the same tick into a single navigation.
 * - **Race Condition Protection**: Never overwrites concurrently updated query parameters.
 * - **Debouncing**: Optional debounce delay to prevent flooding browser history during fast typing.
 * - **Clean URL Policy**: Strips default and empty values automatically to keep URLs pristine.
 * - **Multi-Reset Instant Sync**: Automatically clears local state when `useBatchQueryParams().resetAllParams()` is called.
 *
 * @param key The query string parameter name (e.g. `'q'`, `'page'`, `'sort'`).
 * @param parser The parser instance (e.g. `parseAsString`, `parseAsInteger`, etc.).
 * @param options Optional configuration for default values, debouncing, navigation history, and custom router adapter.
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
  const adapter: RouterAdapter = options?.adapter ?? vanillaAdapter;
  const [isPending, startTransition] = useTransition();

  const effectiveDefault = options?.defaultValue ?? parser.defaultValue;
  const debounceMs = options?.debounceMs ?? 0;
  const historyMode = options?.history ?? 'replace';
  const shouldScroll = options?.scroll ?? false;

  const currentParams = getCommittedSearchParams(adapter);
  const rawQueryValue = currentParams.get(key);
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

  // Register with coordinator for multi-hook sync, batch reset, and cancellation of pending timers
  useEffect(() => {
    return registerHook({
      key,
      reset: () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        const def = effectiveDefault as T;
        setInternalValue(def);
        latestValueRef.current = def;
        lastCommittedParamRef.current = null;
        lastKnownUrlParamRef.current = null;
      },
      setValueDirect: (val: any) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setInternalValue(val);
        latestValueRef.current = val;
      },
      cancelTimer: () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      getEffectiveDefault: () => effectiveDefault,
    });
  }, [key, effectiveDefault]);

  // Synchronize internal state when URL search params change externally (e.g. browser back/forward navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      const liveParams = getCommittedSearchParams(adapter);
      const currentParam = liveParams.get(key);

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
    };

    if (adapter.subscribe) {
      return adapter.subscribe(handleUrlChange);
    }
    return undefined;
  }, [adapter, key, parser, effectiveDefault]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commitToUrl = useCallback(
    (targetValue: T) => {
      let serialized: string | null = null;
      if (!isCleanValue(targetValue, effectiveDefault)) {
        const s = parser.serialize(targetValue);
        if (s !== '') {
          serialized = s;
        }
      }

      lastCommittedParamRef.current = serialized;

      startTransition(() => {
        commitUrlParam(
          key,
          serialized,
          { history: historyMode, scroll: shouldScroll },
          adapter
        );
      });
    },
    [key, parser, effectiveDefault, historyMode, shouldScroll, adapter, startTransition]
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
