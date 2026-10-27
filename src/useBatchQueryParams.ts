"use client";

import { useCallback, useTransition } from "react";
import { Parser, isCleanValue } from "./parsers";
import {
  UseBatchQueryParamsOptions,
  BatchNavigationOptions,
  BatchParamsRecord,
  BatchParamDescriptor,
  RouterAdapter,
} from "./types";
import { vanillaAdapter } from "./adapters/vanilla";
import {
  commitImmediateBatch,
  commitImmediateReset,
  notifyActiveHooksReset,
  notifyActiveHooksBatchUpdate,
} from "./urlManager";

/**
 * Router-agnostic hook to execute batch updates or resets of URL query parameters in a single transition.
 * Ideal for "Apply Filters" buttons, filter drawers/modals, and wiping multiple parameters at once.
 *
 * Features:
 * - **Single Transition Navigation**: Commits multiple parameters simultaneously.
 * - **Instantaneous Multi-Reset**: Instantly resets the internal state of all active `useQueryState` hooks.
 * - **Router Agnostic**: Runs in any React environment (Vite, React Router, Remix, TanStack Router, Next.js).
 *
 * @param options Default navigation options and optional custom router adapter.
 *
 * @example
 * ```tsx
 * const { setBatchParams, resetAllParams, isPending } = useBatchQueryParams();
 *
 * // Batch update filters simultaneously
 * setBatchParams({
 *   category: 'shoes',
 *   page: 1,
 *   price: { value: { min: 20, max: 100 }, parser: parseAsNumberRange(0, 1000) },
 * });
 *
 * // Clear all filters while preserving tab and tracking parameters;
 * // also instantly resets local useQueryState hooks on the page!
 * resetAllParams(['tab', 'utm_source']);
 * ```
 */
export function useBatchQueryParams(options?: UseBatchQueryParamsOptions) {
  const adapter: RouterAdapter = options?.adapter ?? vanillaAdapter;
  const [isPending, startTransition] = useTransition();

  const defaultHistory = options?.history ?? "replace";
  const defaultScroll = options?.scroll ?? false;

  /**
   * Apply multiple parameter updates simultaneously in a single navigation transition.
   *
   * @param updates Object containing key/value pairs to set or delete.
   * @param navOptions Optional navigation overrides for this batch.
   */
  const setBatchParams = useCallback(
    (updates: BatchParamsRecord, navOptions?: BatchNavigationOptions) => {
      const serializedMap: Record<string, string | null> = {};

      for (const [key, rawEntry] of Object.entries(updates)) {
        let value: unknown = rawEntry;
        let parser: Parser<unknown> | undefined;
        let defaultValue: unknown = undefined;

        if (
          rawEntry !== null &&
          typeof rawEntry === "object" &&
          "value" in rawEntry &&
          !Array.isArray(rawEntry)
        ) {
          const descriptor = rawEntry as BatchParamDescriptor<unknown>;
          value = descriptor.value;
          parser = descriptor.parser;
          defaultValue = descriptor.defaultValue ?? parser?.defaultValue;
        }

        if (isCleanValue(value, defaultValue)) {
          serializedMap[key] = null;
        } else if (parser) {
          const serialized = parser.serialize(value);
          serializedMap[key] = serialized === "" ? null : serialized;
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            serializedMap[key] = null;
          } else {
            serializedMap[key] = value.map(String).join(",");
          }
        } else {
          serializedMap[key] = String(value);
        }
      }

      // Notify active hooks across the page so local state updates immediately (0ms UI latency)
      notifyActiveHooksBatchUpdate(updates);

      const historyMode = navOptions?.history ?? defaultHistory;
      const shouldScroll = navOptions?.scroll ?? defaultScroll;

      startTransition(() => {
        commitImmediateBatch(
          serializedMap,
          { history: historyMode, scroll: shouldScroll },
          adapter,
        );
      });
    },
    [adapter, defaultHistory, defaultScroll],
  );

  /**
   * Wipe all non-essential query parameters from the URL in one call.
   * Automatically clears the internal React state of active `useQueryState` hooks
   * on the page so the UI syncs instantaneously.
   *
   * @param preserveKeys List of query param keys to keep intact (e.g. `['tab', 'utm_source']`).
   * @param navOptions Optional navigation overrides.
   */
  const resetAllParams = useCallback(
    (preserveKeys: string[] = [], navOptions?: BatchNavigationOptions) => {
      // Instantly clear the internal state and cancel debounce timers for active hooks
      notifyActiveHooksReset(preserveKeys);

      const historyMode = navOptions?.history ?? defaultHistory;
      const shouldScroll = navOptions?.scroll ?? defaultScroll;

      startTransition(() => {
        commitImmediateReset(
          preserveKeys,
          { history: historyMode, scroll: shouldScroll },
          adapter,
        );
      });
    },
    [adapter, defaultHistory, defaultScroll],
  );

  return {
    setBatchParams,
    resetAllParams,
    isPending,
  };
}
