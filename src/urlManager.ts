import { RouterAdapter, NavigationOptions } from './types';

export interface RegisteredHook {
  key: string;
  reset: () => void;
  setValueDirect: (value: any) => void;
  cancelTimer: () => void;
  getEffectiveDefault: () => any;
}

// Active hook instances across the current page
const activeHooks = new Set<RegisteredHook>();

/**
 * Register a useQueryState hook instance for cross-hook synchronization and multi-reset.
 */
export function registerHook(hook: RegisteredHook): () => void {
  activeHooks.add(hook);
  return () => {
    activeHooks.delete(hook);
  };
}

/**
 * Immediately reset internal state of active hooks not in preserveKeys.
 * Ensures instantaneous UI feedback (0ms latency) without waiting for URL navigation.
 */
export function notifyActiveHooksReset(preserveKeys: string[] = []): void {
  const preserveSet = new Set(preserveKeys);
  for (const hook of activeHooks) {
    if (!preserveSet.has(hook.key)) {
      hook.cancelTimer();
      hook.reset();
    }
  }
}

/**
 * Immediately update internal state of active hooks matching batch updates.
 */
export function notifyActiveHooksBatchUpdate(updates: Record<string, any>): void {
  for (const hook of activeHooks) {
    if (hook.key in updates) {
      hook.cancelTimer();
      const rawEntry = updates[hook.key];
      const val =
        rawEntry !== null &&
        typeof rawEntry === 'object' &&
        'value' in rawEntry &&
        !Array.isArray(rawEntry)
          ? rawEntry.value
          : rawEntry;
      hook.setValueDirect(val);
    }
  }
}

// In-memory representation of committed search params to prevent stale closure overwrites
let committedSearchParams: URLSearchParams | null = null;
let lastKnownSearchString: string | null = null;

// Batch queue tracking for coalescing simultaneous updates
let isBatching = false;
const pendingBatch = new Map<string, string | null>();
let pendingHistory: 'replace' | 'push' = 'replace';
let pendingScroll: boolean = false;
let pendingAdapter: RouterAdapter | null = null;

/**
 * Get current search parameters, prioritizing in-memory committed updates,
 * live adapter search string, or browser searchParams.
 */
export function getCommittedSearchParams(adapter?: RouterAdapter): URLSearchParams {
  const adapterSearch = adapter ? adapter.getSearch() : '';
  const windowSearch = typeof window !== 'undefined' ? window.location.search || '' : '';

  // Prioritize adapter search (e.g. from Next.js searchParams), falling back to window.location.search
  const currentExternalSearch = adapterSearch || windowSearch;

  // If external navigation happened out-of-band (e.g. browser back/forward or new searchParams), resync
  if (lastKnownSearchString !== null && currentExternalSearch !== lastKnownSearchString) {
    committedSearchParams = new URLSearchParams(currentExternalSearch);
    lastKnownSearchString = currentExternalSearch;
    return new URLSearchParams(committedSearchParams);
  }

  if (!committedSearchParams) {
    committedSearchParams = new URLSearchParams(currentExternalSearch);
    lastKnownSearchString = currentExternalSearch;
  }

  return new URLSearchParams(committedSearchParams);
}

/**
 * Synchronize the in-memory committed params with a new search string.
 */
export function syncCommittedSearchParams(search: string): void {
  committedSearchParams = new URLSearchParams(search);
  lastKnownSearchString = search;
}

/**
 * Executes a single parameter commit to the URL.
 * Guarantees that concurrent or sequential updates (e.g. immediate page update followed by
 * debounced search commit) build on top of each other without overwriting parameters.
 */
export function commitUrlParam(
  key: string,
  serialized: string | null,
  options: NavigationOptions,
  adapter: RouterAdapter
): void {
  if (isBatching) {
    pendingBatch.set(key, serialized);
    if (options.history === 'push') pendingHistory = 'push';
    if (options.scroll) pendingScroll = true;
    pendingAdapter = adapter;
    return;
  }

  const currentParams = getCommittedSearchParams(adapter);

  if (serialized === null || serialized === '') {
    currentParams.delete(key);
  } else {
    currentParams.set(key, serialized);
  }

  committedSearchParams = currentParams;

  const queryString = currentParams.toString();
  const pathname = adapter.getPathname();
  const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
  lastKnownSearchString = queryString ? `?${queryString}` : '';

  // Synchronize window.location in browser/JSDOM environments
  if (typeof window !== 'undefined' && window.location) {
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {
      // Ignore in mock environments
    }
  }

  adapter.navigate(nextUrl, options);
}

/**
 * Execute an immediate batch update (for useBatchQueryParams).
 */
export function commitImmediateBatch(
  updates: Record<string, string | null>,
  options: NavigationOptions,
  adapter: RouterAdapter
): void {
  const currentParams = getCommittedSearchParams(adapter);

  for (const [key, serialized] of Object.entries(updates)) {
    if (serialized === null || serialized === '') {
      currentParams.delete(key);
    } else {
      currentParams.set(key, serialized);
    }
  }

  committedSearchParams = currentParams;
  const queryString = currentParams.toString();
  const pathname = adapter.getPathname();
  const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
  lastKnownSearchString = queryString ? `?${queryString}` : '';

  if (typeof window !== 'undefined' && window.location) {
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {}
  }

  adapter.navigate(nextUrl, options);
}

/**
 * Execute an immediate reset of all query parameters except preserveKeys.
 */
export function commitImmediateReset(
  preserveKeys: string[],
  options: NavigationOptions,
  adapter: RouterAdapter
): void {
  const currentParams = getCommittedSearchParams(adapter);
  const preserveSet = new Set(preserveKeys);

  const allKeys = Array.from(currentParams.keys());
  for (const key of allKeys) {
    if (!preserveSet.has(key)) {
      currentParams.delete(key);
    }
  }

  committedSearchParams = currentParams;
  const queryString = currentParams.toString();
  const pathname = adapter.getPathname();
  const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
  lastKnownSearchString = queryString ? `?${queryString}` : '';

  if (typeof window !== 'undefined' && window.location) {
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {}
  }

  adapter.navigate(nextUrl, options);
}

/**
 * Batch multiple useQueryState calls into a single browser navigation transition.
 *
 * @example
 * ```ts
 * batchUpdates(() => {
 *   setSearch('laptop');
 *   setPage(1);
 * });
 * ```
 */
export function batchUpdates(fn: () => void): void {
  isBatching = true;
  pendingBatch.clear();
  pendingHistory = 'replace';
  pendingScroll = false;
  pendingAdapter = null;

  try {
    fn();
  } finally {
    isBatching = false;
    if (pendingAdapter && pendingBatch.size > 0) {
      const updates: Record<string, string | null> = {};
      for (const [k, v] of pendingBatch.entries()) {
        updates[k] = v;
      }
      commitImmediateBatch(
        updates,
        { history: pendingHistory, scroll: pendingScroll },
        pendingAdapter
      );
    }
    pendingBatch.clear();
    pendingAdapter = null;
  }
}

/**
 * Helper to reset in-memory state (useful for test isolation).
 */
export function resetUrlManagerForTesting(): void {
  committedSearchParams = null;
  lastKnownSearchString = null;
  isBatching = false;
  pendingBatch.clear();
  pendingHistory = 'replace';
  pendingScroll = false;
  pendingAdapter = null;
  activeHooks.clear();
  if (typeof window !== 'undefined' && window.history) {
    try {
      window.history.replaceState(null, '', '/');
    } catch {}
  }
}
