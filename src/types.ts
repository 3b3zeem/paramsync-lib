import { Parser } from './parsers';

export interface NavigationOptions {
  /**
   * Navigation method: 'replace' updates URL in-place; 'push' creates a new browser history entry.
   * @default 'replace'
   */
  history?: 'replace' | 'push';

  /**
   * Whether to scroll to the top of the page after URL update.
   * @default false
   */
  scroll?: boolean;
}

export interface RouterAdapter {
  /**
   * Get the current query string (e.g. `"?page=2"` or `""`).
   */
  getSearch: () => string;

  /**
   * Get the current pathname (e.g. `"/dashboard"`).
   */
  getPathname: () => string;

  /**
   * Navigate to a new URL using the adapter's routing mechanism.
   */
  navigate: (url: string, options: NavigationOptions) => void;

  /**
   * Optional subscription to external URL changes (e.g. popstate or router navigation).
   */
  subscribe?: (callback: () => void) => () => void;

  /**
   * Optional transition wrapper (e.g. React startTransition).
   */
  startTransition?: (cb: () => void) => void;
}

export interface UseQueryStateOptions<T> extends NavigationOptions {
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
   * Custom router adapter if not using default.
   */
  adapter?: RouterAdapter;
}

export type StateUpdater<T> = T | ((prev: T) => T);

export interface BatchNavigationOptions extends NavigationOptions {}

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

export interface UseBatchQueryParamsOptions extends BatchNavigationOptions {
  /**
   * Custom router adapter if not using default.
   */
  adapter?: RouterAdapter;
}
