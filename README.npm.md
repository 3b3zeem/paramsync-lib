# paramsync

Type-safe, zero-overhead URL Search Parameters state manager for React and Next.js App Router applications.

[![npm version](https://img.shields.io/npm/v/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://www.npmjs.com/package/paramsync)
[![npm downloads](https://img.shields.io/npm/dm/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://www.npmjs.com/package/paramsync)
[![bundle size](https://img.shields.io/bundlephobia/minzip/paramsync?style=flat&colorA=18181B&colorB=2563EB)](https://bundlephobia.com/package/paramsync)
[![license](https://img.shields.io/npm/l/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://github.com/3b3zeem/paramsync)

---

## What is paramsync?

In Next.js App Router applications, managing state through URL search parameters using standard `useSearchParams()` and `router.replace()` often introduces keystroke latency during live search, UI stutter, and cluttered URLs filled with empty or default values.

`paramsync` provides a seamless `[value, setValue]` state hook that binds React state directly to the URL:
- **0ms Input Latency:** Controlled inputs update local state instantaneously while background URL updates are debounced.
- **Clean URL Policy:** Default values, empty strings, and empty arrays are automatically purged from the query string.
- **Batch Transitions:** Multiple filter changes can be committed simultaneously in a single navigation transition via `useBatchQueryParams`.
- **Server Component Compatible:** Parsers have zero DOM dependencies and execute safely in React Server Components and Route Handlers.

---

## Installation

```bash
npm install paramsync
# or
pnpm add paramsync
# or
yarn add paramsync
```

### Peer Dependencies
- `react` >= 18.0.0
- `next` >= 13.0.0 (App Router)

---

## Quick Example

```tsx
'use client';

import { useQueryState, parseAsString, parseAsInteger } from 'paramsync';

export default function SearchFeed() {
  // Live search with 300ms URL debounce (zero typing lag)
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''), {
    debounceMs: 300,
  });

  // Numeric page parameter
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setPage(1); // Reset page index on search
          setSearch(e.target.value);
        }}
        placeholder="Filter results..."
      />

      <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
        Prev
      </button>
      <span>Page {page}</span>
      <button onClick={() => setPage((p) => p + 1)}>
        Next
      </button>
    </div>
  );
}
```

---

## API Summary

### Built-in Parsers

| Parser | Parse Signature | Clean URL Behavior | Example |
| :--- | :--- | :--- | :--- |
| `parseAsString` | `string \| null` | Omitted if `""` or default | `?q=laptop` |
| `parseAsInteger` | `number \| null` | Omitted if default | `?page=2` |
| `parseAsFloat` | `number \| null` | Omitted if default | `?rating=4.5` |
| `parseAsBoolean` | `boolean \| null` | Omitted if default | `?inStock=true` |
| `parseAsArray(parser, sep?)` | `T[]` | Omitted if `[]` or default | `?tags=shoes,sale` |
| `parseAsNumberRange(min, max, sep?)` | `{ min, max }` | Omitted if matches bounds | `?price=50-250` |
| `parseAsSort(field, order?, sep?)` | `{ field, order }` | Omitted if matches default | `?sort=price.asc` |
| `createParser(config)` | `T` | Custom serializer | User-defined |

> Calling `.withDefault(fallback)` on any parser narrows the returned state type from `T | null` to non-nullable `T`.

### Hooks

#### `useQueryState(key, parser, options?)`
Manages an individual URL parameter with optimistic local state.

```tsx
const [value, setValue, reset, isPending] = useQueryState('q', parseAsString.withDefault(''), {
  debounceMs: 300,    // Debounce URL commit (0ms local state feedback)
  history: 'replace', // 'replace' | 'push'
  scroll: false,      // Scroll to top on update
});
```

#### `useBatchQueryParams(options?)`
Executes multiple parameter changes in a single URL transition (for modals or drawers):

```tsx
const { setBatchParams, resetAllParams, isPending } = useBatchQueryParams();

// Commit multiple filter updates in a single transition
setBatchParams({
  q: 'shoes',
  categories: { value: ['running'], parser: parseAsArray(parseAsString) },
  price: { value: { min: 50, max: 200 }, parser: parseAsNumberRange(0, 1000) },
  page: null, // Deletes 'page' from URL (resets to page 1)
});

// Wipe all non-essential parameters at once
resetAllParams(['tab', 'utm_source']);
```

---

## Clean URL Policy

`paramsync` automatically deletes a parameter from the query string when:
1. Its value equals `defaultValue`.
2. Its value is an empty string `""`.
3. Its value is an empty array `[]`.
4. Its value is `null` or `undefined`.

---

## Documentation & Repository

For complete architectural guides, Server Components (RSC) data fetching patterns, TanStack Query integration, dynamic facet filtering, and recipes:

- **Repository & Full Docs:** [https://github.com/3b3zeem/paramsync](https://github.com/3b3zeem/paramsync)
- **Issues & Feedback:** [https://github.com/3b3zeem/paramsync/issues](https://github.com/3b3zeem/paramsync/issues)

---

## License

MIT © [Ahmed Mostafa](https://github.com/3b3zeem/paramsync)
