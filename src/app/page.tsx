"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import CategoryNav from "@/components/CategoryNav";
import FilterSidebar, { FilterState } from "@/components/FilterSidebar";
import InquiryModal from "@/components/InquiryModal";

const CATEGORY_GROUPS = [
  "gender","style","material","features",
  "sustainability","special","weight","sport",
  "hat_type","bag_type",
];

function buildApiUrl(filters: FilterState, baseCategory: string, page: number) {
  const p = new URLSearchParams();
  if (baseCategory)         p.set("baseCategory", baseCategory);
  if (filters.search)       p.set("search", filters.search);
  if (filters.brand)        p.set("brand", filters.brand);
  if (filters.inStock)      p.set("inStock", "true");
  if (filters.sustainable)  p.set("sustainable", "true");
  if (filters.newStyle)     p.set("newStyle", "true");
  if (filters.minPrice)     p.set("minPrice", filters.minPrice);
  if (filters.maxPrice)     p.set("maxPrice", filters.maxPrice);
  p.set("page", String(page));
  p.set("limit", "24");
  CATEGORY_GROUPS.forEach(g => {
    const ids = filters.categories[g];
    if (ids && ids.length > 0) p.set(g, ids.join(","));
  });
  return `/api/products?${p}`;
}

function buildPageUrl(filters: FilterState, baseCategory: string, page: number) {
  const p = new URLSearchParams();
  if (baseCategory)         p.set("cat", baseCategory);
  if (filters.search)       p.set("q", filters.search);
  if (filters.brand)        p.set("brand", filters.brand);
  if (!filters.inStock)     p.set("inStock", "false");
  if (filters.sustainable)  p.set("sustainable", "true");
  if (filters.newStyle)     p.set("newStyle", "true");
  if (filters.minPrice)     p.set("minPrice", filters.minPrice);
  if (filters.maxPrice)     p.set("maxPrice", filters.maxPrice);
  if (page > 1)             p.set("page", String(page));
  CATEGORY_GROUPS.forEach(g => {
    const ids = filters.categories[g];
    if (ids && ids.length > 0) p.set(g, ids.join(","));
  });
  const qs = p.toString();
  return qs ? `?${qs}` : "/";
}

function parseUrlFilters(sp: URLSearchParams): { baseCategory: string; filters: FilterState; page: number } {
  const cats: Record<string, number[]> = {};
  CATEGORY_GROUPS.forEach(g => {
    const val = sp.get(g);
    if (val) cats[g] = val.split(",").map(Number).filter(Boolean);
  });

  return {
    baseCategory: sp.get("cat") || "",
    page: Math.max(1, parseInt(sp.get("page") || "1")),
    filters: {
      search:      sp.get("q") || "",
      brand:       sp.get("brand") || "",
      minPrice:    sp.get("minPrice") || "",
      maxPrice:    sp.get("maxPrice") || "",
      inStock:     sp.get("inStock") !== "false",
      sustainable: sp.get("sustainable") === "true",
      newStyle:    sp.get("newStyle") === "true",
      categories:  cats,
    },
  };
}

function StorefrontInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { baseCategory: initCat, filters: initFilters, page: initPage } = parseUrlFilters(searchParams);

  const [baseCategory, setBaseCategory] = useState(initCat);
  const [filters, setFilters] = useState<FilterState>(initFilters);
  const [page, setPage] = useState(initPage);

  const [products, setProducts] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [groups, setGroups] = useState<any>({});
  const [searchInput, setSearchInput] = useState(initFilters.search);

  // Push URL when filters change
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    router.replace(buildPageUrl(filters, baseCategory, page), { scroll: false });
  }, [filters, baseCategory, page]);

  // Fetch products whenever filters, category, or page change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(buildApiUrl(filters, baseCategory, page))
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        setProducts(json.data || []);
        setCount(json.count || 0);
        setTotalPages(json.totalPages || 1);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, baseCategory, page]);

  // Fetch filter groups when baseCategory changes
  useEffect(() => {
    const url = baseCategory
      ? `/api/categories?baseCategory=${encodeURIComponent(baseCategory)}`
      : `/api/categories`;
    fetch(url).then(r => r.json()).then(d => setGroups(d.groups || {}));
  }, [baseCategory]);

  // Reset page when filters/category change
  const updateFilters = (f: FilterState) => { setFilters(f); setPage(1); };
  const updateCategory = (cat: string) => {
    setBaseCategory(cat);
    setFilters(prev => ({ ...prev, categories: {} })); // clear category filters on nav
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ ...filters, search: searchInput });
  };

  return (
    <div className="storefront">
      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-block">
            <span className="logo-icon">✦</span>
            <div>
              <h1 className="logo-name">THREADWORKS</h1>
              <p className="logo-sub">Custom Apparel & Trade</p>
            </div>
          </div>

          {/* Search bar in header */}
          <form className="header-search" onSubmit={handleSearchSubmit}>
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search brand, style name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="search-input"
            />
            {searchInput && (
              <button type="button" className="search-clear"
                onClick={() => { setSearchInput(""); updateFilters({ ...filters, search: "" }); }}>
                ✕
              </button>
            )}
            <button type="submit" className="search-btn">Search</button>
          </form>

          <div className="header-tagline">Buy with Barter Bucks · Wear what you love</div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h2 className="hero-title">Premium Blanks.<br />Barter Welcome.</h2>
          <p className="hero-body">
            Browse our full catalog of wholesale activewear &amp; apparel.
            Buy with Barter Bucks — no cash required.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat"><span className="stat-num">200+</span><span className="stat-label">Brands</span></div>
          <div className="stat"><span className="stat-num">5k+</span><span className="stat-label">Styles</span></div>
          <div className="stat"><span className="stat-num">100%</span><span className="stat-label">Trade Ready</span></div>
        </div>
      </section>

      {/* Category nav */}
      <CategoryNav baseCategory={baseCategory} onBaseCategory={updateCategory} />

      {/* Active filter chips */}
      {(Object.values(filters.categories).flat().length > 0 || filters.brand || filters.search) && (
        <div className="active-chips">
          {filters.search && (
            <span className="chip">
              "{filters.search}"
              <button onClick={() => { setSearchInput(""); updateFilters({ ...filters, search: "" }); }}>✕</button>
            </span>
          )}
          {filters.brand && (
            <span className="chip">
              {filters.brand}
              <button onClick={() => updateFilters({ ...filters, brand: "" })}>✕</button>
            </span>
          )}
          {Object.entries(filters.categories).flatMap(([g, ids]) =>
            ids.map(id => {
              const cat = groups[g]?.categories.find((c: any) => c.id === id);
              return cat ? (
                <span key={`${g}-${id}`} className="chip">
                  {cat.name}
                  <button onClick={() => {
                    const next = (filters.categories[g] || []).filter(x => x !== id);
                    updateFilters({ ...filters, categories: { ...filters.categories, [g]: next } });
                  }}>✕</button>
                </span>
              ) : null;
            })
          )}
        </div>
      )}

      {/* Main layout: sidebar + grid */}
      <div className="main-layout">
        <FilterSidebar
          filters={filters}
          onChange={updateFilters}
          groups={groups}
          resultCount={count}
          loading={loading}
        />

        <div className="grid-area">
          {/* Mobile filter bar (rendered by FilterSidebar) */}

          {loading ? (
            <div className="loading-grid">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">◎</span>
              <p>No products match your filters.</p>
              <button className="clear-link" onClick={() => updateFilters({ ...filters, categories: {}, brand: "", search: "", minPrice: "", maxPrice: "" })}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {products.map(p => (
                <ProductCard key={p.style_id} product={p} onInquire={() => setSelectedProduct(p)} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <InquiryModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <style jsx>{`
        .storefront { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }

        /* Header */
        .site-header { border-bottom: 1px solid #1a1a1a; padding: 1rem 2rem; }
        .header-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
        .logo-block { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .logo-icon { font-size: 1.4rem; color: #e8c97e; }
        .logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.12em; color: #f0ede8; margin: 0; line-height: 1; }
        .logo-sub { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: #666; margin: 0; }
        .header-tagline { font-size: 0.75rem; color: #555; letter-spacing: 0.04em; margin-left: auto; }

        /* Search */
        .header-search {
          display: flex; align-items: center; flex: 1; max-width: 400px;
          background: #111; border: 1px solid #2a2a2a; border-radius: 6px;
          padding: 0 0.75rem; transition: border-color 0.2s;
        }
        .header-search:focus-within { border-color: #e8c97e44; }
        .search-icon { color: #555; font-size: 1rem; }
        .search-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #f0ede8; font-size: 0.85rem; padding: 0.6rem 0.5rem; font-family: inherit;
        }
        .search-input::placeholder { color: #444; }
        .search-clear { background: none; border: none; color: #555; cursor: pointer; font-size: 0.75rem; padding: 0.2rem; }
        .search-btn { background: none; border: none; color: #e8c97e; font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0.3rem 0; font-family: inherit; letter-spacing: 0.05em; }

        /* Hero */
        .hero { max-width: 1400px; margin: 0 auto; padding: 2.5rem 2rem 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; flex-wrap: wrap; }
        .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem); letter-spacing: 0.04em; line-height: 1; margin: 0 0 0.75rem; }
        .hero-body { font-size: 0.9rem; color: #888; max-width: 420px; line-height: 1.7; margin: 0; }
        .hero-stats { display: flex; gap: 2rem; }
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; color: #e8c97e; line-height: 1; }
        .stat-label { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: #555; margin-top: 2px; }

        /* Active chips */
        .active-chips {
          max-width: 1400px; margin: 0 auto; padding: 0.75rem 2rem 0;
          display: flex; flex-wrap: wrap; gap: 0.4rem;
        }
        .chip {
          display: inline-flex; align-items: center; gap: 0.35rem;
          background: #e8c97e18; border: 1px solid #e8c97e44; color: #e8c97e;
          font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 999px;
        }
        .chip button { background: none; border: none; color: #e8c97e88; cursor: pointer; font-size: 0.7rem; padding: 0; line-height: 1; }
        .chip button:hover { color: #e8c97e; }

        /* Main layout */
        .main-layout {
          max-width: 1400px; margin: 0 auto;
          padding: 1.25rem 2rem 4rem;
          display: flex; gap: 1.5rem; align-items: flex-start;
        }

        /* Grid */
        .grid-area { flex: 1; min-width: 0; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.1rem; }
        .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.1rem; }
        .skeleton-card { height: 300px; background: linear-gradient(90deg,#161616 25%,#1e1e1e 50%,#161616 75%); background-size: 200% 100%; border-radius: 8px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .empty-state { text-align: center; padding: 4rem 2rem; color: #555; }
        .empty-icon { font-size: 2rem; display: block; margin-bottom: 1rem; }
        .clear-link { margin-top: 1rem; background: none; border: 1px solid #333; color: #888; padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.82rem; }
        .clear-link:hover { border-color: #e8c97e; color: #e8c97e; }

        /* Pagination */
        .pagination { display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-top: 3rem; }
        .page-btn { padding: 0.55rem 1.4rem; border: 1px solid #2a2a2a; background: transparent; color: #f0ede8; cursor: pointer; border-radius: 4px; font-family: inherit; font-size: 0.82rem; transition: all 0.2s; }
        .page-btn:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .page-btn:disabled { opacity: 0.3; cursor: default; }
        .page-info { font-size: 0.82rem; color: #555; }

        @media (max-width: 768px) {
          .main-layout { flex-direction: column; padding: 0 0 4rem; }
          .grid-area { padding: 1rem; }
          .hero { padding: 1.5rem 1rem 1rem; }
          .active-chips { padding: 0.5rem 1rem 0; }
          .header-tagline { display: none; }
          .header-search { max-width: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <Suspense>
      <StorefrontInner />
    </Suspense>
  );
}
