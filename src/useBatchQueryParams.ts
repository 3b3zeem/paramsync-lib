'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Parser, isCleanValue } from './parsers';

export interface BatchNavigationOptions {
  /**
   * Navigation method: 'replace' updates in-place; 'push' creates a new browser history entry.
   * @default 'replace'
   */
  history?: 'replace' | 'push';

  /**
   * Whether to scroll to top of page on update.
   * @default false
   */
  scroll?: boolean;
}

/**
 * Parameter descriptor for batch updates requiring explicit parser serialization or custom defaults.
 */
export interface BatchParamDescriptor<T = any> {
  value: T;
  parser?: Parser<any>;
  defaultValue?: T;
}

export type BatchParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | unknown[]
  | BatchParamDescriptor<any>;

export type BatchParamsRecord = Record<string, BatchParamValue>;

export interface UseBatchQueryParamsOptions extends BatchNavigationOptions {}

/**
 * Hook to execute batch updates to URL query parameters in a single transition.
 * Ideal for "Apply Filters" buttons, filter drawers/modals, and wiping multiple parameters at once.
 *
 * @param options Default navigation options for this hook instance.
 *
 * @example
 * ```tsx
 * const { setBatchParams, resetAllParams, isPending } = useBatchQueryParams();
 *
 * // Batch update filters simultaneously in one transition
 * setBatchParams({
 *   category: 'shoes',
 *   page: 1,
 *   price: { value: { min: 20, max: 100 }, parser: parseAsNumberRange(0, 1000) },
 * });
 *
 * // Clear filters while preserving tab and tracking parameters
 * resetAllParams(['tab', 'utm_source']);
 * ```
 */
export function useBatchQueryParams(options?: UseBatchQueryParamsOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const defaultHistory = options?.history ?? 'replace';
  const defaultScroll = options?.scroll ?? false;

  /**
   * Apply multiple parameter updates simultaneously in a single navigation transition.
   *
   * @param updates Object containing key/value pairs to set or delete.
   * @param navOptions Optional navigation overrides for this batch.
   */
  const setBatchParams = useCallback(
    (updates: BatchParamsRecord, navOptions?: BatchNavigationOptions) => {
      const currentParams = new URLSearchParams(
        searchParams ? searchParams.toString() : ''
      );

      for (const [key, rawEntry] of Object.entries(updates)) {
        let value: unknown = rawEntry;
        let parser: Parser<unknown> | undefined;
        let defaultValue: unknown = undefined;

        if (
          rawEntry !== null &&
          typeof rawEntry === 'object' &&
          'value' in rawEntry &&
          !Array.isArray(rawEntry)
        ) {
          const descriptor = rawEntry as BatchParamDescriptor<unknown>;
          value = descriptor.value;
          parser = descriptor.parser;
          defaultValue = descriptor.defaultValue ?? parser?.defaultValue;
        }

        if (isCleanValue(value, defaultValue)) {
          currentParams.delete(key);
        } else if (parser) {
          const serialized = parser.serialize(value);
          if (serialized === '') {
            currentParams.delete(key);
          } else {
            currentParams.set(key, serialized);
          }
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            currentParams.delete(key);
          } else {
            currentParams.set(key, value.map(String).join(','));
          }
        } else {
          currentParams.set(key, String(value));
        }
      }

      const queryString = currentParams.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      const historyMode = navOptions?.history ?? defaultHistory;
      const shouldScroll = navOptions?.scroll ?? defaultScroll;

      startTransition(() => {
        if (historyMode === 'push') {
          router.push(nextUrl, { scroll: shouldScroll });
        } else {
          router.replace(nextUrl, { scroll: shouldScroll });
        }
      });
    },
    [searchParams, pathname, defaultHistory, defaultScroll, router]
  );

  /**
   * Wipe all non-essential query parameters from the URL in one call.
   *
   * @param preserveKeys List of query param keys to keep intact (e.g. `['tab', 'utm_source']`).
   * @param navOptions Optional navigation overrides.
   */
  const resetAllParams = useCallback(
    (preserveKeys: string[] = [], navOptions?: BatchNavigationOptions) => {
      const currentParams = new URLSearchParams(
        searchParams ? searchParams.toString() : ''
      );
      const preserveSet = new Set(preserveKeys);

      const allKeys = Array.from(currentParams.keys());
      for (const key of allKeys) {
        if (!preserveSet.has(key)) {
          currentParams.delete(key);
        }
      }

      const queryString = currentParams.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      const historyMode = navOptions?.history ?? defaultHistory;
      const shouldScroll = navOptions?.scroll ?? defaultScroll;

      startTransition(() => {
        if (historyMode === 'push') {
          router.push(nextUrl, { scroll: shouldScroll });
        } else {
          router.replace(nextUrl, { scroll: shouldScroll });
        }
      });
    },
    [searchParams, pathname, defaultHistory, defaultScroll, router]
  );

  return {
    setBatchParams,
    resetAllParams,
    isPending,
  };
}
