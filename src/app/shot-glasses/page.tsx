"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Occasion {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
  design_count: number;
  thumbnail: string | null;
}

export default function ShotGlassesPage() {
  const router = useRouter();
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/shot-glasses/occasions")
      .then(r => r.json())
      .then(d => { setOccasions(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="site-header">
        <div className="header-inner">
          <button className="back-btn" onClick={() => router.push("/")}>← Back to Apparel</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="T-Shirt Depot & More" width={44} height={44} style={{ height: 44, width: 44, objectFit: "contain" }} />
          <span className="header-tagline">Custom Gift Collections</span>
        </div>
      </header>

      <section className="banner">
        <div className="banner-inner">
          <div className="banner-eyebrow">Custom Gifts</div>
          <h1 className="banner-title">Personalized Shot Glasses</h1>
          <p className="banner-sub">Names · Photos · Dates · Custom Messages — Personalization Included</p>
        </div>
      </section>

      <main className="main">
        <div className="section-header" id="occasions">
          <h2 className="section-title">Shop by Occasion</h2>
          <p className="section-sub">Select an occasion to browse designs and configure your order</p>
        </div>

        {loading ? (
          <div className="occasions-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="occasion-skeleton" />)}
          </div>
        ) : occasions.length === 0 ? (
          <div className="empty">No collections available yet. Check back soon!</div>
        ) : (
          <div className="occasions-grid">
            {occasions.map(occ => (
              <Link key={occ.slug} href={`/shot-glasses/${occ.slug}`} className="occasion-card">
                <div className="occasion-img-wrap">
                  {occ.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={occ.thumbnail} alt={occ.name} className="occasion-img" />
                  ) : (
                    <div className="occasion-img-placeholder">🥃</div>
                  )}
                </div>
                <div className="occasion-info">
                  <span className="occasion-name">{occ.name}</span>
                  <span className="occasion-count">{occ.design_count} design{occ.design_count !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pricing reference */}
        <section className="pricing-strip">
          <h3 className="strip-title">Pricing at a Glance</h3>
          <div className="pricing-cols">
            <div className="pricing-col">
              <div className="pricing-col-label">Personalized Shot Glasses</div>
              <div className="pricing-row"><span>1–5 glasses</span><span>$10.00 each</span></div>
              <div className="pricing-row"><span>6–12 glasses</span><span>$8.00 each</span></div>
              <div className="pricing-row"><span>13–24 glasses</span><span>$6.00 each</span></div>
              <div className="pricing-row"><span>25+ glasses</span><span>$5.00 each</span></div>
              <div className="pricing-note">Tall glass +$2.00 · Personalization included</div>
            </div>
            <div className="pricing-col">
              <div className="pricing-col-label">Single Personalized Carrier</div>
              <div className="pricing-row"><span>1–5</span><span>$5.00 each</span></div>
              <div className="pricing-row"><span>6–12</span><span>$4.00 each</span></div>
              <div className="pricing-row"><span>13–24</span><span>$3.50 each</span></div>
              <div className="pricing-row"><span>25+</span><span>$3.00 each</span></div>
            </div>
            <div className="pricing-col">
              <div className="pricing-col-label">Double Personalized Carrier</div>
              <div className="pricing-row"><span>1–5</span><span>$6.00 each</span></div>
              <div className="pricing-row"><span>6–12</span><span>$5.50 each</span></div>
              <div className="pricing-row"><span>13–24</span><span>$5.00 each</span></div>
              <div className="pricing-row"><span>25+</span><span>$5.00 each</span></div>
            </div>
            <div className="pricing-col">
              <div className="pricing-col-label">Clear Gift Boxes</div>
              <div className="pricing-row"><span>1–5</span><span>$4.00 each</span></div>
              <div className="pricing-row"><span>6–12</span><span>$3.50 each</span></div>
              <div className="pricing-row"><span>13–24</span><span>$3.00 each</span></div>
              <div className="pricing-row"><span>25+</span><span>$2.50 each</span></div>
              <div className="pricing-note">Bow +$0.50 · Ribbon +$1.00 · UV Sticker +$1.50</div>
            </div>
          </div>
          <p className="strip-note">
            Carrier discounts are based on the number of carriers. Box discounts are based on the number of boxes.
            Mix names, photos, and designs within one order — bulk discount applies to total glass quantity.
          </p>
        </section>
      </main>

      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }
        .site-header { border-bottom: 1px solid #1a1a1a; padding: 0.9rem 2rem; }
        .header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
        .back-btn { background: none; border: 1px solid #2a2a2a; color: #888; font-size: 0.8rem; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.2s; white-space: nowrap; }
        .back-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .header-tagline { font-size: 0.72rem; color: #444; margin-left: auto; letter-spacing: 0.04em; }

        .banner { border-bottom: 1px solid #1a1a1a; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
        .banner-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 2rem 2rem; text-align: center; }
        .banner-eyebrow { font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; color: #e8c97e; font-weight: 600; margin-bottom: 0.5rem; }
        .banner-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.6rem, 8vw, 4.5rem); letter-spacing: 0.06em; line-height: 1; margin: 0 0 0.6rem; color: #f0ede8; }
        .banner-sub { font-size: 0.78rem; color: #555; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }

        .main { max-width: 1200px; margin: 0 auto; padding: 2.5rem 2rem 4rem; }
        .section-header { margin-bottom: 1.75rem; }
        .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 0.04em; margin: 0 0 0.3rem; }
        .section-sub { font-size: 0.82rem; color: #666; margin: 0; }

        .occasions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 3.5rem; }
        .occasion-card { display: flex; flex-direction: column; background: #111; border: 1px solid #1e1e1e; border-radius: 10px; overflow: hidden; cursor: pointer; text-decoration: none; color: inherit; transition: border-color 0.2s, transform 0.15s; }
        .occasion-card:hover { border-color: #e8c97e55; transform: translateY(-2px); }
        .occasion-img-wrap { aspect-ratio: 1; overflow: hidden; background: #161616; display: flex; align-items: center; justify-content: center; }
        .occasion-img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .occasion-img-placeholder { font-size: 2.5rem; }
        .occasion-info { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .occasion-name { font-size: 0.88rem; font-weight: 600; color: #f0ede8; }
        .occasion-count { font-size: 0.72rem; color: #555; }
        .occasion-skeleton { aspect-ratio: 1; background: linear-gradient(90deg,#161616 25%,#1e1e1e 50%,#161616 75%); background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .empty { text-align: center; padding: 4rem 2rem; color: #555; font-size: 0.9rem; }

        .pricing-strip { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 1.75rem 2rem; }
        .strip-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 0.04em; margin: 0 0 1.25rem; }
        .pricing-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1rem; }
        .pricing-col-label { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: #e8c97e; font-weight: 600; margin-bottom: 0.5rem; }
        .pricing-row { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.8rem; color: #888; padding: 0.25rem 0; border-bottom: 1px solid #1a1a1a; }
        .pricing-row span:last-child { color: #ccc; white-space: nowrap; }
        .pricing-note { font-size: 0.7rem; color: #555; margin-top: 0.4rem; }
        .strip-note { font-size: 0.75rem; color: #555; margin: 0; border-top: 1px solid #1e1e1e; padding-top: 0.85rem; }

        @media (max-width: 768px) {
          .banner-inner { padding: 1.75rem 1rem 1.5rem; }
          .main { padding: 1.5rem 1rem 3rem; }
          .occasions-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
        }
      `}</style>
    </div>
  );
}
