/**
 * Core Parser Interfaces and Built-in Parsers for `paramsync`.
 * Handles bi-directional conversion between URL query string parameters and typed React state.
 */

export interface Parser<T> {
  /**
   * Parse a raw URL query string value into a typed representation.
   * Receives `null` when the key is not present in the URL.
   */
  parse: (value: string | null) => T;

  /**
   * Convert a typed state value into a URL query parameter string.
   */
  serialize: (value: T) => string;

  /**
   * Optional default value associated with this parser.
   */
  defaultValue?: T;

  /**
   * Create a derived parser with an explicit non-null default value.
   */
  withDefault: (defaultValue: NonNullable<T>) => ParserWithDefault<NonNullable<T>>;
}

export interface ParserWithDefault<T> extends Parser<T> {
  readonly defaultValue: T;
}

/**
 * Factory to create custom parsers with seamless chaining and default value fallback.
 */
export function createParser<T>(options: {
  parse: (value: string | null) => T;
  serialize: (value: T) => string;
  defaultValue?: T;
}): Parser<T> {
  const parser: Parser<T> = {
    parse: (value: string | null): T => {
      const result = options.parse(value);
      if ((result === null || result === undefined) && options.defaultValue !== undefined) {
        return options.defaultValue;
      }
      return result;
    },
    serialize: options.serialize,
    defaultValue: options.defaultValue,
    withDefault(defaultValue: NonNullable<T>): ParserWithDefault<NonNullable<T>> {
      return {
        defaultValue,
        parse: (value: string | null): NonNullable<T> => {
          if (value === null || value === undefined) {
            return defaultValue;
          }
          const parsed = options.parse(value);
          if (parsed === null || parsed === undefined) {
            return defaultValue;
          }
          return parsed as NonNullable<T>;
        },
        serialize: (value: NonNullable<T>): string => {
          return options.serialize(value as unknown as T);
        },
        withDefault(nextDefault: NonNullable<T>): ParserWithDefault<NonNullable<T>> {
          return parser.withDefault(nextDefault);
        },
      };
    },
  };

  return parser;
}

/* ========================================================================== */
/*                             Primitive Parsers                              */
/* ========================================================================== */

/**
 * Parser for string parameters.
 * Parses raw string or returns `null` when missing.
 */
export const parseAsString: Parser<string | null> = createParser<string | null>({
  parse: (value) => value,
  serialize: (value) => (value !== null && value !== undefined ? String(value) : ''),
});

/**
 * Parser for integer numbers.
 * Validates strict integer representations (e.g. `42`, `-5`). Returns `null` on NaN or invalid strings.
 */
export const parseAsInteger: Parser<number | null> = createParser<number | null>({
  parse: (value) => {
    if (value === null || value === '') return null;
    const num = Number(value);
    return Number.isInteger(num) ? num : null;
  },
  serialize: (value) => (value !== null && value !== undefined ? Math.round(value).toString() : ''),
});

/**
 * Parser for floating-point numbers.
 * Supports decimal numbers (e.g. `3.14`, `-0.5`). Returns `null` on NaN or infinite numbers.
 */
export const parseAsFloat: Parser<number | null> = createParser<number | null>({
  parse: (value) => {
    if (value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  },
  serialize: (value) => (value !== null && value !== undefined ? String(value) : ''),
});

/**
 * Parser for boolean parameters.
 * Treats 'true' and '1' as `true`, 'false' and '0' as `false`. Returns `null` on unrecognized values.
 */
export const parseAsBoolean: Parser<boolean | null> = createParser<boolean | null>({
  parse: (value) => {
    if (value === null || value === '') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return null;
  },
  serialize: (value) => (value === true ? 'true' : value === false ? 'false' : ''),
});

/* ========================================================================== */
/*                             Complex Parsers                                */
/* ========================================================================== */

/**
 * Parser for arrays of values (e.g. `?tags=shoes,watches`).
 * Perfect for multi-select checkboxes, tags, and category chips.
 *
 * @param itemParser Parser instance for individual items
 * @param separator Custom delimiter (defaults to comma `,`)
 */
export function parseAsArray<T>(
  itemParser: Parser<T>,
  separator: string = ','
): ParserWithDefault<NonNullable<T>[]> {
  type ItemType = NonNullable<T>;
  return createParser<ItemType[]>({
    defaultValue: [],
    parse: (value: string | null): ItemType[] => {
      if (value === null || value === undefined || value.trim() === '') {
        return [];
      }
      const rawItems = value.split(separator);
      const results: ItemType[] = [];

      for (const raw of rawItems) {
        const parsed = itemParser.parse(raw);
        if (parsed !== null && parsed !== undefined) {
          results.push(parsed as ItemType);
        }
      }

      return results;
    },
    serialize: (value: ItemType[]): string => {
      if (!Array.isArray(value) || value.length === 0) {
        return '';
      }
      return value.map((item) => itemParser.serialize(item as unknown as T)).join(separator);
    },
  }) as ParserWithDefault<ItemType[]>;
}

export interface NumberRange {
  min: number;
  max: number;
}

/**
 * Parser for numeric range sliders and price bounds (e.g. `?price=100-500`).
 *
 * @param defaultMin Minimum range bound
 * @param defaultMax Maximum range bound
 * @param separator Delimiter between min and max (defaults to `-`)
 */
export function parseAsNumberRange(
  defaultMin: number,
  defaultMax: number,
  separator: string = '-'
): ParserWithDefault<NumberRange> {
  const defaultRange: NumberRange = { min: defaultMin, max: defaultMax };

  return createParser<NumberRange>({
    defaultValue: defaultRange,
    parse: (value: string | null): NumberRange => {
      if (!value || value.trim() === '') {
        return defaultRange;
      }

      const parts = value.split(separator);
      if (parts.length !== 2) {
        return defaultRange;
      }

      const min = Number(parts[0]);
      const max = Number(parts[1]);

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return defaultRange;
      }

      return { min, max };
    },
    serialize: (value: NumberRange): string => {
      if (
        !value ||
        typeof value.min !== 'number' ||
        typeof value.max !== 'number' ||
        (value.min === defaultMin && value.max === defaultMax)
      ) {
        return '';
      }
      return `${value.min}${separator}${value.max}`;
    },
  }) as ParserWithDefault<NumberRange>;
}

export type SortOrder = 'asc' | 'desc';

export interface SortOption<TField extends string = string> {
  field: TField;
  order: SortOrder;
}

/**
 * Parser for sorting configurations in data tables and feeds (e.g. `?sort=price.desc`).
 *
 * @param defaultField Initial sort field
 * @param defaultOrder Initial sort order (`'asc'` or `'desc'`)
 * @param separator Delimiter between field and order (defaults to `.`)
 */
export function parseAsSort<TField extends string = string>(
  defaultField: TField,
  defaultOrder: SortOrder = 'asc',
  separator: string = '.'
): ParserWithDefault<SortOption<TField>> {
  const defaultOption: SortOption<TField> = {
    field: defaultField,
    order: defaultOrder,
  };

  return createParser<SortOption<TField>>({
    defaultValue: defaultOption,
    parse: (value: string | null): SortOption<TField> => {
      if (!value || value.trim() === '') {
        return defaultOption;
      }

      const [field, rawOrder] = value.split(separator);
      if (!field) {
        return defaultOption;
      }

      const order: SortOrder =
        rawOrder === 'desc' || rawOrder === 'asc' ? rawOrder : defaultOrder;

      return {
        field: field as TField,
        order,
      };
    },
    serialize: (value: SortOption<TField>): string => {
      if (!value || !value.field) {
        return '';
      }
      if (value.field === defaultField && value.order === defaultOrder) {
        return '';
      }
      return `${value.field}${separator}${value.order}`;
    },
  }) as ParserWithDefault<SortOption<TField>>;
}

/* ========================================================================== */
/*                             Clean URL Helpers                              */
/* ========================================================================== */

/**
 * Deep equality comparator for state values against defaults.
 */
export function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => areValuesEqual(item, b[idx]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      areValuesEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

/**
 * Determines whether a value should be stripped from the URL query string under the Clean URL Policy.
 */
export function isCleanValue(value: unknown, defaultValue?: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (defaultValue !== undefined && areValuesEqual(value, defaultValue)) return true;
  return false;
}
