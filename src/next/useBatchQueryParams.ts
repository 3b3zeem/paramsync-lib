'use client';

import { UseBatchQueryParamsOptions } from '../types';
import { useBatchQueryParams as useCoreBatchQueryParams } from '../useBatchQueryParams';
import { useNextAdapter } from './adapter';

/**
 * Next.js App Router optimized hook to execute batch updates or resets of URL query parameters.
 * Integrates with Next.js transitions and navigation.
 *
 * @param options Default navigation options for this batch hook instance.
 */
export function useBatchQueryParams(options?: UseBatchQueryParamsOptions) {
  const { adapter, isPending: isNextPending } = useNextAdapter();
  const { setBatchParams, resetAllParams, isPending: isCorePending } = useCoreBatchQueryParams({
    ...options,
    adapter,
  });

  return {
    setBatchParams,
    resetAllParams,
    isPending: isNextPending || isCorePending,
  };
}
