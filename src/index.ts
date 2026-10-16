/**
 * paramsync - Zero-overhead, type-safe URL search params state manager for React & Next.js App Router.
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
  parseAsArray,
  parseAsNumberRange,
  parseAsSort,
  areValuesEqual,
  isCleanValue,
} from './parsers';

// Single Hook Layer
export {
  type UseQueryStateOptions,
  type StateUpdater,
  useQueryState,
} from './useQueryState';

// Batch & Multi-Filter Layer
export {
  type BatchNavigationOptions,
  type BatchParamDescriptor,
  type BatchParamValue,
  type BatchParamsRecord,
  type UseBatchQueryParamsOptions,
  useBatchQueryParams,
} from './useBatchQueryParams';
