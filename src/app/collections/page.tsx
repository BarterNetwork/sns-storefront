"use client";

import { useEffect, useState } from "react";
import DesignMockup from "@/components/DesignMockup";
import { useCart } from "@/context/CartContext";
import type { Collection, CollectionProduct } from "@/lib/collections";

type Card = { styleId: number; brandName: string; title: string; frontImage: string | null; backImage: string | null } | null;
type ListCollection = Omit<Collection, "products"> & { products: (CollectionProduct & { card: Card })[] };

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ListCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { count, openCart } = useCart();

  useEffect(() => {
    fetch("/api/collections")
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setCollections(j.data || []); })
      .catch(() => setError("Couldn't load designs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="top">
        <a href="/" className="back">← Catalog</a>
        <button className="cart-btn" onClick={openCart}>Cart{count > 0 && <span className="badge">{count}</span>}</button>
      </header>

      <section className="hero">
        <h1>Shop Designs</h1>
        <p>Ready-made designs you can get on a tee, hoodie, crewneck and more. Pick a design, then choose your product, color and sizes.</p>
      </section>

      {loading && (
        <div className="grid">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton" />)}</div>
      )}
      {!loading && error && <p className="msg">Designs are unavailable right now.</p>}
      {!loading && !error && collections.length === 0 && <p className="msg">New designs are coming soon.</p>}

      <div className="grid">
        {collections.map(c => {
          const first = c.products[0];
          const img = first.print_location === "Back" ? (first.card?.backImage || first.card?.frontImage) : first.card?.frontImage;
          return (
            <a key={c.id} href={`/collections/${c.slug}`} className="card">
              <DesignMockup garmentImage={img || null} designUrl={c.design_url} placement={first.placement} alt={c.name} />
              <div className="card-body">
                <h2>{c.name}</h2>
                <p className="avail">
                  Available on {c.products.map(p => p.label || p.card?.title || "Shirt").join(" · ")}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; padding-bottom: 4rem; }
        .top { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #1a1a1a; }
        .back { color: #888; text-decoration: none; font-size: 0.85rem; }
        .back:hover { color: #e8c97e; }
        .cart-btn { display: flex; align-items: center; gap: 0.4rem; background: transparent; border: 1px solid #2a2a2a; color: #f0ede8; border-radius: 999px; padding: 0.45rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.82rem; }
        .cart-btn:hover { border-color: #e8c97e; }
        .badge { background: #e8c97e; color: #0a0a0a; font-size: 0.7rem; font-weight: 700; border-radius: 999px; padding: 0.05rem 0.45rem; }
        .hero { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem 1.5rem; }
        h1 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: clamp(2.2rem, 6vw, 3.4rem); letter-spacing: 0.04em; margin: 0; }
        .hero p { color: #888; max-width: 560px; margin: 0.4rem 0 0; line-height: 1.5; }
        .msg { text-align: center; color: #666; padding: 3rem 1rem; }
        .grid { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
        .card { background: #111; border: 1px solid #1c1c1c; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; transition: border-color 0.2s, transform 0.2s; }
        .card:hover { border-color: #e8c97e66; transform: translateY(-2px); }
        .card-body { padding: 0.85rem 1rem 1rem; }
        h2 { font-size: 1rem; margin: 0 0 0.3rem; }
        .avail { font-size: 0.78rem; color: #888; margin: 0; }
        .skeleton { aspect-ratio: 0.82; background: #141414; border-radius: 12px; animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 50% { opacity: 0.5; } }
        @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; padding: 0 1rem; } .hero { padding: 1.75rem 1rem 1rem; } }
      `}</style>
    </div>
  );
}
