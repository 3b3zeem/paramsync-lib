'use client';

import { useMemo, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RouterAdapter, NavigationOptions } from '../types';

export interface UseNextAdapterResult {
  adapter: RouterAdapter;
  isPending: boolean;
  startTransition: (cb: () => void) => void;
}

/**
 * Adapter hook for Next.js App Router.
 * Connects `next/navigation` hooks (`useRouter`, `usePathname`, `useSearchParams`)
 * with ParamSync's RouterAdapter interface.
 */
export function useNextAdapter(): UseNextAdapterResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const adapter = useMemo<RouterAdapter>(() => {
    return {
      getSearch: (): string => {
        if (searchParams) {
          const str = searchParams.toString();
          if (str) return str.startsWith('?') ? str : `?${str}`;
        }
        if (typeof window !== 'undefined' && window.location.search) {
          return window.location.search;
        }
        return '';
      },

      getPathname: (): string => {
        if (pathname) return pathname;
        if (typeof window !== 'undefined') return window.location.pathname;
        return '';
      },

      navigate: (url: string, { history = 'replace', scroll = false }: NavigationOptions): void => {
        startTransition(() => {
          if (history === 'push') {
            router.push(url, { scroll });
          } else {
            router.replace(url, { scroll });
          }
        });
      },

      subscribe: (callback: () => void): (() => void) => {
        if (typeof window !== 'undefined') {
          const handleEvent = () => callback();
          window.addEventListener('popstate', handleEvent);
          window.addEventListener('paramsync:navigate', handleEvent);

          return () => {
            window.removeEventListener('popstate', handleEvent);
            window.removeEventListener('paramsync:navigate', handleEvent);
          };
        }
        return () => {};
      },

      startTransition,
    };
  }, [router, pathname, searchParams, startTransition]);

  // When Next.js searchParams change, notify any listeners
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('paramsync:navigate'));
    }
  }, [searchParams]);

  return { adapter, isPending, startTransition };
}
