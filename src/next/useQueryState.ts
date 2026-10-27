'use client';

import { Parser, ParserWithDefault } from '../parsers';
import { UseQueryStateOptions, StateUpdater } from '../types';
import { useQueryState as useCoreQueryState } from '../useQueryState';
import { useNextAdapter } from './adapter';

/**
 * Next.js App Router optimized hook for bidirectional URL search parameter state synchronization.
 * Integrates directly with Next.js `useRouter`, `usePathname`, `useSearchParams`, and `useTransition`.
 *
 * @param key The query string parameter name.
 * @param parser The parser instance (e.g. `parseAsString`, `parseAsInteger`, etc.).
 * @param options Configuration for defaults, debouncing, navigation history, and scroll behavior.
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
  const { adapter, isPending: isNextPending } = useNextAdapter();
  const [val, setVal, reset, isCorePending] = useCoreQueryState(key, parser as any, {
    ...options,
    adapter,
  });

  return [val, setVal, reset, isNextPending || isCorePending] as const;
}
