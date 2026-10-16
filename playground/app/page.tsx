'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
  parseAsArray,
  parseAsNumberRange,
  parseAsSort,
  useBatchQueryParams,
  NumberRange,
} from '../../src';

// Sample dataset to demonstrate interactive filtering
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Pro Noise-Canceling Headphones",
    category: "Audio",
    price: 299,
    rating: 4.8,
    inStock: true,
  },
  {
    id: 2,
    name: 'Ultra-Wide Gaming Monitor 34"',
    category: "Displays",
    price: 699,
    rating: 4.6,
    inStock: true,
  },
  {
    id: 3,
    name: "Mechanical Keyboard RGB (Blue Switch)",
    category: "Peripherals",
    price: 129,
    rating: 4.7,
    inStock: false,
  },
  {
    id: 4,
    name: "Ergonomic Vertical Mouse",
    category: "Peripherals",
    price: 79,
    rating: 4.3,
    inStock: true,
  },
  {
    id: 5,
    name: "Studio USB Condenser Microphone",
    category: "Audio",
    price: 149,
    rating: 4.5,
    inStock: true,
  },
  {
    id: 6,
    name: "4K Ultra-HD Webcam with Ring Light",
    category: "Peripherals",
    price: 199,
    rating: 4.2,
    inStock: false,
  },
  {
    id: 7,
    name: "Smart Fitness Smartwatch v2",
    category: "Wearables",
    price: 249,
    rating: 4.4,
    inStock: true,
  },
  {
    id: 8,
    name: "Wireless Charging Desk Mat",
    category: "Accessories",
    price: 49,
    rating: 4.1,
    inStock: true,
  },
  {
    id: 9,
    name: "Portable Bluetooth Speaker (Waterproof)",
    category: "Audio",
    price: 89,
    rating: 4.6,
    inStock: true,
  },
  {
    id: 10,
    name: "4K IPS Color-Accurate Designer Monitor",
    category: "Displays",
    price: 849,
    rating: 4.9,
    inStock: true,
  },
  {
    id: 11,
    name: "Compact 65% Wireless Keyboard",
    category: "Peripherals",
    price: 110,
    rating: 4.5,
    inStock: true,
  },
  {
    id: 12,
    name: "Active Noise Cancelling Earbuds",
    category: "Audio",
    price: 179,
    rating: 4.7,
    inStock: false,
  },
];

const CATEGORIES = [
  "Audio",
  "Displays",
  "Peripherals",
  "Wearables",
  "Accessories",
];
type SortField = "price" | "rating" | "name";

function PlaygroundContent() {
  const searchParams = useSearchParams();

  // 1. Live search with 300ms debounce (0ms local typing feedback)
  const [search, setSearch, resetSearch, isSearchPending] = useQueryState(
    "q",
    parseAsString.withDefault(""),
    { debounceMs: 300 },
  );

  // 2. Pagination state
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // 3. Multi-select category array
  const [categories, setCategories] = useQueryState(
    "categories",
    parseAsArray(parseAsString),
  );

  // 4. In-stock boolean switch
  const [inStockOnly, setInStockOnly] = useQueryState(
    "inStock",
    parseAsBoolean.withDefault(false),
  );

  // 5. Price range slider
  const [priceRange, setPriceRange] = useQueryState(
    "price",
    parseAsNumberRange(0, 1000),
  );

  // 6. Table sorting
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsSort<SortField>("name", "asc"),
  );

  // 7. Batch hooks for modal drawer
  const {
    setBatchParams,
    resetAllParams,
    isPending: isBatchPending,
  } = useBatchQueryParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter products locally according to paramsync state
  const filteredProducts = useMemo(() => {
    let result = [...MOCK_PRODUCTS];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (categories.length > 0) {
      result = result.filter((p) => categories.includes(p.category));
    }

    if (inStockOnly) {
      result = result.filter((p) => p.inStock);
    }

    result = result.filter(
      (p) => p.price >= priceRange.min && p.price <= priceRange.max,
    );

    result.sort((a, b) => {
      const field = sort.field;
      if (a[field] < b[field]) return sort.order === "asc" ? -1 : 1;
      if (a[field] > b[field]) return sort.order === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [search, categories, inStockOnly, priceRange, sort]);

  // Pagination slicing (4 items per page)
  const PAGE_SIZE = 4;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const toggleCategory = (cat: string) => {
    setPage(1);
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const rawQuery = searchParams.toString();

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", padding: "0 1rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.8rem",
              fontWeight: 800,
            }}
          >
            paramsync Playground
          </h1>
          <p style={{ margin: 0, color: "#64748b" }}>
            Interactive real-time test bench for URL search params
            synchronization.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: "#0284c7",
            color: "#fff",
            border: "none",
            padding: "0.6rem 1.2rem",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open Filter Drawer (Batch)
        </button>
      </div>

      {/* Live URL Monitor Card */}
      <div
        style={{
          background: "#0f172a",
          color: "#38bdf8",
          padding: "1rem",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "0.9rem",
          marginBottom: "2rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            color: "#94a3b8",
          }}
        >
          <span>LIVE BROWSER URL SEARCH STRING:</span>
          <span>
            {isSearchPending || isBatchPending ? (
              <span style={{ color: "#f59e0b" }}>Transition Pending...</span>
            ) : (
              <span style={{ color: "#10b981" }}>URL Synchronized</span>
            )}
          </span>
        </div>
        <div
          style={{
            wordBreak: "break-all",
            color: rawQuery ? "#38bdf8" : "#64748b",
          }}
        >
          {rawQuery
            ? `?${rawQuery}`
            : "(Clean URL - All parameters match defaults or empty)"}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "2rem",
        }}
      >
        {/* Search row */}
        <div
          style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Live search by name (300ms debounce, 0ms input lag)..."
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.95rem",
            }}
          />
          {search && (
            <button
              onClick={() => {
                setPage(1);
                resetSearch();
              }}
              style={{
                padding: "0.6rem 1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#f1f5f9",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Badges */}
        <div style={{ marginBottom: "1.25rem" }}>
          <span
            style={{
              fontWeight: 600,
              marginRight: "0.75rem",
              fontSize: "0.9rem",
            }}
          >
            Categories:
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  margin: "0.2rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  border: isSelected
                    ? "1px solid #0284c7"
                    : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#e0f2fe" : "#f8fafc",
                  color: isSelected ? "#0369a1" : "#475569",
                  fontWeight: isSelected ? 600 : 500,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sliders & Switches */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2rem",
            alignItems: "center",
          }}
        >
          {/* Price Range */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>Max Price:</span>
              <span style={{ color: "#0284c7", fontWeight: 700 }}>
                ${priceRange.max}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={priceRange.max}
              onChange={(e) => {
                setPage(1);
                setPriceRange({
                  min: priceRange.min,
                  max: Number(e.target.value),
                });
              }}
              style={{ width: "100%" }}
            />
          </div>

          {/* In Stock toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setPage(1);
                setInStockOnly(e.target.checked);
              }}
            />
            <span style={{ fontWeight: 600 }}>In-Stock Only</span>
          </label>

          {/* Sort Dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            <span style={{ fontWeight: 600 }}>Sort:</span>
            <select
              value={`${sort.field}.${sort.order}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(".") as [
                  SortField,
                  "asc" | "desc",
                ];
                setSort({ field, order });
              }}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
              }}
            >
              <option value="name.asc">Name (A-Z)</option>
              <option value="name.desc">Name (Z-A)</option>
              <option value="price.asc">Price (Low to High)</option>
              <option value="price.desc">Price (High to Low)</option>
              <option value="rating.desc">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>
          Matching Products ({filteredProducts.length})
        </h2>
        <button
          onClick={() => resetAllParams(["tab"])}
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "0.85rem",
            textDecoration: "underline",
          }}
        >
          Reset All Filters
        </button>
      </div>

      {/* Products Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {paginatedProducts.length > 0 ? (
          paginatedProducts.map((product) => (
            <div
              key={product.id}
              style={{
                background: "#fff",
                padding: "1.25rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {product.category}
                </span>
                <h3
                  style={{
                    fontSize: "1rem",
                    margin: "0.25rem 0 0.5rem 0",
                    fontWeight: 600,
                  }}
                >
                  {product.name}
                </h3>
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    ${product.price}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#f59e0b" }}>
                    ★ {product.rating}
                  </span>
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                  {product.inStock ? (
                    <span style={{ color: "#16a34a" }}>● In Stock</span>
                  ) : (
                    <span style={{ color: "#dc2626" }}>○ Out of Stock</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "3rem",
              textAlign: "center",
              background: "#fff",
              borderRadius: "8px",
            }}
          >
            <p style={{ margin: 0, color: "#64748b" }}>
              No products match your active filters.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "3rem",
        }}
      >
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: page <= 1 ? "#f1f5f9" : "#fff",
            cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Previous
        </button>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: page >= totalPages ? "#f1f5f9" : "#fff",
            cursor: page >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>

      {/* Batch Drawer / Modal */}
      {isModalOpen && (
        <DrawerModal
          onClose={() => setIsModalOpen(false)}
          onApply={(draft) => {
            setBatchParams({
              q: draft.search,
              categories: {
                value: draft.categories,
                parser: parseAsArray(parseAsString),
              },
              price: {
                value: draft.price,
                parser: parseAsNumberRange(0, 1000),
              },
              inStock: draft.inStock ? true : null,
              page: null, // Reset to page 1
            });
            setIsModalOpen(false);
          }}
          initial={{
            search,
            categories,
            price: priceRange,
            inStock: inStockOnly,
          }}
        />
      )}
    </div>
  );
}

function DrawerModal({
  onClose,
  onApply,
  initial,
}: {
  onClose: () => void;
  onApply: (draft: {
    search: string;
    categories: string[];
    price: NumberRange;
    inStock: boolean;
  }) => void;
  initial: {
    search: string;
    categories: string[];
    price: NumberRange;
    inStock: boolean;
  };
}) {
  const [draftSearch, setDraftSearch] = useState(initial.search);
  const [draftCategories, setDraftCategories] = useState<string[]>(
    initial.categories,
  );
  const [draftPrice, setDraftPrice] = useState<NumberRange>(initial.price);
  const [draftInStock, setDraftInStock] = useState(initial.inStock);

  const toggleCategory = (cat: string) => {
    setDraftCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 340,
          background: "#fff",
          height: "100%",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Filter Drawer (Batch)</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 0 }}>
          Modifications here are buffered locally and committed to the URL in a
          single navigation transition when you click Apply.
        </p>

        {/* Draft Keyword */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "0.85rem",
              marginBottom: "0.25rem",
            }}
          >
            Draft Search:
          </label>
          <input
            type="text"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Draft Categories */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "0.85rem",
              marginBottom: "0.25rem",
            }}
          >
            Categories:
          </label>
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              style={{
                display: "block",
                margin: "0.25rem 0",
                fontSize: "0.85rem",
              }}
            >
              <input
                type="checkbox"
                checked={draftCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />{" "}
              {cat}
            </label>
          ))}
        </div>

        {/* Draft Price */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "0.85rem",
              marginBottom: "0.25rem",
            }}
          >
            Max Price: ${draftPrice.max}
          </label>
          <input
            type="range"
            min={0}
            max={1000}
            step={50}
            value={draftPrice.max}
            onChange={(e) =>
              setDraftPrice({
                min: draftPrice.min,
                max: Number(e.target.value),
              })
            }
            style={{ width: "100%" }}
          />
        </div>

        {/* Draft In-Stock */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <input
              type="checkbox"
              checked={draftInStock}
              onChange={(e) => setDraftInStock(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>In-Stock Only</span>
          </label>
        </div>

        {/* Apply & Cancel */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() =>
              onApply({
                search: draftSearch,
                categories: draftCategories,
                price: draftPrice,
                inStock: draftInStock,
              })
            }
            style={{
              padding: "0.75rem",
              backgroundColor: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Apply Filters (Single Transition)
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={<div style={{ padding: "2rem" }}>Loading playground...</div>}
    >
      <PlaygroundContent />
    </Suspense>
  );
}
