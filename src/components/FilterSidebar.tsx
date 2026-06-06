"use client";

import { useState } from "react";

const GROUP_ORDER = [
  "gender", "style", "material", "features",
  "sustainability", "special", "weight", "sport",
  "hat_type", "bag_type",
];

export type FilterState = {
  search: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sustainable: boolean;
  newStyle: boolean;
  categories: Record<string, number[]>; // group -> selected categoryIDs
};

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  groups: Record<string, { label: string; categories: { id: number; name: string; count: number }[] }>;
  resultCount: number;
  loading: boolean;
}

export default function FilterSidebar({ filters, onChange, groups, resultCount, loading }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const toggleCategory = (group: string, id: number) => {
    const current = filters.categories[group] || [];
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    set({ categories: { ...filters.categories, [group]: next } });
  };

  const toggleCollapse = (g: string) =>
    setCollapsed(prev => ({ ...prev, [g]: !prev[g] }));

  const activeFilterCount =
    Object.values(filters.categories).flat().length +
    (filters.inStock ? 1 : 0) +
    (filters.sustainable ? 1 : 0) +
    (filters.newStyle ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0);

  const clearAll = () =>
    set({ categories: {}, inStock: true, sustainable: false, newStyle: false, brand: "", minPrice: "", maxPrice: "" });

  const sidebar = (
    <div className="sidebar-inner">
      {/* Header */}
      <div className="sidebar-head">
        <span className="sidebar-title">Filters {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}</span>
        {activeFilterCount > 0 && (
          <button className="clear-btn" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* Result count */}
      <p className="result-count">
        {loading ? "Loading…" : `${resultCount.toLocaleString()} styles`}
      </p>

      {/* Quick toggles */}
      <div className="section">
        <label className="toggle-row">
          <span>In Stock Only</span>
          <input type="checkbox" checked={filters.inStock} onChange={e => set({ inStock: e.target.checked })} className="sr-only" />
          <span className={`toggle ${filters.inStock ? "on" : ""}`}><span className="thumb" /></span>
        </label>
        <label className="toggle-row">
          <span>New Arrivals</span>
          <input type="checkbox" checked={filters.newStyle} onChange={e => set({ newStyle: e.target.checked })} className="sr-only" />
          <span className={`toggle ${filters.newStyle ? "on" : ""}`}><span className="thumb" /></span>
        </label>
        <label className="toggle-row">
          <span>Sustainable</span>
          <input type="checkbox" checked={filters.sustainable} onChange={e => set({ sustainable: e.target.checked })} className="sr-only" />
          <span className={`toggle ${filters.sustainable ? "on" : ""}`}><span className="thumb" /></span>
        </label>
      </div>

      {/* Price range */}
      <div className="section">
        <button className="group-header" onClick={() => toggleCollapse("price")}>
          <span>Price (BB)</span>
          <span className="chevron">{collapsed.price ? "+" : "−"}</span>
        </button>
        {!collapsed.price && (
          <div className="price-row">
            <input
              type="number" min="0" placeholder="Min"
              value={filters.minPrice}
              onChange={e => set({ minPrice: e.target.value })}
              className="price-input"
            />
            <span className="price-sep">–</span>
            <input
              type="number" min="0" placeholder="Max"
              value={filters.maxPrice}
              onChange={e => set({ maxPrice: e.target.value })}
              className="price-input"
            />
          </div>
        )}
      </div>

      {/* Brand search */}
      <div className="section">
        <button className="group-header" onClick={() => toggleCollapse("brand")}>
          <span>Brand</span>
          <span className="chevron">{collapsed.brand ? "+" : "−"}</span>
        </button>
        {!collapsed.brand && (
          <input
            type="text" placeholder="e.g. Gildan, BELLA+CANVAS"
            value={filters.brand}
            onChange={e => set({ brand: e.target.value })}
            className="brand-input"
          />
        )}
      </div>

      {/* Category groups */}
      {GROUP_ORDER.filter(g => groups[g]).map(g => {
        const group = groups[g];
        const selected = filters.categories[g] || [];
        const isCollapsed = collapsed[g] ?? false;

        return (
          <div key={g} className="section">
            <button className="group-header" onClick={() => toggleCollapse(g)}>
              <span>
                {group.label}
                {selected.length > 0 && <span className="selected-count"> ({selected.length})</span>}
              </span>
              <span className="chevron">{isCollapsed ? "+" : "−"}</span>
            </button>
            {!isCollapsed && (
              <div className="cat-list">
                {group.categories.map(cat => {
                  const checked = selected.includes(cat.id);
                  return (
                    <label key={cat.id} className={`cat-item ${checked ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(g, cat.id)}
                        className="sr-only"
                      />
                      <span className="checkmark">{checked ? "✓" : ""}</span>
                      <span className="cat-name">{cat.name}</span>
                      <span className="cat-count">{cat.count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        .sidebar-inner { display: flex; flex-direction: column; gap: 0; }

        .sidebar-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.25rem 0.5rem;
        }
        .sidebar-title { font-size: 0.85rem; font-weight: 600; color: #f0ede8; display: flex; align-items: center; gap: 0.5rem; }
        .badge { background: #e8c97e; color: #0a0a0a; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; }
        .clear-btn { font-size: 0.72rem; color: #888; background: none; border: none; cursor: pointer; font-family: inherit; }
        .clear-btn:hover { color: #e8c97e; }

        .result-count { font-size: 0.75rem; color: #555; padding: 0 1.25rem 0.75rem; margin: 0; }

        .section {
          border-top: 1px solid #1a1a1a;
          padding: 0.75rem 1.25rem;
        }

        /* Toggles */
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; padding: 0.3rem 0; font-size: 0.82rem; color: #aaa;
        }
        .toggle {
          width: 32px; height: 18px; background: #2a2a2a; border-radius: 999px;
          position: relative; transition: background 0.2s; flex-shrink: 0;
        }
        .toggle.on { background: #e8c97e; }
        .thumb {
          position: absolute; top: 2px; left: 2px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #888; transition: transform 0.2s, background 0.2s;
        }
        .toggle.on .thumb { transform: translateX(14px); background: #0a0a0a; }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

        /* Price */
        .price-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.6rem; }
        .price-input {
          flex: 1; height: 34px; background: #111; border: 1px solid #2a2a2a;
          border-radius: 6px; padding: 0 0.6rem; color: #f0ede8; font-size: 0.8rem;
          font-family: inherit; outline: none; width: 0;
        }
        .price-input:focus { border-color: #e8c97e44; }
        .price-sep { color: #555; font-size: 0.8rem; }

        /* Brand */
        .brand-input {
          width: 100%; margin-top: 0.6rem; height: 34px; background: #111;
          border: 1px solid #2a2a2a; border-radius: 6px; padding: 0 0.6rem;
          color: #f0ede8; font-size: 0.8rem; font-family: inherit; outline: none;
          box-sizing: border-box;
        }
        .brand-input:focus { border-color: #e8c97e44; }
        .brand-input::placeholder { color: #444; }

        /* Group headers */
        .group-header {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          background: none; border: none; color: #ccc; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; padding: 0; font-family: inherit; text-align: left;
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .group-header:hover { color: #f0ede8; }
        .chevron { color: #555; font-size: 1rem; font-weight: 300; }
        .selected-count { color: #e8c97e; font-weight: 700; }

        /* Category list */
        .cat-list { margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0.1rem; max-height: 220px; overflow-y: auto; }
        .cat-list::-webkit-scrollbar { width: 3px; }
        .cat-list::-webkit-scrollbar-thumb { background: #333; border-radius: 999px; }

        .cat-item {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.4rem;
          cursor: pointer; border-radius: 5px; transition: background 0.15s;
          font-size: 0.8rem; color: #888;
        }
        .cat-item:hover { background: #161616; color: #ccc; }
        .cat-item.checked { color: #e8c97e; }

        .checkmark {
          width: 14px; height: 14px; border: 1px solid #333; border-radius: 3px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem; flex-shrink: 0; transition: all 0.15s;
        }
        .cat-item.checked .checkmark { background: #e8c97e; border-color: #e8c97e; color: #0a0a0a; }
        .cat-name { flex: 1; }
        .cat-count { color: #444; font-size: 0.72rem; }
        .cat-item.checked .cat-count { color: #e8c97e88; }
      `}</style>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="desktop-sidebar">{sidebar}</aside>

      {/* Mobile filter button */}
      <div className="mobile-bar">
        <button className="mobile-filter-btn" onClick={() => setMobileOpen(true)}>
          ⚡ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
        <span className="mobile-count">
          {loading ? "Loading…" : `${resultCount.toLocaleString()} styles`}
        </span>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-head">
              <span>Filters</span>
              <button className="drawer-close" onClick={() => setMobileOpen(false)}>✕</button>
            </div>
            {sidebar}
            <div className="drawer-foot">
              <button className="apply-btn" onClick={() => setMobileOpen(false)}>
                Show {resultCount.toLocaleString()} styles
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .desktop-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          align-self: flex-start;
          position: sticky;
          top: 1rem;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
        .desktop-sidebar::-webkit-scrollbar { width: 3px; }
        .desktop-sidebar::-webkit-scrollbar-thumb { background: #222; border-radius: 999px; }

        .mobile-bar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #1a1a1a;
        }
        .mobile-filter-btn {
          background: #111; border: 1px solid #2a2a2a; color: #f0ede8;
          padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.82rem;
          cursor: pointer; font-family: inherit;
        }
        .mobile-count { font-size: 0.8rem; color: #555; }

        .mobile-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.7);
          display: flex; align-items: flex-end;
        }
        .mobile-drawer {
          width: 100%; background: #111; border-radius: 16px 16px 0 0;
          max-height: 85vh; overflow-y: auto;
        }
        .drawer-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.25rem; border-bottom: 1px solid #1a1a1a;
          font-size: 0.9rem; font-weight: 600; color: #f0ede8;
          position: sticky; top: 0; background: #111; z-index: 1;
        }
        .drawer-close {
          background: none; border: none; color: #888; font-size: 1rem;
          cursor: pointer; padding: 0.25rem;
        }
        .drawer-foot {
          padding: 1rem 1.25rem;
          position: sticky; bottom: 0; background: #111;
          border-top: 1px solid #1a1a1a;
        }
        .apply-btn {
          width: 100%; padding: 0.85rem; background: #e8c97e; color: #0a0a0a;
          border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }

        @media (max-width: 768px) {
          .desktop-sidebar { display: none; }
          .mobile-bar { display: flex; }
        }
      `}</style>
    </>
  );
}
