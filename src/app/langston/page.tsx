"use client";

import { useState } from "react";

// ─── Athlete roster (update with real athletes + photos from Crystal) ──────────
const ATHLETES = [
  { id: 1, name: "Athlete 1", sport: "Football",    number: "1",  photo: null },
  { id: 2, name: "Athlete 2", sport: "Basketball",  number: "2",  photo: null },
  { id: 3, name: "Athlete 3", sport: "Track",       number: "3",  photo: null },
  { id: 4, name: "Athlete 4", sport: "Basketball",  number: "4",  photo: null },
  { id: 5, name: "Athlete 5", sport: "Football",    number: "5",  photo: null },
  { id: 6, name: "Athlete 6", sport: "Track",       number: "6",  photo: null },
];

const PRODUCTS = [
  { type: "tshirt",     label: "T-Shirt",      price: 20, icon: "👕" },
  { type: "longsleeve", label: "Long Sleeve",  price: 25, icon: "🧥" },
  { type: "sweatshirt", label: "Sweatshirt",   price: 30, icon: "🩱" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const SPORT_ICONS: Record<string, string> = {
  Football:   "🏈",
  Basketball: "🏀",
  Track:      "🏃",
  Baseball:   "⚾",
  Soccer:     "⚽",
  Volleyball: "🏐",
  Tennis:     "🎾",
  Swimming:   "🏊",
  Wrestling:  "🤼",
  Golf:       "⛳",
};

type OrderStep = "athlete" | "product" | "details" | "success";

interface OrderState {
  athlete: (typeof ATHLETES)[0] | null;
  product: (typeof PRODUCTS)[0] | null;
  size: string;
  qty: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export default function LangstonPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<OrderStep>("athlete");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState<OrderState>({
    athlete: null, product: null, size: "L", qty: 1,
    name: "", email: "", phone: "", notes: "",
  });

  function openModal(athlete?: (typeof ATHLETES)[0]) {
    setOrder(o => ({ ...o, athlete: athlete || null, product: null, size: "L", qty: 1, name: "", email: "", phone: "", notes: "" }));
    setStep(athlete ? "product" : "athlete");
    setErr("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setTimeout(() => { setStep("athlete"); setErr(""); }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order.name.trim() || !order.email.trim()) { setErr("Name and email are required."); return; }
    if (!order.athlete || !order.product || !order.size) { setErr("Please complete all selections."); return; }
    setErr(""); setSubmitting(true);

    const message = [
      `LANGSTON UNIVERSITY ATHLETE MERCH ORDER`,
      ``,
      `Athlete: ${order.athlete.name} — #${order.athlete.number} (${order.athlete.sport})`,
      `Item: ${order.product.label} — Size ${order.size} × ${order.qty}`,
      `Total: $${(order.product.price * order.qty).toFixed(2)}`,
      ``,
      `Coordinator: Crystal Robinson <crystal.robinson@langston.edu>`,
      order.notes ? `Notes: ${order.notes}` : "",
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:  order.name.trim(),
          customer_email: order.email.trim(),
          customer_phone: order.phone.trim() || null,
          brand_name:     "Langston University",
          style_name:     `${order.athlete.name} — ${order.product.label}`,
          color_name:     order.athlete.sport,
          size_name:      order.size,
          quantity:       order.qty,
          barter_offer:   `$${(order.product.price * order.qty).toFixed(2)}`,
          message,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setStep("success");
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="T-Shirt Depot & More" className="site-logo" />
          <span className="header-divider" />
          <span className="header-collab">Official Athlete Collection</span>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg-grid" aria-hidden />
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="eyebrow-line" />
            <span>Langston University — 2025 Season</span>
            <span className="eyebrow-line" />
          </div>
          <h1 className="hero-title">Support the Lions</h1>
          <p className="hero-sub">
            Rep your favorite Langston University athlete. Every shirt sold puts
            money directly in their hands.
          </p>
          <div className="hero-prices">
            {PRODUCTS.map(p => (
              <div key={p.type} className="price-pill">
                <span className="price-icon">{p.icon}</span>
                <span className="price-label">{p.label}</span>
                <span className="price-amt">${p.price}</span>
              </div>
            ))}
          </div>
          <button className="cta-btn" onClick={() => openModal()}>Order Now</button>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section className="how-section">
        <div className="how-inner">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            {[
              { n: "01", label: "Pick an Athlete", desc: "Choose the Lion you want to support" },
              { n: "02", label: "Select Your Style", desc: "T-Shirt, Long Sleeve, or Sweatshirt" },
              { n: "03", label: "Place Your Order", desc: "We confirm & ship directly to you" },
            ].map(s => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <div className="step-label">{s.label}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Athlete Roster ──────────────────────────────────────────── */}
      <section className="roster-section">
        <div className="roster-inner">
          <div className="section-header">
            <h2 className="section-title">The Roster</h2>
            <p className="section-sub">Select an athlete to order their exclusive merch</p>
          </div>
          <div className="athlete-grid">
            {ATHLETES.map(a => (
              <div key={a.id} className="athlete-card" onClick={() => openModal(a)}>
                <div className="athlete-photo">
                  {a.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo} alt={a.name} />
                  ) : (
                    <div className="athlete-placeholder">
                      <span className="sport-icon">{SPORT_ICONS[a.sport] ?? "🏅"}</span>
                      <span className="athlete-num">#{a.number}</span>
                    </div>
                  )}
                  <div className="athlete-sport-badge">{a.sport}</div>
                </div>
                <div className="athlete-info">
                  <div className="athlete-name">{a.name}</div>
                  <button className="order-btn" onClick={e => { e.stopPropagation(); openModal(a); }}>
                    Order Shirt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section className="pricing-section">
        <div className="pricing-inner">
          <h2 className="section-title">Pricing</h2>
          <div className="pricing-cards">
            {PRODUCTS.map(p => (
              <div key={p.type} className="pricing-card">
                <div className="pricing-icon">{p.icon}</div>
                <div className="pricing-name">{p.label}</div>
                <div className="pricing-price">${p.price}</div>
                <div className="pricing-desc">Available in XS–3XL</div>
                <button className="pricing-btn" onClick={() => {
                  setOrder(o => ({ ...o, product: p }));
                  openModal();
                }}>Order Now</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="page-footer">
        <div className="footer-inner">
          <div className="footer-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="T-Shirt Depot" className="footer-logo" />
            <p className="footer-tagline">Powered by T-Shirt Depot & More</p>
          </div>
          <div className="footer-col">
            <div className="footer-label">Coordinator</div>
            <div className="footer-name">Crystal Robinson</div>
            <div className="footer-email">crystal.robinson@langston.edu</div>
          </div>
          <div className="footer-col">
            <div className="footer-label">Order Questions?</div>
            <p className="footer-note">
              All orders are processed through T-Shirt Depot &amp; More.
              You'll receive a confirmation once your order is reviewed.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Order Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>

            {step === "success" ? (
              <div className="success-state">
                <div className="success-check">✓</div>
                <h3>Order Submitted!</h3>
                <p>
                  Thank you! Crystal Robinson will follow up with you shortly to
                  confirm your order and arrange delivery.
                </p>
                <button className="cta-btn sm" onClick={closeModal}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="order-form">
                <div className="modal-header">
                  <div className="modal-step-track">
                    {(["athlete","product","details"] as OrderStep[]).map((s, i) => (
                      <div key={s} className={`modal-step-dot ${step === s ? "active" : (["athlete","product","details"].indexOf(step) > i ? "done" : "")}`} />
                    ))}
                  </div>
                  <h2 className="modal-title">
                    {step === "athlete"  && "Choose an Athlete"}
                    {step === "product"  && "Select Your Style"}
                    {step === "details"  && "Your Info"}
                  </h2>
                </div>

                {/* Step 1: Athlete */}
                {step === "athlete" && (
                  <div className="step-content">
                    <div className="modal-athlete-grid">
                      {ATHLETES.map(a => (
                        <button
                          type="button"
                          key={a.id}
                          className={`modal-athlete-btn ${order.athlete?.id === a.id ? "selected" : ""}`}
                          onClick={() => { setOrder(o => ({ ...o, athlete: a })); setStep("product"); }}
                        >
                          <span className="modal-sport-icon">{SPORT_ICONS[a.sport] ?? "🏅"}</span>
                          <span className="modal-athlete-name">{a.name}</span>
                          <span className="modal-athlete-sport">{a.sport}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Product */}
                {step === "product" && (
                  <div className="step-content">
                    {order.athlete && (
                      <div className="selected-athlete-banner">
                        <span>{SPORT_ICONS[order.athlete.sport] ?? "🏅"}</span>
                        <span>{order.athlete.name} — #{order.athlete.number}</span>
                      </div>
                    )}
                    <div className="product-select-grid">
                      {PRODUCTS.map(p => (
                        <button
                          type="button"
                          key={p.type}
                          className={`product-select-btn ${order.product?.type === p.type ? "selected" : ""}`}
                          onClick={() => setOrder(o => ({ ...o, product: p }))}
                        >
                          <span className="ps-icon">{p.icon}</span>
                          <span className="ps-label">{p.label}</span>
                          <span className="ps-price">${p.price}</span>
                        </button>
                      ))}
                    </div>

                    {order.product && (
                      <>
                        <div className="size-row">
                          <label className="field-label">Size</label>
                          <div className="size-grid">
                            {SIZES.map(s => (
                              <button type="button" key={s}
                                className={`size-btn ${order.size === s ? "selected" : ""}`}
                                onClick={() => setOrder(o => ({ ...o, size: s }))}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="qty-row-modal">
                          <label className="field-label">Quantity</label>
                          <div className="qty-controls">
                            <button type="button" className="qty-btn" onClick={() => setOrder(o => ({ ...o, qty: Math.max(1, o.qty - 1) }))}>−</button>
                            <span className="qty-val">{order.qty}</span>
                            <button type="button" className="qty-btn" onClick={() => setOrder(o => ({ ...o, qty: o.qty + 1 }))}>+</button>
                            <span className="qty-total">${(order.product.price * order.qty).toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="step-nav">
                      <button type="button" className="back-btn" onClick={() => setStep("athlete")}>← Back</button>
                      <button type="button" className="next-btn"
                        disabled={!order.product || !order.size}
                        onClick={() => setStep("details")}>
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Contact Details */}
                {step === "details" && (
                  <div className="step-content">
                    <div className="order-summary-banner">
                      <span>{order.athlete?.name} — {order.product?.label}</span>
                      <span className="summary-price">${((order.product?.price ?? 0) * order.qty).toFixed(2)}</span>
                    </div>
                    <input className="field-input" placeholder="Your name *" value={order.name} onChange={e => setOrder(o => ({ ...o, name: e.target.value }))} />
                    <input className="field-input" type="email" placeholder="Email *" value={order.email} onChange={e => setOrder(o => ({ ...o, email: e.target.value }))} />
                    <input className="field-input" placeholder="Phone (optional)" value={order.phone} onChange={e => setOrder(o => ({ ...o, phone: e.target.value }))} />
                    <textarea className="field-input textarea" rows={2} placeholder="Any special notes…" value={order.notes} onChange={e => setOrder(o => ({ ...o, notes: e.target.value }))} />
                    {err && <p className="err">{err}</p>}
                    <div className="step-nav">
                      <button type="button" className="back-btn" onClick={() => setStep("product")}>← Back</button>
                      <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? "Placing…" : `Place Order · $${((order.product?.price ?? 0) * order.qty).toFixed(2)}`}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        /* ── Base ──────────────────────────────────────────────────── */
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }

        /* ── Site Header ───────────────────────────────────────────── */
        .site-header { border-bottom: 1px solid #1a1a1a; padding: 1rem 2rem; }
        .header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
        .site-logo { height: 44px; width: auto; object-fit: contain; }
        .header-divider { width: 1px; height: 24px; background: #2a2a2a; }
        .header-collab { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: #e56020; font-weight: 600; }

        /* ── Hero ──────────────────────────────────────────────────── */
        .hero {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #0a0a0a 0%, #0d1a3a 50%, #0a0a0a 100%);
          padding: 5rem 2rem 4rem;
        }
        .hero-bg-grid {
          position: absolute; inset: 0;
          background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff06 39px, #ffffff06 40px),
                            repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff06 39px, #ffffff06 40px);
          pointer-events: none;
        }
        .hero-inner { position: relative; max-width: 760px; margin: 0 auto; text-align: center; }
        .hero-eyebrow { display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #e56020; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 1.25rem; }
        .eyebrow-line { flex: 1; max-width: 60px; height: 1px; background: #e56020; opacity: 0.5; }
        .hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(3rem, 10vw, 6rem);
          letter-spacing: 0.05em;
          line-height: 1;
          margin: 0 0 1rem;
          background: linear-gradient(135deg, #f0ede8 40%, #c8a052);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub { font-size: 1rem; color: #8a9cb8; line-height: 1.7; max-width: 480px; margin: 0 auto 2.5rem; }

        .hero-prices { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
        .price-pill {
          display: flex; align-items: center; gap: 0.5rem;
          background: #ffffff09; border: 1px solid #ffffff14;
          border-radius: 999px; padding: 0.4rem 1.1rem;
          backdrop-filter: blur(4px);
        }
        .price-icon { font-size: 1rem; }
        .price-label { font-size: 0.78rem; color: #8a9cb8; }
        .price-amt { font-size: 0.9rem; font-weight: 700; color: #e8c97e; }

        .cta-btn {
          display: inline-block; padding: 0.9rem 2.5rem;
          background: linear-gradient(135deg, #e56020, #c04a0a);
          color: #fff; font-weight: 700; font-size: 0.95rem;
          border: none; border-radius: 8px; cursor: pointer;
          font-family: inherit; letter-spacing: 0.04em;
          box-shadow: 0 4px 24px #e5602040;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px #e5602060; }
        .cta-btn.sm { padding: 0.65rem 1.75rem; font-size: 0.85rem; }

        /* ── How It Works ───────────────────────────────────────────── */
        .how-section { padding: 4rem 2rem; border-bottom: 1px solid #141414; }
        .how-inner { max-width: 900px; margin: 0 auto; }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          letter-spacing: 0.05em; color: #f0ede8;
          text-align: center; margin: 0 0 2.5rem;
        }
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .step { text-align: center; }
        .step-num { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; color: #e56020; opacity: 0.6; line-height: 1; margin-bottom: 0.5rem; }
        .step-label { font-size: 0.95rem; font-weight: 700; color: #f0ede8; margin-bottom: 0.4rem; }
        .step-desc { font-size: 0.82rem; color: #666; line-height: 1.6; }

        /* ── Roster ─────────────────────────────────────────────────── */
        .roster-section { padding: 4rem 2rem; }
        .roster-inner { max-width: 1100px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 2.5rem; }
        .section-sub { font-size: 0.85rem; color: #555; margin-top: 0.5rem; }

        .athlete-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.25rem; }
        .athlete-card {
          background: #111; border: 1px solid #1e1e1e;
          border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .athlete-card:hover { border-color: #e56020; transform: translateY(-3px); box-shadow: 0 8px 32px #e5602020; }

        .athlete-photo {
          position: relative; aspect-ratio: 1;
          background: linear-gradient(135deg, #0d1a3a, #111);
          overflow: hidden;
        }
        .athlete-photo img { width: 100%; height: 100%; object-fit: cover; }
        .athlete-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; }
        .sport-icon { font-size: 2.5rem; opacity: 0.6; }
        .athlete-num { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; color: #e56020; opacity: 0.5; }
        .athlete-sport-badge {
          position: absolute; bottom: 0.5rem; left: 0.5rem;
          background: #e5602080; backdrop-filter: blur(6px);
          color: #fff; font-size: 0.65rem; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: 4px;
        }

        .athlete-info { padding: 0.85rem 1rem 1rem; }
        .athlete-name { font-size: 0.9rem; font-weight: 600; color: #f0ede8; margin-bottom: 0.6rem; }
        .order-btn {
          width: 100%; padding: 0.5rem; background: transparent;
          border: 1px solid #2a2a2a; color: #e8c97e; font-size: 0.75rem;
          font-weight: 600; border-radius: 6px; cursor: pointer;
          font-family: inherit; letter-spacing: 0.06em; text-transform: uppercase;
          transition: background 0.2s, border-color 0.2s;
        }
        .order-btn:hover { background: #e8c97e12; border-color: #e8c97e; }

        /* ── Pricing ────────────────────────────────────────────────── */
        .pricing-section { padding: 4rem 2rem 5rem; background: #0d0d0d; border-top: 1px solid #141414; }
        .pricing-inner { max-width: 900px; margin: 0 auto; text-align: center; }
        .pricing-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2.5rem; }
        .pricing-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 12px;
          padding: 2rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          transition: border-color 0.2s, transform 0.2s;
        }
        .pricing-card:hover { border-color: #e56020; transform: translateY(-4px); }
        .pricing-icon { font-size: 2.5rem; margin-bottom: 0.25rem; }
        .pricing-name { font-size: 1rem; font-weight: 600; }
        .pricing-price { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; color: #e8c97e; letter-spacing: 0.04em; line-height: 1; }
        .pricing-desc { font-size: 0.75rem; color: #555; margin-bottom: 0.5rem; }
        .pricing-btn {
          margin-top: 0.5rem; padding: 0.6rem 1.5rem;
          background: transparent; border: 1px solid #e56020; color: #e56020;
          border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.8rem; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          transition: background 0.2s, color 0.2s;
        }
        .pricing-btn:hover { background: #e56020; color: #fff; }

        /* ── Footer ─────────────────────────────────────────────────── */
        .page-footer { border-top: 1px solid #1a1a1a; padding: 3rem 2rem; }
        .footer-inner { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .footer-logo { height: 36px; object-fit: contain; margin-bottom: 0.5rem; }
        .footer-tagline { font-size: 0.72rem; color: #444; }
        .footer-label { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: #555; margin-bottom: 0.5rem; }
        .footer-name { font-size: 0.9rem; font-weight: 600; color: #f0ede8; }
        .footer-email { font-size: 0.8rem; color: #e56020; margin-top: 0.2rem; }
        .footer-note { font-size: 0.78rem; color: #444; line-height: 1.65; }

        /* ── Modal ───────────────────────────────────────────────────── */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          z-index: 500; padding: 1rem;
        }
        .modal {
          background: #111; border: 1px solid #222;
          border-radius: 16px; width: 100%; max-width: 500px;
          max-height: 90vh; overflow-y: auto;
          position: relative; padding: 2rem;
          box-shadow: 0 24px 80px #000;
        }
        .modal-close {
          position: absolute; top: 1rem; right: 1rem;
          background: none; border: none; color: #555; font-size: 1rem; cursor: pointer;
        }
        .modal-close:hover { color: #f0ede8; }

        .modal-header { margin-bottom: 1.5rem; }
        .modal-step-track { display: flex; gap: 0.4rem; margin-bottom: 0.75rem; }
        .modal-step-dot {
          width: 28px; height: 3px; border-radius: 999px;
          background: #2a2a2a; transition: background 0.2s;
        }
        .modal-step-dot.active { background: #e56020; }
        .modal-step-dot.done  { background: #e56020; opacity: 0.4; }
        .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.05em; color: #f0ede8; }

        .step-content { display: flex; flex-direction: column; gap: 1rem; }

        .modal-athlete-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .modal-athlete-btn {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.25rem; padding: 0.85rem 0.5rem;
          background: #161616; border: 1px solid #2a2a2a;
          border-radius: 10px; cursor: pointer; color: #f0ede8;
          font-family: inherit; transition: border-color 0.2s, background 0.2s;
        }
        .modal-athlete-btn:hover, .modal-athlete-btn.selected {
          border-color: #e56020; background: #e5602010;
        }
        .modal-sport-icon { font-size: 1.75rem; }
        .modal-athlete-name { font-size: 0.82rem; font-weight: 600; }
        .modal-athlete-sport { font-size: 0.68rem; color: #555; letter-spacing: 0.08em; text-transform: uppercase; }

        .selected-athlete-banner {
          background: #e5602012; border: 1px solid #e5602030;
          border-radius: 8px; padding: 0.6rem 0.9rem;
          font-size: 0.82rem; color: #e56020; font-weight: 600;
          display: flex; align-items: center; gap: 0.5rem;
        }

        .product-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
        .product-select-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
          padding: 1rem 0.5rem; background: #161616; border: 1px solid #2a2a2a;
          border-radius: 10px; cursor: pointer; color: #f0ede8; font-family: inherit;
          transition: border-color 0.2s, background 0.2s;
        }
        .product-select-btn:hover, .product-select-btn.selected {
          border-color: #e8c97e; background: #e8c97e10;
        }
        .ps-icon { font-size: 1.75rem; }
        .ps-label { font-size: 0.78rem; font-weight: 600; }
        .ps-price { font-size: 0.95rem; color: #e8c97e; font-weight: 700; }

        .field-label { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
        .size-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .size-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .size-btn {
          padding: 0.35rem 0.75rem; background: #161616; border: 1px solid #2a2a2a;
          color: #ccc; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.8rem;
          transition: border-color 0.15s;
        }
        .size-btn:hover, .size-btn.selected { border-color: #e8c97e; color: #e8c97e; background: #e8c97e10; }

        .qty-row-modal { display: flex; flex-direction: column; gap: 0.5rem; }
        .qty-controls { display: flex; align-items: center; gap: 0.75rem; }
        .qty-btn {
          width: 32px; height: 32px; border: 1px solid #2a2a2a; background: #161616;
          color: #ccc; border-radius: 6px; cursor: pointer; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center; padding: 0;
        }
        .qty-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .qty-val { font-size: 1rem; font-weight: 700; min-width: 24px; text-align: center; }
        .qty-total { font-size: 1rem; font-weight: 700; color: #e8c97e; margin-left: auto; }

        .step-nav { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
        .back-btn {
          flex: 0 0 auto; padding: 0.65rem 1.25rem;
          background: none; border: 1px solid #2a2a2a; color: #888;
          border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.82rem;
        }
        .back-btn:hover { border-color: #444; color: #f0ede8; }
        .next-btn {
          flex: 1; padding: 0.75rem;
          background: linear-gradient(135deg, #e56020, #c04a0a);
          color: #fff; font-weight: 700; border: none; border-radius: 8px;
          cursor: pointer; font-family: inherit; font-size: 0.88rem;
          transition: opacity 0.2s;
        }
        .next-btn:disabled { opacity: 0.35; cursor: default; }

        .order-summary-banner {
          display: flex; justify-content: space-between; align-items: center;
          background: #e8c97e12; border: 1px solid #e8c97e30;
          border-radius: 8px; padding: 0.65rem 0.9rem;
          font-size: 0.82rem; color: #e8c97e;
        }
        .summary-price { font-weight: 700; font-size: 1rem; }

        .field-input {
          background: #161616; border: 1px solid #2a2a2a; border-radius: 8px;
          color: #f0ede8; font-size: 0.85rem; padding: 0.65rem 0.85rem;
          font-family: inherit; outline: none; width: 100%;
        }
        .field-input:focus { border-color: #e8c97e44; }
        .textarea { resize: none; }
        .err { font-size: 0.75rem; color: #c87e7e; }
        .submit-btn {
          flex: 1; padding: 0.9rem;
          background: linear-gradient(135deg, #e56020, #c04a0a);
          color: #fff; font-weight: 700; border: none; border-radius: 8px;
          cursor: pointer; font-family: inherit; font-size: 0.88rem;
          transition: opacity 0.2s;
        }
        .submit-btn:disabled { opacity: 0.5; cursor: default; }

        .success-state {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 1rem; padding: 2rem 1rem;
        }
        .success-check { font-size: 3rem; color: #7ec87e; }
        .success-state h3 { font-size: 1.3rem; color: #f0ede8; margin: 0; }
        .success-state p { font-size: 0.85rem; color: #666; line-height: 1.65; max-width: 320px; margin: 0; }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width: 768px) {
          .hero { padding: 3.5rem 1rem 3rem; }
          .steps { grid-template-columns: 1fr; gap: 1.5rem; }
          .pricing-cards { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr; }
          .athlete-grid { grid-template-columns: repeat(2, 1fr); }
          .modal { padding: 1.5rem; }
          .product-select-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
          .modal-athlete-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .athlete-grid { grid-template-columns: 1fr 1fr; }
          .hero-prices { gap: 0.6rem; }
        }
      `}</style>
    </div>
  );
}
