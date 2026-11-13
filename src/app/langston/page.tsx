"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

const STORAGE = "https://kekrowafchdsijdolbuj.supabase.co/storage/v1/object/public/shot-glass-designs/langston";

const ATHLETES = [
  { id: 1,  name: "Janiyah Tucker",   number: "12", photo: `${STORAGE}/janiyah-tucker.png` },
  { id: 2,  name: "Talia Vann",       number: "24", photo: `${STORAGE}/talia-vann.png` },
  { id: 3,  name: "Hannah Wilson",    number: null,  photo: `${STORAGE}/hannah-wilson.png` },
  { id: 4,  name: "Ally Jefferson",   number: "22", photo: `${STORAGE}/ally-jefferson.png` },
  { id: 5,  name: "Samia Smith",      number: "24", photo: `${STORAGE}/samia-smith.png` },
  { id: 6,  name: "Morgan Dow",       number: "5",  photo: `${STORAGE}/morgan-dow.png` },
  { id: 7,  name: "Kindle Rowe",      number: null,  photo: `${STORAGE}/kindle-rowe.png` },
  { id: 8,  name: "Aundrea Walter",   number: null,  photo: `${STORAGE}/aundrea-walter.png` },
  { id: 9,  name: "Analeise Maharaj", number: "1",  photo: `${STORAGE}/analeise-maharaj.png` },
];

const PRODUCTS = [
  { type: "tshirt",     label: "T-Shirt",     price: 20 },
  { type: "longsleeve", label: "Long Sleeve", price: 25 },
  { type: "sweatshirt", label: "Sweatshirt",  price: 30 },
];

const SIZE_UPCHARGE: Record<string, number> = {
  "2XL": 5,
  "3XL": 7,
  "4XL": 9,
  "5XL": 10,
};

const PRODUCT_SIZES: Record<string, { group: string; sizes: string[] }[]> = {
  tshirt: [
    { group: "Toddler", sizes: ["2T", "3T", "4T", "5T", "6T"] },
    { group: "Youth",   sizes: ["XS", "S", "M", "L", "XL"] },
    { group: "Adult",   sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] },
  ],
  longsleeve: [
    { group: "Youth",  sizes: ["XS", "S", "M", "L", "XL"] },
    { group: "Adult",  sizes: ["S", "M", "L", "XL", "2XL", "3XL"] },
  ],
  sweatshirt: [
    { group: "Youth",  sizes: ["XS", "S", "M", "L", "XL"] },
    { group: "Adult",  sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] },
  ],
};

type Athlete = typeof ATHLETES[0];
type Product = typeof PRODUCTS[0];

export default function LangstonPage() {
  const { addItem } = useCart();
  const [lightbox, setLightbox] = useState<Athlete | null>(null);
  const [open, setOpen]         = useState(false);
  const [selAthlete, setSelAthlete] = useState<Athlete | null>(null);
  const [selProduct, setSelProduct] = useState<Product | null>(null);
  const [selSize, setSelSize]   = useState("");
  const [qty, setQty]           = useState(1);

  function launch(athlete: Athlete, product?: Product) {
    setSelAthlete(athlete);
    setSelProduct(product ?? null);
    setSelSize("");
    setQty(1);
    setOpen(true);
  }

  function close() { setOpen(false); }

  function handleAddToCart() {
    if (!selAthlete || !selProduct || !selSize) return;
    const sku = `langston-${selAthlete.id}-${selProduct.type}-${selSize.toLowerCase().replace(/\s+/g, "")}`;
    addItem({
      sku,
      styleId: selAthlete.id,
      brandName: "Langston University",
      title: `${selAthlete.name} — ${selProduct.label}`,
      styleName: selProduct.label,
      colorName: "Black",
      sizeName: selSize,
      price: selProduct.price + (SIZE_UPCHARGE[selSize] ?? 0),
      qty,
      image: selAthlete.photo,
    });
    close();
  }

  return (
    <div className="page">

      {/* ── Sticky header ───────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="T-Shirt Depot & More" className="header-logo" />
          <div className="header-title">
            <span className="header-school">LANGSTON UNIVERSITY</span>
            <span className="header-team">Lady Lions Basketball</span>
          </div>
          <button className="btn-orange sm header-btn"
            onClick={() => { setSelAthlete(null); setSelProduct(null); setSelSize(""); setQty(1); setOpen(true); }}>
            Order a Shirt
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-left">
            <p className="hero-eyebrow">Official Athlete Merch · Powered by T-Shirt Depot</p>
            <h1 className="hero-headline">
              Wear Their Name.<br />
              Fund Their Game.
            </h1>
            <p className="hero-body">
              Every purchase goes directly to a Langston Lady Lion. These athletes grind every day — now you can back them on and off the court.
            </p>
            <div className="hero-cta-row">
              <button className="btn-orange lg"
                onClick={() => { setSelAthlete(null); setSelProduct(null); setSelSize(""); setQty(1); setOpen(true); }}>
                Shop the Collection
              </button>
            </div>
            <div className="hero-pricing">
              <span className="price-pill">T-Shirt <strong>$20</strong></span>
              <span className="price-pill">Long Sleeve <strong>$25</strong></span>
              <span className="price-pill">Sweatshirt <strong>$30</strong></span>
            </div>
          </div>
          <div className="hero-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${STORAGE}/logo.png`} alt="Langston University Lions" className="hero-logo" />
          </div>
        </div>
      </section>

      {/* ── Marquee strip ───────────────────────────────────────── */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="marquee-item">
              🏀 LANGSTON LADY LIONS &nbsp;·&nbsp; SUPPORT YOUR ATHLETES &nbsp;·&nbsp; LIMITED EDITION MERCH &nbsp;·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── Roster ──────────────────────────────────────────────── */}
      <section className="roster">
        <div className="roster-inner">
          <div className="roster-head">
            <h2 className="section-title">The Roster</h2>
            <p className="section-sub">Nine athletes. Nine exclusive designs. One cause.</p>
          </div>
          <div className="athlete-grid">
            {ATHLETES.map(a => (
              <div key={a.id} className="athlete-card">
                <div className="athlete-img-wrap" onClick={() => setLightbox(a)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.photo} alt={a.name} className="athlete-img" />
                  <div className="athlete-overlay">
                    <span className="overlay-btn">View Shirt</span>
                  </div>
                </div>
                <div className="athlete-footer">
                  <div className="athlete-info">
                    <span className="athlete-name">{a.name}</span>
                    {a.number && <span className="athlete-num">#{a.number}</span>}
                  </div>
                  <div className="athlete-products">
                    {PRODUCTS.map(p => (
                      <button key={p.type} className="product-pill" onClick={() => launch(a, p)}>
                        {p.label} <strong>${p.price}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team design ─────────────────────────────────────────── */}
      <section className="team-section">
        <div className="team-inner">
          <div className="team-img-wrap" onClick={() => setLightbox({ id: 99, name: "Langston Lady Lions", number: null, photo: `${STORAGE}/more-orange-more-blue.png` })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${STORAGE}/more-orange-more-blue.png`} alt="More Orange More Blue" className="team-img" />
            <div className="athlete-overlay"><span className="overlay-btn">Order This Shirt</span></div>
          </div>
          <div className="team-details">
            <div className="team-badge">Team Spirit</div>
            <h3 className="team-name">More Orange. More Blue. More LU.</h3>
            <p className="team-desc">Rep the whole squad. This limited-edition team design celebrates Langston University Lady Lions basketball — perfect for fans, family, and die-hard supporters.</p>
            <div className="athlete-products" style={{ maxWidth: "340px" }}>
              {PRODUCTS.map(p => (
                <button key={p.type} className="product-pill"
                  onClick={() => launch({ id: 99, name: "Langston Lady Lions", number: null, photo: `${STORAGE}/more-orange-more-blue.png` }, p)}>
                  {p.label} <strong>${p.price}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why section ─────────────────────────────────────────── */}
      <section className="why">
        <div className="why-inner">
          <h2 className="section-title center">Why It Matters</h2>
          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon">💰</div>
              <h3>Direct Support</h3>
              <p>Every dollar from your purchase goes directly to the athlete on the shirt — no middlemen, no program fund.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🎓</div>
              <h3>Student Athletes</h3>
              <p>These are full-time students and full-time athletes at Langston University. Your support helps them focus on both.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">👕</div>
              <h3>Exclusive Designs</h3>
              <p>Every design is custom-built for each athlete — these aren't generic shirts. They're collector pieces.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="T-Shirt Depot" className="footer-logo" />
            <p className="footer-tagline">Powered by T-Shirt Depot &amp; More</p>
          </div>
          <div>
            <p className="footer-label">Coordinator</p>
            <p className="footer-name">Crystal Robinson</p>
            <a href="mailto:crystal.robinson@langston.edu" className="footer-email">crystal.robinson@langston.edu</a>
          </div>
          <div>
            <p className="footer-label">How It Works</p>
            <p className="footer-note">Submit your order and Crystal's team will confirm details and handle fulfillment directly.</p>
          </div>
        </div>
      </footer>

      {/* ── Lightbox ────────────────────────────────────────────── */}
      {lightbox && (
        <div className="lb-backdrop" onClick={() => setLightbox(null)}>
          <div className="lb-box" onClick={e => e.stopPropagation()}>
            <button className="lb-close" onClick={() => setLightbox(null)}>✕</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.photo} alt={lightbox.name} className="lb-img" />
            <div className="lb-footer">
              <div className="lb-name">
                {lightbox.name}
                {lightbox.number && <span className="lb-num">#{lightbox.number}</span>}
              </div>
              <button className="btn-orange" onClick={() => {
                const a = lightbox;
                setLightbox(null);
                launch(a);
              }}>
                Order This Shirt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order modal ─────────────────────────────────────────── */}
      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={close}>✕</button>

            {!selAthlete ? (
              /* ── Step 1: pick an athlete ── */
              <div className="modal-body">
                <p className="modal-label">Choose an Athlete</p>
                <div className="picker-grid">
                  {ATHLETES.map(a => (
                    <button key={a.id} className="picker-btn" onClick={() => setSelAthlete(a)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.photo} alt={a.name} className="picker-img" />
                      <span className="picker-name">{a.name}</span>
                    </button>
                  ))}
                  <button className="picker-btn"
                    onClick={() => setSelAthlete({ id: 99, name: "Langston Lady Lions", number: null, photo: `${STORAGE}/more-orange-more-blue.png` })}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${STORAGE}/more-orange-more-blue.png`} alt="Team Design" className="picker-img" />
                    <span className="picker-name">Team Design</span>
                  </button>
                </div>
              </div>

            ) : (
              /* ── Step 2: pick style + size + qty ── */
              <div className="modal-body">
                <div className="selected-athlete">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selAthlete.photo} alt={selAthlete.name} className="selected-thumb" />
                  <div>
                    <p className="selected-name">{selAthlete.name}</p>
                    {selAthlete.number && <p className="selected-num">#{selAthlete.number}</p>}
                  </div>
                  <button className="change-btn" onClick={() => { setSelAthlete(null); setSelProduct(null); setSelSize(""); }}>Change</button>
                </div>

                <p className="modal-label">Style</p>
                <div className="style-row">
                  {PRODUCTS.map(p => (
                    <button key={p.type}
                      className={`style-btn ${selProduct?.type === p.type ? "sel" : ""}`}
                      onClick={() => { setSelProduct(p); setSelSize(""); }}>
                      <span>{p.label}</span>
                      <strong>${p.price}</strong>
                    </button>
                  ))}
                </div>

                {selProduct && (
                  <>
                    <p className="modal-label">Size</p>
                    {PRODUCT_SIZES[selProduct.type].map(({ group, sizes }) => (
                      <div key={group} className="size-group">
                        <span className="size-group-label">{group}</span>
                        <div className="size-row">
                          {sizes.map(s => (
                            <button key={s} className={`size-btn ${selSize === s ? "sel" : ""}`}
                              onClick={() => setSelSize(s)}>
                              {s}{SIZE_UPCHARGE[s] ? <sup className="upcharge">+${SIZE_UPCHARGE[s]}</sup> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <p className="modal-label">Quantity</p>
                    <div className="qty-row">
                      <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                      <span className="qty-val">{qty}</span>
                      <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
                      <span className="qty-total">${((selProduct.price + (SIZE_UPCHARGE[selSize] ?? 0)) * qty).toFixed(2)}</span>
                    </div>

                    <button
                      className="btn-orange wide"
                      disabled={!selSize}
                      onClick={handleAddToCart}>
                      {selSize
                        ? `Add to Cart · $${((selProduct.price + (SIZE_UPCHARGE[selSize] ?? 0)) * qty).toFixed(2)}`
                        : "Select a Size"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        /* ── Reset / Base ──────────────────────────────────────── */
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }

        /* ── Header ────────────────────────────────────────────── */
        .header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,10,0.9); backdrop-filter: blur(16px);
          border-bottom: 1px solid #161616;
          padding: 0.85rem 2rem;
        }
        .header-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 1.25rem; }
        .header-logo { height: 40px; object-fit: contain; flex-shrink: 0; }
        .header-title { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .header-school { font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase; color: #e56020; font-weight: 700; }
        .header-team   { font-size: 0.82rem; font-weight: 600; color: #f0ede8; }
        .header-btn { flex-shrink: 0; }

        /* ── Hero ──────────────────────────────────────────────── */
        .hero { position: relative; overflow: hidden; padding: 5rem 2rem 4rem; }
        .hero-glow {
          position: absolute; top: -20%; right: -10%; width: 60%; height: 140%;
          background: radial-gradient(ellipse at center, rgba(229,96,32,0.12) 0%, transparent 65%);
          pointer-events: none;
        }
        .hero-inner {
          position: relative; max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
        }
        .hero-left { display: flex; flex-direction: column; gap: 1.5rem; }
        .hero-eyebrow { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #e56020; font-weight: 700; margin: 0; }
        .hero-headline {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(3rem, 7vw, 5.5rem);
          line-height: 0.95; letter-spacing: 0.02em;
          color: #f0ede8; margin: 0;
        }
        .hero-body { font-size: 1rem; color: #777; line-height: 1.75; max-width: 460px; margin: 0; }
        .hero-cta-row { display: flex; }
        .hero-pricing { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .price-pill {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.9rem; background: #111; border: 1px solid #222;
          border-radius: 999px; font-size: 0.78rem; color: #888;
        }
        .price-pill strong { color: #e8c97e; }
        .hero-right { display: flex; align-items: center; justify-content: center; }
        .hero-logo { width: 100%; max-width: 340px; height: auto; display: block; filter: drop-shadow(0 16px 48px rgba(229,96,32,0.28)); }

        /* ── Marquee ───────────────────────────────────────────── */
        .marquee-strip { background: #e56020; overflow: hidden; padding: 0.75rem 0; }
        .marquee-track {
          display: flex; width: max-content;
          animation: marquee 28s linear infinite;
        }
        .marquee-item { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; color: #fff; white-space: nowrap; padding: 0 1rem; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* ── Roster ────────────────────────────────────────────── */
        .roster { padding: 5rem 2rem; border-top: 1px solid #111; }
        .roster-inner { max-width: 1280px; margin: 0 auto; }
        .roster-head { text-align: center; margin-bottom: 3rem; }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          letter-spacing: 0.06em; color: #f0ede8; margin: 0 0 0.4rem;
        }
        .section-title.center { text-align: center; }
        .section-sub { font-size: 0.85rem; color: #555; margin: 0; }

        .athlete-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        .athlete-card { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 14px; overflow: hidden; transition: border-color 0.2s, transform 0.2s; }
        .athlete-card:hover { border-color: #e56020; transform: translateY(-4px); }

        .athlete-img-wrap { position: relative; cursor: pointer; overflow: hidden; }
        .athlete-img { width: 100%; display: block; aspect-ratio: 1; object-fit: contain; background: #fff; transition: transform 0.4s; }
        .athlete-img-wrap:hover .athlete-img { transform: scale(1.04); }
        .athlete-overlay {
          position: absolute; inset: 0;
          background: rgba(229,96,32,0.75);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.25s;
        }
        .athlete-img-wrap:hover .athlete-overlay { opacity: 1; }
        .overlay-btn {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem; letter-spacing: 0.08em; color: #fff;
        }

        .athlete-footer { padding: 1rem 1rem 1.25rem; }
        .athlete-info { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.75rem; }
        .athlete-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 0.04em; }
        .athlete-num  { font-size: 0.8rem; color: #e8c97e; font-weight: 700; }

        .athlete-products { display: flex; flex-direction: column; gap: 0.4rem; }
        .product-pill {
          width: 100%; padding: 0.5rem 0.75rem;
          background: transparent; border: 1px solid #222;
          color: #bbb; border-radius: 8px; cursor: pointer;
          font-family: inherit; font-size: 0.75rem;
          display: flex; justify-content: space-between; align-items: center;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .product-pill strong { color: #e8c97e; }
        .product-pill:hover { border-color: #e56020; color: #fff; background: rgba(229,96,32,0.08); }

        /* ── Team design ──────────────────────────────────────── */
        .team-section { padding: 0 2rem 5rem; }
        .team-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 400px 1fr; gap: 3rem; align-items: center;
          background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 16px;
          padding: 2rem; overflow: hidden;
        }
        .team-img-wrap { position: relative; cursor: pointer; border-radius: 10px; overflow: hidden; }
        .team-img { width: 100%; display: block; aspect-ratio: 1; object-fit: contain; background: #fff; border-radius: 8px; transition: transform 0.4s; }
        .team-img-wrap:hover .team-img { transform: scale(1.03); }
        .team-img-wrap:hover .athlete-overlay { opacity: 1; }
        .team-badge { display: inline-block; padding: 0.3rem 0.9rem; background: rgba(229,96,32,0.15); border: 1px solid #e56020; border-radius: 999px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #e56020; margin-bottom: 1rem; }
        .team-name { font-family: 'Bebas Neue', sans-serif; font-size: clamp(1.6rem, 3vw, 2.4rem); letter-spacing: 0.04em; color: #f0ede8; margin: 0 0 0.75rem; }
        .team-desc { font-size: 0.85rem; color: #666; line-height: 1.7; margin: 0 0 1.5rem; }

        /* ── Why ───────────────────────────────────────────────── */
        .why { padding: 5rem 2rem; background: #080808; border-top: 1px solid #111; }
        .why-inner { max-width: 1000px; margin: 0 auto; }
        .why-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2rem; margin-top: 2.5rem; }
        .why-card { text-align: center; padding: 2rem 1.5rem; background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 12px; }
        .why-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .why-card h3 { font-size: 0.95rem; font-weight: 700; color: #f0ede8; margin: 0 0 0.5rem; }
        .why-card p  { font-size: 0.8rem; color: #555; line-height: 1.65; margin: 0; }

        /* ── Footer ────────────────────────────────────────────── */
        .footer { border-top: 1px solid #111; padding: 3rem 2rem; }
        .footer-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(3,1fr); gap: 2rem; }
        .footer-logo { height: 34px; object-fit: contain; display: block; margin-bottom: 0.4rem; }
        .footer-tagline { font-size: 0.7rem; color: #333; margin: 0; }
        .footer-label { font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: #333; margin: 0 0 0.4rem; }
        .footer-name  { font-size: 0.88rem; font-weight: 600; margin: 0 0 0.2rem; }
        .footer-email { font-size: 0.8rem; color: #e56020; text-decoration: none; }
        .footer-email:hover { text-decoration: underline; }
        .footer-note  { font-size: 0.78rem; color: #444; line-height: 1.6; margin: 0; }

        /* ── Buttons ───────────────────────────────────────────── */
        .btn-orange {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.85rem 2.25rem; background: #e56020; color: #fff;
          font-family: inherit; font-weight: 700; font-size: 0.9rem;
          border: none; border-radius: 8px; cursor: pointer;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 24px rgba(229,96,32,0.3);
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .btn-orange:hover  { background: #c04a0a; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(229,96,32,0.45); }
        .btn-orange.lg     { padding: 1rem 2.5rem; font-size: 1rem; }
        .btn-orange.sm     { padding: 0.55rem 1.3rem; font-size: 0.78rem; }
        .btn-orange.wide   { width: 100%; }
        .btn-orange:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }

        /* ── Lightbox ──────────────────────────────────────────── */
        .lb-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.92);
          display: flex; align-items: center; justify-content: center;
          z-index: 400; padding: 1rem;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .lb-box {
          position: relative; display: flex; flex-direction: column;
          max-width: 560px; width: 100%;
          animation: scaleIn 0.22s ease;
        }
        @keyframes scaleIn { from { transform: scale(0.92); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .lb-close {
          position: absolute; top: -2.5rem; right: 0;
          background: none; border: none; color: #888;
          font-size: 1.3rem; cursor: pointer; line-height: 1;
        }
        .lb-close:hover { color: #fff; }
        .lb-img {
          width: 100%; border-radius: 12px;
          display: block; object-fit: contain; background: #fff;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        }
        .lb-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 0.25rem 0;
        }
        .lb-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem; letter-spacing: 0.04em;
          display: flex; align-items: baseline; gap: 0.5rem;
        }
        .lb-num { font-size: 0.9rem; color: #e8c97e; font-weight: 700; font-family: 'DM Sans', sans-serif; }

        /* ── Modal ─────────────────────────────────────────────── */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85);
          display: flex; align-items: flex-end; justify-content: center; z-index: 500;
        }
        @media (min-width: 600px) { .modal-backdrop { align-items: center; } }
        .modal {
          background: #111; border: 1px solid #222; border-radius: 16px 16px 0 0;
          width: 100%; max-height: 92vh; overflow-y: auto; position: relative;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.7);
        }
        @media (min-width: 600px) { .modal { border-radius: 16px; max-width: 460px; } }
        .modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #555; font-size: 1rem; cursor: pointer; }
        .modal-close:hover { color: #fff; }

        .modal-body { padding: 1.75rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .modal-label { font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase; color: #444; margin: 0; }

        .picker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .picker-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          padding: 0.75rem 0.5rem; background: #161616; border: 1px solid #252525;
          border-radius: 10px; cursor: pointer; color: #f0ede8;
          font-family: inherit; font-size: 0.75rem; font-weight: 600;
          transition: border-color 0.15s;
        }
        .picker-btn:hover, .picker-btn.sel { border-color: #e56020; }
        .picker-img { width: 80px; height: 80px; object-fit: contain; background: #fff; border-radius: 6px; }
        .picker-name { text-align: center; line-height: 1.3; }

        .selected-athlete { display: flex; align-items: center; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #1e1e1e; }
        .selected-thumb { width: 64px; height: 64px; object-fit: contain; background: #fff; border-radius: 8px; flex-shrink: 0; border: 1px solid #252525; }
        .selected-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 0.04em; margin: 0; }
        .selected-num  { font-size: 0.75rem; color: #e8c97e; margin: 0; }
        .change-btn { margin-left: auto; background: none; border: 1px solid #252525; color: #666; border-radius: 6px; padding: 0.3rem 0.7rem; cursor: pointer; font-size: 0.72rem; font-family: inherit; }
        .change-btn:hover { color: #fff; border-color: #444; }

        .style-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.5rem; }
        .style-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
          padding: 0.9rem 0.4rem; background: #161616; border: 1px solid #252525;
          border-radius: 10px; cursor: pointer; color: #f0ede8;
          font-family: inherit; font-size: 0.75rem;
          transition: border-color 0.15s, background 0.15s;
        }
        .style-btn:hover, .style-btn.sel { border-color: #e56020; background: rgba(229,96,32,0.08); }
        .style-btn strong { font-size: 1rem; color: #e8c97e; }

        .size-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .size-group-label { font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase; color: #444; }
        .size-row  { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .size-btn  {
          padding: 0.35rem 0.7rem; background: #161616; border: 1px solid #252525;
          color: #ccc; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.78rem;
          transition: border-color 0.15s, color 0.15s;
        }
        .size-btn:hover, .size-btn.sel { border-color: #e8c97e; color: #e8c97e; background: rgba(232,201,126,0.08); }
        .upcharge { font-size: 0.55rem; color: #e56020; margin-left: 1px; vertical-align: super; }

        .qty-row  { display: flex; align-items: center; gap: 0.75rem; }
        .qty-btn  { width: 32px; height: 32px; background: #161616; border: 1px solid #252525; color: #ccc; border-radius: 6px; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }
        .qty-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .qty-val  { font-size: 1rem; font-weight: 700; min-width: 20px; text-align: center; }
        .qty-total { font-size: 1.1rem; font-weight: 700; color: #e8c97e; margin-left: auto; }

        .recap { background: #161616; border: 1px solid #252525; border-radius: 8px; padding: 0.65rem 0.9rem; font-size: 0.82rem; color: #777; }
        .recap-price { color: #e8c97e; font-weight: 700; }

        .field {
          background: #161616; border: 1px solid #252525; border-radius: 8px;
          color: #f0ede8; font-size: 0.85rem; padding: 0.65rem 0.9rem;
          font-family: inherit; outline: none; width: 100%;
          transition: border-color 0.15s;
        }
        .field:focus { border-color: #e56020; }
        .textarea { resize: none; }
        .field-err { font-size: 0.75rem; color: #d47f7f; margin: 0; }
        .form-nav { display: flex; gap: 0.75rem; }
        .btn-back { padding: 0.75rem 1.1rem; background: none; border: 1px solid #252525; color: #555; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.82rem; }
        .btn-back:hover { color: #f0ede8; border-color: #444; }

        .success { padding: 2.5rem 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem; }
        .success-icon { font-size: 2.5rem; color: #7ec87e; }
        .success h3 { font-size: 1.3rem; margin: 0; }
        .success p  { font-size: 0.85rem; color: #666; line-height: 1.6; max-width: 300px; margin: 0; }

        /* ── Responsive ────────────────────────────────────────── */
        @media (max-width: 1100px) {
          .athlete-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 860px) {
          .hero-inner  { grid-template-columns: 1fr; gap: 2.5rem; }
          .hero-right  { order: -1; }
          .hero-logo   { max-width: 260px; margin: 0 auto; }
          .team-inner  { grid-template-columns: 1fr; }
          .why-grid    { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .header { padding: 0.75rem 1rem; }
          .header-btn { display: none; }
          .hero { padding: 3rem 1rem 2.5rem; }
          .roster { padding: 3rem 1rem; }
          .athlete-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
          .why { padding: 3rem 1rem; }
          .footer { padding: 2rem 1rem; }
        }
      `}</style>
    </div>
  );
}
