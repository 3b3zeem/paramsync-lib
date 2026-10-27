/**
 * paramsync - Zero-overhead, type-safe URL search params state manager for React.
 * Router-agnostic with built-in Vanilla browser support and specialized Next.js App Router entrypoint.
 */

// Parsers & Serializers Layer
export {
  type Parser,
  type ParserWithDefault,
  type NumberRange,
  type SortOrder,
  type SortOption,
  createParser,
  parseAsString,
  parseAsInteger,
  parseAsFloat,
  parseAsBoolean,
  parseAsStringLiteral,
  parseAsIsoDate,
  parseAsJson,
  parseAsArray,
  parseAsNumberRange,
  parseAsSort,
  safeDecode,
  safeEncode,
  areValuesEqual,
  isCleanValue,
} from './parsers';

// Types & Adapter Interface
export {
  type NavigationOptions,
  type RouterAdapter,
  type UseQueryStateOptions,
  type StateUpdater,
  type BatchNavigationOptions,
  type BatchParamDescriptor,
  type BatchParamValue,
  type BatchParamsRecord,
  type UseBatchQueryParamsOptions,
} from './types';

// Adapters Layer
export {
  vanillaAdapter,
  notifyUrlChange,
} from './adapters/vanilla';

// URL Manager Layer
export {
  getCommittedSearchParams,
  syncCommittedSearchParams,
  commitUrlParam,
  commitImmediateBatch,
  commitImmediateReset,
  batchUpdates,
  registerHook,
  notifyActiveHooksReset,
  notifyActiveHooksBatchUpdate,
} from './urlManager';

// Core Hooks (Router-Agnostic, default to Vanilla browser adapter)
export { useQueryState } from './useQueryState';
export { useBatchQueryParams } from './useBatchQueryParams';
