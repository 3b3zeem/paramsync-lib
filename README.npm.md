# paramsync

Type-safe, zero-overhead URL Search Parameters state manager for React (Router-Agnostic, Vite, React Router, Remix, TanStack Router) and Next.js App Router applications.

[![npm version](https://img.shields.io/npm/v/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://www.npmjs.com/package/paramsync)
[![npm downloads](https://img.shields.io/npm/dm/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://www.npmjs.com/package/paramsync)
[![bundle size](https://img.shields.io/bundlephobia/minzip/paramsync?style=flat&colorA=18181B&colorB=2563EB)](https://bundlephobia.com/package/paramsync)
[![license](https://img.shields.io/npm/l/paramsync.svg?style=flat&colorA=18181B&colorB=2563EB)](https://github.com/3b3zeem/paramsync)

---

## What is paramsync?

Managing state through URL search parameters using standard APIs often introduces keystroke latency during live search, UI stutter, race conditions between debounced and immediate inputs, and cluttered URLs filled with empty or default values.

`paramsync` provides a seamless `[value, setValue]` state hook that binds React state directly to the URL:
- **0ms Input Latency:** Controlled inputs update local state instantaneously while background URL updates are debounced.
- **Race Condition & Overwrite Protection:** State updates coordinate to guarantee concurrent and debounced changes never overwrite each other.
- **Router-Agnostic Core:** Works in **any** React application (Vite, React Router, Remix, Astro, TanStack Router) with built-in Vanilla browser history support and zero external router dependencies.
- **Dedicated Next.js Entrypoint (`paramsync/next`):** Deep integration with Next.js App Router transitions and Server Components.
- **Instantaneous Multi-Reset:** `resetAllParams()` immediately resets internal state across all active hooks on the page.
- **Clean URL Policy:** Default values, empty strings, and empty arrays are automatically purged from the query string.
- **Safe URI Decoding:** Built-in protection against malformed percent encodings (`URIError`) with native Arabic & Unicode support.

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
- `next` >= 13.0.0 (Optional — only required when importing from `paramsync/next`)

---

## Quick Example

### 1. Plain React / Vite / React Router / Remix / TanStack Router

```tsx
import { useQueryState, parseAsString, parseAsInteger } from 'paramsync';

export default function SearchFeed() {
  // Live search with 300ms URL debounce (0ms local state latency)
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
          setPage(1);
          setSearch(e.target.value);
        }}
        placeholder="Filter results..."
      />
      <span>Page {page}</span>
    </div>
  );
}
```

### 2. Next.js App Router

```tsx
'use client';

// Import from the specialized 'paramsync/next' entrypoint for App Router transitions
import { useQueryState, parseAsStringLiteral, parseAsIsoDate } from 'paramsync/next';

export default function DashboardFilters() {
  // Strict TypeScript union type inference without manual type casting
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(['all', 'pending', 'accepted', 'rejected'] as const).withDefault('all')
  );

  // Calendar date filter (YYYY-MM-DD <-> Date object)
  const [dateFrom, setDateFrom] = useQueryState(
    'from',
    parseAsIsoDate.withDefault(new Date(2026, 0, 1))
  );

  return (
    <div>
      <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
      </select>
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
| `parseAsStringLiteral(allowed)` | `T \| null` | Omitted if default or invalid | `?status=pending` |
| `parseAsIsoDate` | `Date \| null` | Omitted if default | `?date=2026-10-27` |
| `parseAsJson<T>(validator?)` | `T \| null` | Omitted if default | `?filter=%7B%22min%22%3A10%7D` |
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
Executes multiple parameter changes in a single URL transition:

```tsx
const { setBatchParams, resetAllParams, isPending } = useBatchQueryParams();

// Commit multiple filter updates in a single transition
setBatchParams({
  q: 'shoes',
  categories: { value: ['running'], parser: parseAsArray(parseAsString) },
  price: { value: { min: 50, max: 200 }, parser: parseAsNumberRange(0, 1000) },
  page: null, // Deletes 'page' from URL
});

// Wipe all non-essential parameters at once (instantly resets UI state)
resetAllParams(['tab', 'utm_source']);
```

#### `batchUpdates(fn)`
Utility to coalesce multiple individual `useQueryState` updates into a single navigation:

```tsx
import { batchUpdates } from 'paramsync';

batchUpdates(() => {
  setQuery('');
  setCategory('all');
  setPage(1);
});
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

- **Repository & Full Docs:** [https://github.com/3b3zeem/paramsync-lib](https://github.com/3b3zeem/paramsync-lib)
- **Issues & Feedback:** [https://github.com/3b3zeem/paramsync-lib/issues](https://github.com/3b3zeem/paramsync-lib/issues)

---

## License

MIT © [Ahmed Mostafa](https://github.com/3b3zeem/paramsync-lib)
