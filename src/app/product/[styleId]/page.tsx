"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InquiryModal from "@/components/InquiryModal";

interface Size {
  sku: string;
  sizeName: string;
  piecePrice: number;
  qtyTotal: number;
  closeout: boolean;
}

interface Color {
  colorName: string;
  colorHex: string | null;
  colorFamily: string | null;
  swatchImage: string | null;
  frontImage: string | null;
  backImage: string | null;
  modelImage: string | null;
  sizes: Size[];
}

interface Style {
  styleID: number;
  brandName: string;
  styleName: string;
  title: string;
  description: string | null;
  baseCategory: string | null;
  styleImage: string | null;
  brandImage: string | null;
  sustainable: boolean;
  newStyle: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const styleId = params.styleId as string;

  const [style, setStyle] = useState<Style | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [activeSize, setActiveSize] = useState<Size | null>(null);
  const [activeImg, setActiveImg] = useState<"front" | "back" | "model">("front");
  const [showInquiry, setShowInquiry] = useState(false);
  const [buyError, setBuyError] = useState("");

  useEffect(() => {
    fetch(`/api/products/${styleId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setStyle(data.style);
        setColors(data.colors || []);
        if (data.colors?.length > 0) {
          setActiveColor(data.colors[0]);
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [styleId]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error || !style) return <div className="loading error">{error || "Product not found"}</div>;

  const img = activeColor
    ? (activeImg === "back" ? activeColor.backImage : activeImg === "model" ? activeColor.modelImage : activeColor.frontImage) || activeColor.frontImage
    : style.styleImage;

  const price = activeSize?.piecePrice ?? activeColor?.sizes[0]?.piecePrice ?? null;
  const inStock = activeSize ? activeSize.qtyTotal > 0 : (activeColor?.sizes.some(s => s.qtyTotal > 0) ?? false);

  const handleBuy = () => {
    if (!price) { setBuyError("Unable to determine price. Please try again."); return; }

    const base = process.env.NEXT_PUBLIC_BARTER_NETWORK_URL || "https://barternetworkokc.com";
    const params = new URLSearchParams({
      title:       style?.title || style?.styleName || "Apparel Order",
      brand:       style?.brandName || "",
      color:       activeColor?.colorName || "",
      size:        activeSize?.sizeName || "",
      sku:         activeSize?.sku || "",
      price_cents: String(Math.round(price * 100)),
      style_id:    String(style?.styleID || ""),
      image:       activeColor?.frontImage || style?.styleImage || "",
    });

    window.location.href = `${base}/checkout/apparel?${params}`;
  };

  const inquiryProduct = {
    style_id: style.styleID,
    brand_name: style.brandName,
    style_name: style.styleName,
    title: style.title,
    min_price: price,
    color_count: colors.length,
    sample_image: activeColor?.frontImage || style.styleImage,
    style_image: style.styleImage,
  };

  return (
    <div className="page">
      {/* Back nav */}
      <div className="breadcrumb">
        <a href="/" className="back-link">← Back to catalog</a>
        {style.baseCategory && <span className="bc-sep">/ {style.baseCategory}</span>}
      </div>

      <div className="layout">
        {/* ── Left: images ── */}
        <div className="images">
          <div className="main-img-wrap">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={style.title} className="main-img" />
            ) : (
              <div className="img-placeholder">{style.brandName[0]}</div>
            )}
            {style.newStyle && <span className="badge-new">New</span>}
            {style.sustainable && <span className="badge-eco">♻ Eco</span>}
          </div>

          {/* View toggles */}
          {activeColor && (
            <div className="view-tabs">
              {activeColor.frontImage && (
                <button className={`view-tab ${activeImg === "front" ? "active" : ""}`} onClick={() => setActiveImg("front")}>Front</button>
              )}
              {activeColor.backImage && (
                <button className={`view-tab ${activeImg === "back" ? "active" : ""}`} onClick={() => setActiveImg("back")}>Back</button>
              )}
              {activeColor.modelImage && (
                <button className={`view-tab ${activeImg === "model" ? "active" : ""}`} onClick={() => setActiveImg("model")}>On Model</button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: details ── */}
        <div className="details">
          {/* Brand */}
          <p className="brand-name">{style.brandName}</p>
          <h1 className="title">{style.title || style.styleName}</h1>
          <p className="style-num">Style # {style.styleName}</p>

          {/* Price */}
          <div className="price-block">
            <span className="price">{price ? `$${price.toFixed(2)}` : "—"}</span>
            <span className="price-note">/ piece</span>
          </div>

          {/* Stock status */}
          <div className={`stock-status ${inStock ? "in" : "out"}`}>
            {inStock ? "● In Stock" : "○ Out of Stock"}
          </div>

          {/* Color picker */}
          {colors.length > 0 && (
            <div className="section">
              <p className="section-label">
                Color
                {activeColor && <span className="selected-val"> — {activeColor.colorName}</span>}
              </p>
              <div className="color-grid">
                {colors.map(c => (
                  <button
                    key={c.colorName}
                    title={c.colorName}
                    onClick={() => { setActiveColor(c); setActiveSize(null); setActiveImg("front"); }}
                    className={`swatch ${activeColor?.colorName === c.colorName ? "active" : ""}`}
                  >
                    {c.swatchImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.swatchImage} alt={c.colorName} className="swatch-img" />
                    ) : (
                      <span
                        className="swatch-dot"
                        style={{ background: c.colorHex || "#555" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size picker */}
          {activeColor && activeColor.sizes.length > 0 && (
            <div className="section">
              <p className="section-label">Size</p>
              <div className="size-grid">
                {activeColor.sizes.map(s => {
                  const isActive = activeSize?.sku === s.sku;
                  const oos = s.qtyTotal === 0;
                  return (
                    <button
                      key={s.sku}
                      disabled={oos}
                      onClick={() => setActiveSize(isActive ? null : s)}
                      className={`size-btn ${isActive ? "active" : ""} ${oos ? "oos" : ""}`}
                    >
                      {s.sizeName}
                      {oos && <span className="oos-line" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity info */}
          {activeSize && (
            <p className="qty-note">
              {activeSize.qtyTotal > 0
                ? `${activeSize.qtyTotal.toLocaleString()} units available`
                : "Out of stock"}
              {activeSize.closeout && " · Closeout"}
            </p>
          )}

          {/* CTA */}
          <button className="cta-btn" onClick={handleBuy}>
            Buy with Barter Bucks →
          </button>

          {buyError && <p className="buy-error">{buyError}</p>}

          <p className="cta-note">
            Pay with Barter Bucks — no cash required.
          </p>

          {/* Description */}
          {style.description && (
            <div className="section desc-section">
              <p className="section-label">Description</p>
              <div
                className="description"
                dangerouslySetInnerHTML={{ __html: style.description }}
              />
            </div>
          )}

          {/* Color / size summary */}
          <div className="specs">
            <div className="spec"><span>Colors</span><span>{colors.length}</span></div>
            <div className="spec"><span>Sizes</span><span>{activeColor?.sizes.length ?? "—"}</span></div>
            {style.baseCategory && <div className="spec"><span>Category</span><span>{style.baseCategory}</span></div>}
          </div>
        </div>
      </div>

      {showInquiry && (
        <InquiryModal
          product={inquiryProduct}
          onClose={() => setShowInquiry(false)}
        />
      )}

      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; padding-bottom: 4rem; }

        .loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: #888; font-size: 1rem; }
        .error { color: #c87e7e; }

        .breadcrumb { max-width: 1100px; margin: 0 auto; padding: 1.25rem 2rem 0; display: flex; align-items: center; gap: 0.5rem; }
        .back-link { font-size: 0.8rem; color: #666; text-decoration: none; transition: color 0.2s; }
        .back-link:hover { color: #e8c97e; }
        .bc-sep { font-size: 0.8rem; color: #444; }

        .layout { max-width: 1100px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }

        /* Images */
        .images { position: sticky; top: 1.5rem; }
        .main-img-wrap { aspect-ratio: 1; background: #111; border: 1px solid #1e1e1e; border-radius: 12px; overflow: hidden; position: relative; }
        .main-img { width: 100%; height: 100%; object-fit: contain; padding: 1rem; box-sizing: border-box; }
        .img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 4rem; color: #333; }
        .badge-new, .badge-eco { position: absolute; top: 0.75rem; left: 0.75rem; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .badge-new { background: #e8c97e; color: #0a0a0a; }
        .badge-eco { background: #2d4a2d; color: #7ec87e; top: 2.5rem; }

        .view-tabs { display: flex; gap: 0.4rem; margin-top: 0.75rem; }
        .view-tab { flex: 1; padding: 0.4rem; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 0.75rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .view-tab:hover { border-color: #e8c97e; color: #e8c97e; }
        .view-tab.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }

        /* Details */
        .brand-name { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: #e8c97e; margin: 0 0 0.4rem; }
        .title { font-size: 1.6rem; font-weight: 600; margin: 0 0 0.25rem; line-height: 1.2; }
        .style-num { font-size: 0.75rem; color: #555; margin: 0 0 1.25rem; }

        .price-block { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; }
        .price { font-size: 1.6rem; font-weight: 700; color: #f0ede8; }
        .price.sale { color: #e8c97e; }
        .price.original { font-size: 1rem; color: #555; text-decoration: line-through; }
        .sale-badge { font-size: 0.7rem; font-weight: 700; background: #e8c97e22; color: #e8c97e; padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid #e8c97e44; }
        .price-note { font-size: 0.75rem; color: #555; }

        .stock-status { font-size: 0.78rem; font-weight: 600; margin-bottom: 1.5rem; }
        .stock-status.in { color: #7ec87e; }
        .stock-status.out { color: #888; }

        .section { margin-bottom: 1.5rem; }
        .section-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #888; margin: 0 0 0.6rem; }
        .selected-val { font-weight: 400; text-transform: none; color: #ccc; letter-spacing: 0; }

        /* Colors */
        .color-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .swatch { width: 34px; height: 34px; border-radius: 6px; border: 2px solid transparent; overflow: hidden; cursor: pointer; padding: 0; transition: all 0.15s; background: #1a1a1a; }
        .swatch:hover { border-color: #888; transform: scale(1.08); }
        .swatch.active { border-color: #e8c97e; box-shadow: 0 0 0 1px #e8c97e44; }
        .swatch-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swatch-dot { display: block; width: 100%; height: 100%; border-radius: 4px; }

        /* Sizes */
        .size-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .size-btn { padding: 0.45rem 0.85rem; border: 1px solid #2a2a2a; background: transparent; color: #ccc; font-size: 0.8rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.15s; position: relative; }
        .size-btn:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .size-btn.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }
        .size-btn.oos { color: #444; border-color: #1e1e1e; cursor: default; }
        .oos-line { position: absolute; top: 50%; left: 10%; width: 80%; height: 1px; background: #444; transform: rotate(-15deg); pointer-events: none; }

        .qty-note { font-size: 0.75rem; color: #666; margin: -0.5rem 0 1.25rem; }

        /* CTA */
        .cta-btn { width: 100%; padding: 1rem; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: 0.04em; transition: background 0.2s; margin-bottom: 0.6rem; }
        .cta-btn:hover { background: #f0d99a; }
        .buy-error { font-size: 0.78rem; color: #c87e7e; margin: -0.25rem 0 0.5rem; text-align: center; }
        .cta-note { font-size: 0.75rem; color: #555; text-align: center; margin: 0 0 1.5rem; }

        /* Description */
        .desc-section { border-top: 1px solid #1a1a1a; padding-top: 1.5rem; }
        .description { font-size: 0.85rem; color: #888; line-height: 1.7; }
        .description :global(ul) { padding-left: 1.25rem; margin: 0; }
        .description :global(li) { margin-bottom: 0.25rem; }

        /* Specs */
        .specs { border-top: 1px solid #1a1a1a; padding-top: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .spec { display: flex; justify-content: space-between; font-size: 0.8rem; }
        .spec span:first-child { color: #666; }
        .spec span:last-child { color: #ccc; }

        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr; gap: 1.5rem; padding: 1rem; }
          .images { position: static; }
        }
      `}</style>
    </div>
  );
}
