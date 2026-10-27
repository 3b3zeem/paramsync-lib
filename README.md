# paramsync

> **Zero-overhead, type-safe URL Search Params state manager for React (Vite, React Router, Remix, TanStack Router) and Next.js (App Router).**  
> Designed for live search inputs, multi-attribute facet filtering, price/metric range sliders, data table sorting, pagination, and modal filter drawers.

[![npm version](https://img.shields.io/npm/v/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://www.npmjs.com/package/paramsync)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![Dual ESM/CJS](https://img.shields.io/badge/Module-Dual%20ESM%2FCJS-orange.svg)](#)
[![Router Agnostic](https://img.shields.io/badge/Router-Agnostic%20%2B%20Next.js-purple.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docs & Demo](https://img.shields.io/badge/Docs%20%26%20Demo-paramsync.vercel.app-7c3aed.svg)](https://paramsync.vercel.app)

🌐 **Live Demo & Interactive Documentation:** [https://paramsync.vercel.app](https://paramsync.vercel.app)

---

## Table of Contents

1. [Overview & Key Advantages](#1-overview--key-advantages)
2. [Installation & Entrypoints](#2-installation--entrypoints)
   - [Router-Agnostic Setup (Vite, React Router, Remix, Astro)](#router-agnostic-setup)
   - [Next.js App Router Setup (`paramsync/next`)](#nextjs-app-router-setup)
3. [Quick Reference Cheatsheet](#3-quick-reference-cheatsheet)
4. [Quick Start Tutorial](#4-quick-start-tutorial)
5. [In-Depth Parsers Reference](#5-in-depth-parsers-reference)
   - [Parser Core Interfaces](#parser-core-interfaces)
   - [createParser Factory](#createparser-factory)
   - [parseAsString](#parseasstring)
   - [parseAsStringLiteral](#parseasstringliteral)
   - [parseAsIsoDate](#parseasisodate)
   - [parseAsJson](#parseasjson)
   - [parseAsInteger](#parseasinteger)
   - [parseAsFloat](#parseasfloat)
   - [parseAsBoolean](#parseasboolean)
   - [parseAsArray](#parseasarray)
   - [parseAsNumberRange](#parseasnumberrange)
   - [parseAsSort](#parseassort)
   - [Clean URL Utility Helpers](#clean-url-utility-helpers)
   - [Safe URL Decoding & Arabic Unicode Support](#safe-url-decoding--arabic-unicode-support)
6. [In-Depth Hooks Reference](#6-in-depth-hooks-reference)
   - [useQueryState](#usequerystate)
     - [Function Signature & Type Overloads](#function-signature--type-overloads)
     - [Options Reference](#options-reference)
     - [Return Values Reference](#return-values-reference)
     - [Functional State Updates](#functional-state-updates)
     - [Race Condition & Stale searchParams Protection](#race-condition--stale-searchparams-protection)
   - [useBatchQueryParams](#usebatchqueryparams)
     - [Function Signature](#usebatchqueryparams-signature)
     - [BatchParamDescriptor](#batchparamdescriptor)
     - [setBatchParams](#setbatchparams)
     - [resetAllParams (Instant UI State Reset)](#resetallparams)
   - [batchUpdates Utility](#batchupdates-utility)
7. [Clean URL Policy: Complete Specification](#7-clean-url-policy-complete-specification)
8. [Architecture & Data Fetching Patterns](#8-architecture--data-fetching-patterns)
9. [Dynamic Facet Filters from API](#9-dynamic-facet-filters-from-api)
10. [Pagination Coordination & Stale Page Prevention](#10-pagination-coordination--stale-page-prevention)
11. [Complete Production Recipes](#11-complete-production-recipes)
12. [TypeScript System & Type Narrowing](#12-typescript-system--type-narrowing)
13. [Next.js App Router Best Practices & Gotchas](#13-nextjs-app-router-best-practices--gotchas)
14. [Testing & Verification](#14-testing--verification)
15. [License](#15-license)

---

## 1. Overview & Key Advantages

Binding UI state to URL query parameters is essential for building modern web applications where search, filters, sorting, and pagination are bookmarkable and shareable. However, standard solutions often cause keystroke latency, excessive URL clutter, race conditions between debounced and immediate inputs, and heavy router coupling.

`paramsync` is architected from the ground up to solve these challenges:

- **Zero Typing Lag (Optimistic Local State):** Controlled inputs update internal React state immediately (`0ms`), ensuring smooth keystroke responsiveness while URL navigation is debounced or scheduled asynchronously.
- **Race Condition & Overwrite Protection:** Centralized in-memory URL coordinator guarantees that debounced search commits never wipe out immediate pagination clicks or concurrent parameter changes.
- **Router-Agnostic Core:** Works in **any** React application (Vite, React Router, Remix, Astro, TanStack Router) with built-in Vanilla browser history support and zero external router dependencies.
- **Dedicated Next.js App Router Entrypoint (`paramsync/next`):** Deep integration with Next.js router transitions, `useTransition`, and Server Components (RSC).
- **Instantaneous Multi-Reset (0ms Latency):** Calling `useBatchQueryParams().resetAllParams()` immediately resets internal state across all active `useQueryState` hooks and cancels pending debounce timers without waiting for router transitions.
- **Clean URL Policy:** Automatically purges query parameters when their values match defaults, are empty strings (`""`), or are empty arrays (`[]`).
- **Safe URI Decoding & Arabic/Unicode Support:** Handles Arabic characters, unicode, and malformed percent encodings (`URIError`) safely with internal try/catch guards.
- **Strict TypeScript Inference:** Generic parsers automatically infer non-nullable types when chaining `.withDefault()`.
- **Zero External Runtime Overhead:** Only peer-depends on `react` (with `next` being optional).

---

## 2. Installation & Entrypoints

```bash
npm install paramsync
# or
pnpm add paramsync
# or
yarn add paramsync
```

### Peer Dependencies
- `react`: `>=18.0.0`
- `next`: `>=13.0.0` (*Optional* — only needed when importing from `paramsync/next`)

### Dedicated Entrypoints

#### Router-Agnostic Setup (Vite, React Router, Remix, TanStack, Astro)
The default root entrypoint has zero dependencies on `next`:
```tsx
import { useQueryState, useBatchQueryParams, parseAsString } from 'paramsync';
```

#### Next.js App Router Setup
For Next.js App Router with Server Component transitions:
```tsx
import { useQueryState, useBatchQueryParams, parseAsString } from 'paramsync/next';
```

---

## 3. Quick Reference Cheatsheet

### Parsers

| Parser | Parse Signature | Serialize Signature | Default Value Support | Clean URL Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `parseAsString` | `string \| null` | `string` | `.withDefault(string)` | Removed if `""` or default |
| `parseAsStringLiteral(allowed)` | `T \| null` | `string` | `.withDefault(T)` | Removed if invalid or default |
| `parseAsIsoDate` | `Date \| null` | `string` (`YYYY-MM-DD`) | `.withDefault(Date)` | Removed if matches default |
| `parseAsJson<T>(validator?)` | `T \| null` | `string` (JSON) | `.withDefault(T)` | Removed if matches default |
| `parseAsInteger` | `number \| null` | `string` | `.withDefault(number)` | Removed if default |
| `parseAsFloat` | `number \| null` | `string` | `.withDefault(number)` | Removed if default |
| `parseAsBoolean` | `boolean \| null` | `string` | `.withDefault(boolean)` | Removed if default |
| `parseAsArray(itemParser, sep?)` | `T[]` | `string` | `.withDefault(T[])` | Removed if `[]` or default |
| `parseAsNumberRange(min, max, sep?)` | `NumberRange` | `string` | Built-in `{ min, max }` | Removed if matches bounds |
| `parseAsSort(field, order?, sep?)` | `SortOption<TField>` | `string` | Built-in `{ field, order }` | Removed if matches default |
| `createParser(config)` | `T` | `string` | `.withDefault(T)` | Removed if matches default |

### Hooks & Utilities

| Hook / Utility | Signature | Primary Purpose |
| :--- | :--- | :--- |
| `useQueryState(key, parser, options?)` | `[value, setValue, reset, isPending]` | Reactive single-parameter state management with instant typing. |
| `useBatchQueryParams(options?)` | `{ setBatchParams, resetAllParams, isPending }` | Multi-parameter batch updates & instant UI reset across hooks. |
| `batchUpdates(fn)` | `(fn: () => void) => void` | Coalesces multiple `useQueryState` updates into a single navigation. |

---

## 4. Quick Start Tutorial

Here is a minimal, fully functioning client component showing live search with debounce and pagination:

```tsx
'use client';

import React from 'react';
import { useQueryState, parseAsString, parseAsInteger } from 'paramsync';

export default function ProductCatalog() {
  // 1. Live search with 300ms debounce
  const [search, setSearch, resetSearch, isSearchPending] = useQueryState(
    'q',
    parseAsString.withDefault(''),
    { debounceMs: 300 }
  );

  // 2. Integer pagination parameter
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Catalog</h1>

      {/* Live search input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setPage(1); // Reset page on new search
            setSearch(e.target.value);
          }}
          placeholder="Search items..."
        />
        {search && <button onClick={resetSearch}>Clear</button>}
        {isSearchPending && <span>Updating...</span>}
      </div>

      {/* Pagination controls */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((current) => current + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## 5. In-Depth Parsers Reference

### Parser Core Interfaces

All parsers conform to the `Parser<T>` interface:

```typescript
export interface Parser<T> {
  parse: (value: string | null) => T;
  serialize: (value: T) => string;
  defaultValue?: T;
  withDefault: (defaultValue: NonNullable<T>) => ParserWithDefault<NonNullable<T>>;
}

export interface ParserWithDefault<T> extends Parser<T> {
  readonly defaultValue: T;
}
```

When you chain `.withDefault(fallback)`, the return type narrows from `T | null` to `T`:

```typescript
// Type: Parser<string | null>
const nullableParser = parseAsString;

// Type: ParserWithDefault<string> (NonNullable)
const strictParser = parseAsString.withDefault('');
```

---

### `createParser` Factory

The `createParser` function allows you to define custom parsers for dates, JSON objects, coordinates, or domain-specific data structures:

```typescript
import { createParser } from 'paramsync';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export const parseAsGeoPoint = createParser<GeoPoint | null>({
  parse: (raw) => {
    if (!raw) return null;
    const [latStr, lngStr] = raw.split(',');
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  },
  serialize: (point) => {
    if (!point) return '';
    return `${point.lat},${point.lng}`;
  },
});
```

Usage:

```tsx
const [coords, setCoords] = useQueryState('loc', parseAsGeoPoint);
```

---

### `parseAsString`

Parses raw query strings.

- **Parsing Behavior:** Returns the raw string value. Returns `null` if the parameter does not exist in the URL query string.
- **Serialization Behavior:** Converts strings to their text representation. Serializes `null` or `undefined` as `""`.
- **Clean URL Policy:** Deletes the key if the value is empty `""` or matches `defaultValue`.

```tsx
import { useQueryState, parseAsString } from 'paramsync';

// Returns: string | null
const [category, setCategory] = useQueryState('cat', parseAsString);

// Returns: string (always defined)
const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
```

---

### `parseAsStringLiteral`

Type-safe parser for string literal unions (enums, statuses, tabs). Guarantees complete TypeScript inference without manual type casting (`as ...`). Automatically falls back to the default value if an unrecognized or invalid value is placed in the URL.

- **Signature:** `parseAsStringLiteral<T extends string>(allowedValues: readonly T[] | T[]): Parser<T | null>`
- **Parsing Behavior:** Returns the value as `T` if it matches one of `allowedValues`. Returns `null` (or fallback default) if missing or invalid.
- **Clean URL Policy:** Deletes the key if the value matches `defaultValue` or is invalid.

```tsx
import { useQueryState, parseAsStringLiteral } from 'paramsync';

type Status = 'all' | 'pending' | 'accepted' | 'rejected';

// Fully typed as 'all' | 'pending' | 'accepted' | 'rejected' without casting!
const [status, setStatus] = useQueryState(
  'status',
  parseAsStringLiteral(['all', 'pending', 'accepted', 'rejected'] as const).withDefault('all')
);

// If URL has ?status=hacked, status automatically reverts to 'all'!
```

---

### `parseAsIsoDate`

Converts calendar dates between JavaScript `Date` objects and `YYYY-MM-DD` query parameter strings. Features strict validation of calendar boundaries, valid months (1-12), days (1-31), and leap years.

- **Signature:** `parseAsIsoDate: Parser<Date | null>`
- **Parsing Behavior:** Parses `YYYY-MM-DD` string into a `Date` object. Returns `null` on invalid strings or non-existent dates (like Feb 31).
- **Serialization Behavior:** Formats the `Date` as `YYYY-MM-DD`.
- **Clean URL Policy:** Omits parameter if date matches `defaultValue` (uses millisecond comparison).

```tsx
import { useQueryState, parseAsIsoDate } from 'paramsync';

// URL: ?date_from=2026-10-27
const [startDate, setStartDate] = useQueryState(
  'date_from',
  parseAsIsoDate.withDefault(new Date(2026, 0, 1))
);

// Updates URL to ?date_from=2026-11-15
setStartDate(new Date(2026, 10, 15));
```

---

### `parseAsJson`

Safely serializes and deserializes structured objects or complex filter configurations using `JSON.stringify` and `JSON.parse`. Features built-in try/catch guards against syntax errors and malformed URIs.

- **Signature:** `parseAsJson<T>(validator?: (data: unknown) => boolean): Parser<T | null>`
- **Parsing Behavior:** Parses JSON string into typed object `T`. Returns `null` or fallback on syntax error or failed validation.
- **Serialization Behavior:** Converts object to JSON string.
- **Clean URL Policy:** Deletes parameter when matching `defaultValue` (uses deep equality).

```tsx
import { useQueryState, parseAsJson } from 'paramsync';

interface FilterConfig {
  role: string;
  minRating: number;
}

const [filters, setFilters] = useQueryState(
  'f',
  parseAsJson<FilterConfig>().withDefault({ role: 'all', minRating: 0 })
);

// URL: ?f=%7B%22role%22%3A%22admin%22%2C%22minRating%22%3A4%7D
setFilters({ role: 'admin', minRating: 4 });
```

---

### `parseAsInteger`

Parses strictly formatted integer values.

- **Parsing Behavior:** Converts numeric strings to base-10 integers. Rejects decimals (`4.5`), text (`abc`), and mixed formats (`42px`), returning `null` or your default value.
- **Serialization Behavior:** Uses `Math.round(val).toString()`.
- **Clean URL Policy:** Deletes the key if the value matches `defaultValue`.

```tsx
import { useQueryState, parseAsInteger } from 'paramsync';

// Returns: number (defaults to 1)
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

// Incremental updates
setPage((prev) => prev + 1);
```

---

### `parseAsFloat`

Parses floating-point decimal numbers.

- **Parsing Behavior:** Validates that `Number(val)` is finite. Returns `null` on `NaN` or non-numeric strings.
- **Serialization Behavior:** Uses `String(val)`.
- **Clean URL Policy:** Deletes the key if the value matches `defaultValue`.

```tsx
import { useQueryState, parseAsFloat } from 'paramsync';

// Returns: number
const [minRating, setMinRating] = useQueryState('rating', parseAsFloat.withDefault(4.0));
```

---

### `parseAsBoolean`

Parses boolean query parameters.

- **Parsing Behavior:** Recognizes `'true'` and `'1'` as `true`. Recognizes `'false'` and `'0'` as `false`. Returns `null` for any other string.
- **Serialization Behavior:** Returns `'true'` or `'false'`.
- **Clean URL Policy:** Deletes the key if the value matches `defaultValue`.

```tsx
import { useQueryState, parseAsBoolean } from 'paramsync';

const [inStockOnly, setInStockOnly] = useQueryState(
  'inStock',
  parseAsBoolean.withDefault(false)
);
```

---

### `parseAsArray`

Parses delimited lists into typed JavaScript arrays.

- **Signature:** `parseAsArray<T>(itemParser: Parser<T>, separator = ','): ParserWithDefault<T[]>`
- **Parsing Behavior:** Splits raw query string by `separator`, parses each item with `itemParser.parse()`, and filters out any `null` elements. Returns `[]` on missing or empty parameters.
- **Serialization Behavior:** Maps items using `itemParser.serialize()` and joins them with `separator`. Returns `""` if array is empty.
- **Clean URL Policy:** Deletes the key if the array is empty `[]` or matches `defaultValue`.

```tsx
import { useQueryState, parseAsArray, parseAsString } from 'paramsync';

// URL: ?tags=shoes,watches,sale
const [tags, setTags] = useQueryState('tags', parseAsArray(parseAsString));

// Toggle item in array
const toggleTag = (tag: string) => {
  setTags((prev) =>
    prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
  );
};
```

Using custom separators:

```tsx
// URL: ?ids=10|20|30
const [ids, setIds] = useQueryState('ids', parseAsArray(parseAsInteger, '|'));
```

---

### `parseAsNumberRange`

Parses numeric range bounds for sliders and budget filters.

- **Signature:** `parseAsNumberRange(defaultMin: number, defaultMax: number, separator = '-'): ParserWithDefault<NumberRange>`
- **Type:**
  ```typescript
  export interface NumberRange {
    min: number;
    max: number;
  }
  ```
- **Parsing Behavior:** Splits value into two numbers. If parts cannot be parsed into finite numbers, falls back to `{ min: defaultMin, max: defaultMax }`.
- **Serialization Behavior:** Formats as `${min}${separator}${max}`.
- **Clean URL Policy:** Deletes the key if `min === defaultMin && max === defaultMax`.

```tsx
import { useQueryState, parseAsNumberRange } from 'paramsync';

// URL: ?price=100-500
const [price, setPrice] = useQueryState('price', parseAsNumberRange(0, 1000));

// Access bounds
console.log(price.min, price.max);

// Set new bounds
setPrice({ min: 150, max: 800 });
```

---

### `parseAsSort`

Provides type-safe table and collection sorting.

- **Signature:** `parseAsSort<TField extends string>(defaultField: TField, defaultOrder: 'asc' | 'desc' = 'asc', separator = '.'): ParserWithDefault<SortOption<TField>>`
- **Type:**
  ```typescript
  export type SortOrder = 'asc' | 'desc';
  export interface SortOption<TField extends string = string> {
    field: TField;
    order: SortOrder;
  }
  ```
- **Parsing Behavior:** Splits by separator. Validates that the order segment is `'asc'` or `'desc'`.
- **Clean URL Policy:** Deletes the key if both field and order match the default values.

```tsx
import { useQueryState, parseAsSort } from 'paramsync';

type ProductField = 'price' | 'rating' | 'createdAt';

// URL: ?sort=price.desc
const [sort, setSort] = useQueryState(
  'sort',
  parseAsSort<ProductField>('createdAt', 'desc')
);

// TypeScript enforces valid field names:
setSort({ field: 'price', order: 'asc' });
```

---

### Clean URL Utility Helpers

`paramsync` exports two utility helpers used internally to enforce URL cleanliness:

```typescript
import { areValuesEqual, isCleanValue } from 'paramsync';

// Deep equality comparison supporting primitives, arrays, and nested objects
areValuesEqual({ min: 0, max: 100 }, { min: 0, max: 100 }); // true

// Clean URL evaluation helper
isCleanValue('', '');               // true
isCleanValue([], []);               // true
isCleanValue(null);                 // true
isCleanValue(1, 1);                 // true (matches default)
isCleanValue(2, 1);                 // false
```

---

## 6. In-Depth Hooks Reference

### `useQueryState`

Manages an individual URL query parameter with optimistic state, automatic debouncing, and React transitions.

#### Function Signature & Type Overloads

```typescript
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
```

#### Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `defaultValue` | `T` | `parser.defaultValue` | Fallback value when parameter is missing or unparseable. |
| `debounceMs` | `number` | `0` | Delay in milliseconds before updating URL. Local state updates at 0ms. |
| `history` | `'replace' \| 'push'` | `'replace'` | `'replace'` modifies URL in place; `'push'` creates a new browser history entry. |
| `scroll` | `boolean` | `false` | Whether Next.js should scroll to the top of the window on navigation. |

#### Return Values Reference

The hook returns a readonly 4-element tuple:

```tsx
const [value, setValue, reset, isPending] = useQueryState('q', parseAsString.withDefault(''));
```

1. **`value` (`T`):** The current typed value. Reflects the optimistic local state immediately.
2. **`setValue` (`(val | ((prev: T) => T)) => void`):** Updates internal state in `0ms` and schedules a debounced URL update.
3. **`reset` (`() => void`):** Reverts the internal state to `defaultValue` and deletes the parameter from the URL.
4. **`isPending` (`boolean`):** Indicates whether React's `useTransition` is actively synchronizing the URL navigation.

#### Functional State Updates

`setValue` supports functional updates just like `React.useState`:

```tsx
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

// Increment safely based on latest local state
setPage((current) => current + 1);
```

#### Reset Mechanics

Calling `reset()` immediately cancels any active debounce timer, restores the local state to default, and purges the key from the URL:

```tsx
const [search, setSearch, resetSearch] = useQueryState('q', parseAsString.withDefault(''));

<button onClick={resetSearch}>Reset Search</button>
```

---

### `useBatchQueryParams`

Executes multi-parameter updates simultaneously in a single navigation transition.

#### `useBatchQueryParams` Signature

```typescript
export function useBatchQueryParams(options?: UseBatchQueryParamsOptions): {
  setBatchParams: (updates: BatchParamsRecord, navOptions?: BatchNavigationOptions) => void;
  resetAllParams: (preserveKeys?: string[], navOptions?: BatchNavigationOptions) => void;
  isPending: boolean;
};
```

#### `BatchParamDescriptor`

When calling `setBatchParams`, values can be passed directly or wrapped in a descriptor to specify a custom parser:

```typescript
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
```

#### `setBatchParams`

Applies multiple parameter updates in a single URL navigation transition:

```tsx
const { setBatchParams } = useBatchQueryParams();

setBatchParams({
  q: 'running shoes',
  page: 1,
  categories: {
    value: ['shoes', 'outdoor'],
    parser: parseAsArray(parseAsString),
  },
  price: {
    value: { min: 50, max: 200 },
    parser: parseAsNumberRange(0, 1000),
  },
  legacyParam: null, // Deletes 'legacyParam' from URL
});
```

#### `resetAllParams` (Instant UI State Reset)

Clears all query parameters from the URL while preserving critical keys (like tabs or analytics tracking):

```tsx
const { resetAllParams } = useBatchQueryParams();

// Clears all filters but preserves analytics and tab indicators
resetAllParams(['utm_source', 'utm_medium', 'tab']);
```

> **Zero-Latency Cross-Hook Synchronization:**  
> When `resetAllParams()` is called, `paramsync` immediately notifies all active `useQueryState` instances on the page. Any active hooks not in `preserveKeys` cancel their pending debounce timers and reset their internal state to default **instantaneously (`0ms` UI latency)** without waiting for the router navigation transition to finish.

---

### `batchUpdates` Utility

If you need to update multiple independent `useQueryState` hooks within an event handler, wrap them with `batchUpdates` to coalesce them into a single browser navigation:

```tsx
import { batchUpdates } from 'paramsync';

function handleQuickPreset() {
  batchUpdates(() => {
    setSearch('');
    setCategory('all');
    setPage(1);
    setSort({ field: 'rating', order: 'desc' });
  });
  // Exactly 1 URL transition is executed instead of 4!
}
```

---

## 7. Clean URL Policy: Complete Specification

### Decision Matrix Table

The following matrix specifies how `paramsync` decides whether to keep or remove a query parameter:

| Value State | Example | Parser Used | Result in URL Query String |
| :--- | :--- | :--- | :--- |
| **`null` or `undefined`** | `null` | Any | Deleted |
| **Empty string** | `""` | `parseAsString` | Deleted |
| **Empty array** | `[]` | `parseAsArray` | Deleted |
| **Matches default string** | `"all"` (default: `"all"`) | `parseAsString.withDefault("all")` | Deleted |
| **Matches default number** | `1` (default: `1`) | `parseAsInteger.withDefault(1)` | Deleted |
| **Matches default boolean** | `false` (default: `false`) | `parseAsBoolean.withDefault(false)` | Deleted |
| **Matches default range** | `{ min: 0, max: 1000 }` | `parseAsNumberRange(0, 1000)` | Deleted |
| **Matches default sort** | `{ field: "createdAt", order: "desc" }` | `parseAsSort("createdAt", "desc")` | Deleted |
| **Modified / Active Value** | `"running"` | `parseAsString` | Preserved: `?q=running` |
| **Active Number** | `3` | `parseAsInteger.withDefault(1)` | Preserved: `?page=3` |
| **Active Array** | `["shoes", "hats"]` | `parseAsArray(parseAsString)` | Preserved: `?tags=shoes,hats` |
| **Active Range** | `{ min: 50, max: 200 }` | `parseAsNumberRange(0, 1000)` | Preserved: `?price=50-200` |

### Why Clean URLs Matter

1. **Shareability:** When users share a link, only relevant filters are shared (e.g. `site.com/shoes?brand=nike` instead of `site.com/shoes?brand=nike&page=1&q=&price=0-1000&inStock=false`).
2. **SEO & Crawling:** Prevents search engines from indexing duplicate URL variations created by default parameters.
3. **Analytics:** Cleaner URL structures simplify URL grouping in web analytics tools.

---

## 8. Architecture & Data Fetching Patterns

### Pattern 1: Server Components (RSC) + Direct API Fetching

Because all parsers have zero DOM dependencies, you can import and execute them inside React Server Components:

```tsx
// app/products/page.tsx (Server Component)
import React from 'react';
import {
  parseAsString,
  parseAsInteger,
  parseAsArray,
  parseAsNumberRange,
} from 'paramsync';
import { FilterBar } from './FilterBar';
import { ProductGrid } from './ProductGrid';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Parse incoming parameters on the server
  const query = parseAsString.parse((params.q as string) ?? null) ?? '';
  const page = parseAsInteger.withDefault(1).parse((params.page as string) ?? null);
  const categories = parseAsArray(parseAsString).parse((params.categories as string) ?? null);
  const price = parseAsNumberRange(0, 1000).parse((params.price as string) ?? null);

  // 2. Build API query payload
  const apiQuery = new URLSearchParams();
  if (query) apiQuery.set('q', query);
  if (page > 1) apiQuery.set('page', String(page));
  if (categories.length > 0) apiQuery.set('categories', categories.join(','));
  if (price.min > 0 || price.max < 1000) {
    apiQuery.set('minPrice', String(price.min));
    apiQuery.set('maxPrice', String(price.max));
  }

  // 3. Fetch from backend API
  const res = await fetch(`https://api.example.com/products?${apiQuery.toString()}`, {
    cache: 'no-store',
  });
  const data = await res.json();

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <aside style={{ width: 280 }}>
        <FilterBar />
      </aside>
      <main style={{ flex: 1 }}>
        <ProductGrid items={data.items} total={data.total} page={page} />
      </main>
    </div>
  );
}
```

---

### Pattern 2: Route Handlers & Server Actions

You can use parsers inside Next.js Route Handlers (`app/api/products/route.ts`):

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseAsString, parseAsInteger, parseAsArray } from 'paramsync';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const query = parseAsString.parse(searchParams.get('q')) ?? '';
  const page = parseAsInteger.withDefault(1).parse(searchParams.get('page'));
  const tags = parseAsArray(parseAsString).parse(searchParams.get('tags'));

  // Execute database query with validated types
  const data = await queryDatabase({ query, page, tags });

  return NextResponse.json(data);
}
```

---

### Pattern 3: Client-Side with TanStack Query (React Query)

When fetching data on the client, bind `paramsync` state directly to your `queryKey`:

```tsx
'use client';

import React from 'react';
import { useQueryState, parseAsString, parseAsInteger, parseAsArray } from 'paramsync';
import { useQuery } from '@tanstack/react-query';

export function ClientProductFeed() {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''), {
    debounceMs: 300,
  });
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [categories] = useQueryState('categories', parseAsArray(parseAsString));

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', { search, page, categories }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (page > 1) params.set('page', String(page));
      if (categories.length > 0) params.set('categories', categories.join(','));

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        placeholder="Filter products..."
      />

      {isLoading ? <p>Loading...</p> : <div>{/* Render items */}</div>}
    </div>
  );
}
```

---

### Pattern 4: Client-Side with SWR

```tsx
'use client';

import React from 'react';
import { useQueryState, parseAsString, parseAsInteger } from 'paramsync';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SWRProductFeed() {
  const [search] = useQueryState('q', parseAsString.withDefault(''), { debounceMs: 300 });
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));

  const queryString = new URLSearchParams({
    ...(search ? { q: search } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  }).toString();

  const { data, error, isValidating } = useSWR(
    `/api/products${queryString ? `?${queryString}` : ''}`,
    fetcher,
    { keepPreviousData: true }
  );

  return <div>{/* Render items */}</div>;
}
```

---

### Pattern 5: Native Fetch with useEffect

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useQueryState, parseAsString, parseAsInteger } from 'paramsync';

export function NativeFetchCatalog() {
  const [search] = useQueryState('q', parseAsString.withDefault(''), { debounceMs: 300 });
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const query = new URLSearchParams();
    if (search) query.set('q', search);
    if (page > 1) query.set('page', String(page));

    fetch(`/api/products?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          setItems(data.items);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, page]);

  return <div>{/* Render items */}</div>;
}
```

---

## 9. Dynamic Facet Filters from API

### Dynamic Facet Architecture

In e-commerce catalogs, facets are often dynamic: the backend API returns attributes specific to the active category (e.g. `screen_size` for laptops, `shoe_size` for footwear, `color` for clothing).

Instead of declaring static variables for each potential facet, use `useBatchQueryParams` to bind arbitrary facet keys dynamically.

### Complete Dynamic Facet Component

```tsx
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useBatchQueryParams, parseAsArray, parseAsString } from 'paramsync';

export interface FacetOption {
  value: string;
  count: number;
}

export interface FacetGroup {
  id: string;
  name: string;
  options: FacetOption[];
}

interface DynamicFacetSidebarProps {
  facets: FacetGroup[];
}

export function DynamicFacetSidebar({ facets }: DynamicFacetSidebarProps) {
  const searchParams = useSearchParams();
  const { setBatchParams, isPending } = useBatchQueryParams();
  const arrayParser = parseAsArray(parseAsString);

  const getSelectedOptions = (facetId: string): string[] => {
    return arrayParser.parse(searchParams.get(facetId));
  };

  const handleToggleOption = (facetId: string, optionValue: string) => {
    const selected = getSelectedOptions(facetId);
    const updated = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];

    setBatchParams({
      // Clean URL: Deletes facet key if array becomes empty
      [facetId]: updated.length > 0 ? updated.join(',') : null,
      // Automatically reset page to 1
      page: null,
    });
  };

  return (
    <aside style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {facets.map((group) => {
        const selected = getSelectedOptions(group.id);

        return (
          <div key={group.id} style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>{group.name}</h4>
            {group.options.map((opt) => (
              <label key={opt.value} style={{ display: 'block', margin: '0.25rem 0' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => handleToggleOption(group.id, opt.value)}
                />{' '}
                {opt.value} ({opt.count})
              </label>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
```

---

## 10. Pagination Coordination & Stale Page Prevention

### The Stale Page Problem Explained

A common bug in filtering interfaces is the **stale page index**:
1. A user browses to **Page 8** of an unfiltered catalog.
2. The user selects a specific filter: `brand=SpecialtyAudio`.
3. The filtered dataset contains only **12 products** (totaling 2 pages).
4. Because the URL still has `page=8`, the application queries the backend for page 8 and displays an empty screen with *"No results found"*.

### Auto-Reset Solution Patterns

#### Solution A: Single Hook (`useQueryState`)
Reset page to `1` when triggering filter updates:

```tsx
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
const [query, setQuery] = useQueryState('q', parseAsString.withDefault(''), { debounceMs: 300 });

const handleSearch = (newQuery: string) => {
  setPage(1); // Cleans 'page=1' from URL automatically
  setQuery(newQuery);
};
```

#### Solution B: Batch Updates (`useBatchQueryParams`)
Pass `page: null` in the batch payload. This deletes `page` from the URL in the exact same transition as the filter changes:

```tsx
const { setBatchParams } = useBatchQueryParams();

setBatchParams({
  brand: 'Sony',
  price: '100-300',
  page: null, // Deletes 'page' parameter from URL
});
```

---

## 11. Complete Production Recipes

### Recipe 1: Instant Reactive E-Commerce Filter Bar

```tsx
'use client';

import React from 'react';
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
  parseAsArray,
  parseAsSort,
} from 'paramsync';

type SortField = 'price' | 'rating' | 'createdAt';
const CATEGORIES = ['Footwear', 'Apparel', 'Accessories', 'Electronics'];

export function InstantFilterBar() {
  // Live Search with 300ms debounce
  const [search, setSearch, resetSearch, isSearchPending] = useQueryState(
    'q',
    parseAsString.withDefault(''),
    { debounceMs: 300 }
  );

  // Pagination
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  // Multi-select categories
  const [categories, setCategories] = useQueryState('categories', parseAsArray(parseAsString));

  // Boolean in-stock toggle
  const [inStock, setInStock] = useQueryState('inStock', parseAsBoolean.withDefault(false));

  // Sort dropdown
  const [sort, setSort] = useQueryState('sort', parseAsSort<SortField>('createdAt', 'desc'));

  const toggleCategory = (cat: string) => {
    setPage(1);
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Search Input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search items..."
          style={{ flex: 1, padding: '0.5rem' }}
        />
        {search && <button onClick={resetSearch}>Clear</button>}
        {isSearchPending && <span>Syncing...</span>}
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            style={{
              padding: '0.35rem 0.75rem',
              fontWeight: categories.includes(cat) ? 'bold' : 'normal',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* In-Stock & Sorting */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1rem' }}>
        <label>
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => {
              setPage(1);
              setInStock(e.target.checked);
            }}
          />{' '}
          In Stock Only
        </label>

        <div>
          <label>Sort by: </label>
          <select
            value={`${sort.field}.${sort.order}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('.') as [SortField, 'asc' | 'desc'];
              setSort({ field, order });
            }}
          >
            <option value="createdAt.desc">Newest Arrivals</option>
            <option value="price.asc">Price: Low to High</option>
            <option value="price.desc">Price: High to Low</option>
            <option value="rating.desc">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
```

---

### Recipe 2: Filter Drawer / Modal with Apply & Reset All

```tsx
'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useBatchQueryParams,
  parseAsNumberRange,
  parseAsArray,
  parseAsString,
  NumberRange,
} from 'paramsync';

export function FilterDrawerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const searchParams = useSearchParams();
  const { setBatchParams, resetAllParams, isPending } = useBatchQueryParams();

  const priceParser = parseAsNumberRange(0, 1000);
  const arrayParser = parseAsArray(parseAsString);

  // Buffer draft state locally
  const [draftSearch, setDraftSearch] = useState(searchParams.get('q') ?? '');
  const [draftCategories, setDraftCategories] = useState<string[]>(
    arrayParser.parse(searchParams.get('categories'))
  );
  const [draftPrice, setDraftPrice] = useState<NumberRange>(
    priceParser.parse(searchParams.get('price'))
  );

  if (!isOpen) return null;

  const handleApply = () => {
    setBatchParams({
      q: draftSearch,
      categories: { value: draftCategories, parser: arrayParser },
      price: { value: draftPrice, parser: priceParser },
      page: null, // Reset to page 1
    });
    onClose();
  };

  const handleResetAll = () => {
    resetAllParams(['tab', 'utm_source']);
    setDraftSearch('');
    setDraftCategories([]);
    setDraftPrice({ min: 0, max: 1000 });
    onClose();
  };

  const toggleCategory = (cat: string) => {
    setDraftCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 320, background: '#fff', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <h3>Filter Items</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Keyword</label>
          <input
            type="text"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Categories</label>
          {['Laptops', 'Audio', 'Monitors'].map((cat) => (
            <label key={cat} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={draftCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />{' '}
              {cat}
            </label>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Max Price: ${draftPrice.max}</label>
          <input
            type="range"
            min={0}
            max={1000}
            value={draftPrice.max}
            onChange={(e) => setDraftPrice({ min: draftPrice.min, max: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={handleApply} disabled={isPending}>
            {isPending ? 'Applying...' : 'Apply Filters'}
          </button>
          <button onClick={handleResetAll}>Reset All</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

---

### Recipe 3: Data Table with Sorting & Dynamic Page Size

```tsx
'use client';

import React from 'react';
import { useQueryState, parseAsSort, parseAsInteger } from 'paramsync';

type UserField = 'name' | 'email' | 'role' | 'createdAt';

export function UserDataTable() {
  const [sort, setSort] = useQueryState('sort', parseAsSort<UserField>('createdAt', 'desc'));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState('limit', parseAsInteger.withDefault(10));

  const handleHeaderClick = (field: UserField) => {
    setSort((current) => ({
      field,
      order: current.field === field && current.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleHeaderClick('name')} style={{ cursor: 'pointer' }}>
              Name {sort.field === 'name' ? (sort.order === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th onClick={() => handleHeaderClick('email')} style={{ cursor: 'pointer' }}>
              Email {sort.field === 'email' ? (sort.order === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th onClick={() => handleHeaderClick('role')} style={{ cursor: 'pointer' }}>
              Role {sort.field === 'role' ? (sort.order === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>{/* Table rows */}</tbody>
      </table>

      {/* Pagination Bar */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>

        <select
          value={pageSize}
          onChange={(e) => {
            setPage(1);
            setPageSize(Number(e.target.value));
          }}
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
    </div>
  );
}
```

---

## 12. TypeScript System & Type Narrowing

`paramsync` is authored in TypeScript 5+ with strict type checking:

### Automatic Nullability Narrowing

```typescript
// 1. Without withDefault: Type is `string | null`
const [nullableValue] = useQueryState('q', parseAsString);

// 2. With withDefault: Type narrows to non-nullable `string`
const [stringValue] = useQueryState('q', parseAsString.withDefault(''));

// 3. With options.defaultValue: Type narrows to non-nullable `string`
const [optionsValue] = useQueryState('q', parseAsString, { defaultValue: '' });
```

### Strict Field Autocomplete in Sorting

```typescript
type AllowedColumns = 'id' | 'title' | 'author';

const [sort, setSort] = useQueryState('sort', parseAsSort<AllowedColumns>('id', 'asc'));

// Autocomplete and type checking:
setSort({ field: 'title', order: 'desc' }); // Valid
// @ts-expect-error Argument of type '"unknown"' is not assignable to 'AllowedColumns'
setSort({ field: 'unknown', order: 'asc' });
```

---

## 13. Next.js App Router Best Practices & Gotchas

### Suspense Boundary Requirement

Next.js App Router requires client components reading search parameters via `useSearchParams()` to be wrapped in a `<Suspense>` boundary when statically generating pages during `next build`:

```tsx
// app/products/page.tsx
import { Suspense } from 'react';
import ProductCatalog from './ProductCatalog';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading catalog...</div>}>
      <ProductCatalog />
    </Suspense>
  );
}
```

If you omit `<Suspense>`, Next.js will de-opt the entire page to client-side rendering at runtime with a warning.

### Browser History vs In-Place Updates

- Use `history: 'replace'` (the default) for search inputs, range sliders, and active filtering to avoid cluttering the browser's Back button history.
- Use `history: 'push'` for pagination or multi-step wizard views where users expect the browser's Back button to navigate to the previous page index.

---

## 14. Testing & Verification

The test suite is built on Vitest and React Testing Library, running in a JSDOM environment:

```bash
# Run complete test suite once
npm test

# Run tests in watch mode
npm run test:watch

# Verify TypeScript type definitions without building
npm run typecheck

# Execute full prepublish workflow (typecheck + test + tsup dual build)
npm run prepublishOnly
```

---

## 15. License

MIT © [paramsync](https://github.com/paramsync/paramsync)
