import { RouterAdapter, NavigationOptions } from '../types';

const listeners = new Set<() => void>();

/**
 * Dispatch notification when URL changes through ParamSync.
 * Dispatches both standard popstate (for external listeners) and custom event.
 */
export function notifyUrlChange(): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('paramsync:navigate'));
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      // In non-standard environments, ignore event dispatch error
    }
  }
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  }
}

/**
 * Vanilla browser router adapter.
 * Uses window.location, window.history.pushState/replaceState, and popstate listeners.
 * 100% router-agnostic, zero external dependencies. Works in Vite, React Router, Remix, Astro, and plain React.
 */
export const vanillaAdapter: RouterAdapter = {
  getSearch: (): string => {
    if (typeof window !== 'undefined') {
      return window.location.search || '';
    }
    return '';
  },

  getPathname: (): string => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '';
    }
    return '';
  },

  navigate: (url: string, { history = 'replace', scroll = false }: NavigationOptions): void => {
    if (typeof window === 'undefined') return;

    if (history === 'push') {
      window.history.pushState(null, '', url);
    } else {
      window.history.replaceState(null, '', url);
    }

    if (scroll) {
      window.scrollTo(0, 0);
    }

    notifyUrlChange();
  },

  subscribe: (callback: () => void): (() => void) => {
    listeners.add(callback);

    if (typeof window !== 'undefined') {
      const handleEvent = () => callback();
      window.addEventListener('popstate', handleEvent);
      window.addEventListener('paramsync:navigate', handleEvent);

      return () => {
        listeners.delete(callback);
        window.removeEventListener('popstate', handleEvent);
        window.removeEventListener('paramsync:navigate', handleEvent);
      };
    }

    return () => {
      listeners.delete(callback);
    };
  },
};
