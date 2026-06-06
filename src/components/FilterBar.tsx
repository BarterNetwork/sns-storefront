"use client";

interface Props {
  searchInput: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  inStock: boolean;
  onInStockChange: (v: boolean) => void;
  resultCount: number;
  loading: boolean;
}

export default function FilterBar({
  searchInput, onSearchChange, onSearchSubmit,
  inStock, onInStockChange,
  resultCount, loading,
}: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-inner">
        <form className="search-form" onSubmit={onSearchSubmit}>
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search brand, style name…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="filter-controls">
          <label className="toggle-wrap">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => onInStockChange(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">In Stock Only</span>
          </label>

          <span className="result-count">
            {loading ? "Loading…" : `${resultCount.toLocaleString()} styles`}
          </span>
        </div>
      </div>

      <style jsx>{`
        .filter-bar {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 2rem;
          border-bottom: 1px solid #1a1a1a;
        }
        .filter-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .search-form {
          display: flex;
          align-items: center;
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          padding: 0 0.75rem;
          flex: 1;
          max-width: 440px;
          transition: border-color 0.2s;
        }
        .search-form:focus-within { border-color: #e8c97e44; }
        .search-icon { color: #555; font-size: 1.1rem; }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #f0ede8;
          font-size: 0.88rem;
          padding: 0.65rem 0.5rem;
          font-family: inherit;
        }
        .search-input::placeholder { color: #444; }
        .search-btn {
          background: transparent;
          border: none;
          color: #e8c97e;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          cursor: pointer;
          padding: 0.3rem 0;
          font-family: inherit;
        }

        .filter-controls {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .toggle-wrap {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
        }
        .toggle-input { display: none; }
        .toggle-track {
          width: 36px;
          height: 20px;
          background: #2a2a2a;
          border-radius: 999px;
          position: relative;
          transition: background 0.2s;
        }
        .toggle-input:checked + .toggle-track { background: #e8c97e; }
        .toggle-thumb {
          position: absolute;
          top: 2px; left: 2px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #888;
          transition: transform 0.2s, background 0.2s;
        }
        .toggle-input:checked + .toggle-track .toggle-thumb {
          transform: translateX(16px);
          background: #0a0a0a;
        }
        .toggle-label {
          font-size: 0.82rem;
          color: #888;
        }
        .result-count {
          font-size: 0.82rem;
          color: #555;
          min-width: 80px;
          text-align: right;
        }

        @media (max-width: 600px) {
          .filter-inner { flex-direction: column; align-items: stretch; }
          .search-form { max-width: 100%; }
        }
      `}</style>
    </div>
  );
}
