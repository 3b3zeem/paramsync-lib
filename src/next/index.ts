'use client';

/**
 * paramsync/next - Specialized entrypoint for Next.js App Router.
 * Full integration with Next.js navigation (useRouter, usePathname, useSearchParams, useTransition).
 */

export * from '../parsers';
export * from '../types';
export { useQueryState } from './useQueryState';
export { useBatchQueryParams } from './useBatchQueryParams';
export { useNextAdapter, type UseNextAdapterResult } from './adapter';
