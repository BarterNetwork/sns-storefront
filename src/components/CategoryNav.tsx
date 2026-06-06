"use client";

// Parent categories with their sub-categories
const CATEGORIES = [
  { label: "All",         value: "",                    subs: [] },
  {
    label: "T-Shirts", value: "T-Shirts - Premium",
    subs: [
      { label: "Premium",    value: "T-Shirts - Premium" },
      { label: "Core",       value: "T-Shirts - Core" },
      { label: "Long Sleeve",value: "T-Shirts - Long Sleeve" },
    ],
  },
  {
    label: "Fleece", value: "Fleece - Premium - Hood",
    subs: [
      { label: "Premium Hood",  value: "Fleece - Premium - Hood" },
      { label: "Premium Crew",  value: "Fleece - Premium - Crew" },
      { label: "Core Hood",     value: "Fleece - Core - Hood" },
      { label: "Core Crew",     value: "Fleece - Core - Crew" },
    ],
  },
  { label: "Bottoms",     value: "Bottoms",     subs: [] },
  { label: "Headwear",    value: "Headwear",    subs: [] },
  { label: "Outerwear",   value: "Outerwear",   subs: [] },
  { label: "Bags",        value: "Bags",        subs: [] },
  { label: "Wovens",      value: "Wovens",      subs: [] },
  { label: "Accessories", value: "Accessories", subs: [] },
  { label: "Polos",       value: "Polos",       subs: [] },
  { label: "Knits",       value: "Knits & Layering", subs: [] },
];

interface Props {
  baseCategory: string;
  onBaseCategory: (v: string) => void;
}

export default function CategoryNav({ baseCategory, onBaseCategory }: Props) {
  const active = CATEGORIES.find(c =>
    c.value === baseCategory || c.subs.some(s => s.value === baseCategory)
  ) || CATEGORIES[0];

  const hasSubs = active.subs.length > 0;

  return (
    <div className="category-nav">
      {/* Parent tabs */}
      <div className="parent-tabs">
        {CATEGORIES.map((c) => {
          const isActive = active.label === c.label;
          return (
            <button
              key={c.label}
              className={`parent-tab ${isActive ? "active" : ""}`}
              onClick={() => onBaseCategory(c.value)}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Sub-category pills */}
      {hasSubs && (
        <div className="sub-tabs">
          {active.subs.map((s) => (
            <button
              key={s.value}
              className={`sub-tab ${baseCategory === s.value ? "active" : ""}`}
              onClick={() => onBaseCategory(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .category-nav {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.25rem 2rem 0;
        }

        /* Parent tabs */
        .parent-tabs {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .parent-tab {
          padding: 0.45rem 1.1rem;
          border: 1px solid #2a2a2a;
          border-radius: 999px;
          background: transparent;
          color: #888;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.03em;
          font-family: inherit;
          white-space: nowrap;
        }
        .parent-tab:hover { border-color: #e8c97e; color: #e8c97e; }
        .parent-tab.active {
          background: #e8c97e;
          border-color: #e8c97e;
          color: #0a0a0a;
          font-weight: 600;
        }

        /* Sub-category pills */
        .sub-tabs {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
          margin-top: 0.6rem;
          padding-left: 0.25rem;
        }
        .sub-tab {
          padding: 0.3rem 0.85rem;
          border: 1px solid #333;
          border-radius: 999px;
          background: transparent;
          color: #666;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .sub-tab:hover { border-color: #888; color: #ccc; }
        .sub-tab.active {
          border-color: #e8c97e88;
          color: #e8c97e;
          background: #e8c97e11;
        }
      `}</style>
    </div>
  );
}
