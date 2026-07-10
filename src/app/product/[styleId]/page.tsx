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
  const [sizeQtys, setSizeQtys] = useState<Record<string, number>>({});
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
        // Fire ViewContent so Facebook can match this visit to the catalog product
        if (typeof window !== "undefined" && (window as any).fbq && data.style) {
          const price = data.colors?.[0]?.sizes?.[0]?.piecePrice ?? null;
          (window as any).fbq("track", "ViewContent", {
            content_ids: [String(data.style.styleID)],
            content_type: "product",
            content_name: data.style.title || data.style.styleName,
            content_category: data.style.baseCategory || "",
            value: price ?? undefined,
            currency: "USD",
          });
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [styleId]);

  if (loading) return (
    <div className="page">
      <div className="breadcrumb"><div className="sk sk-line" style={{ width: 120, height: 14 }} /></div>
      <div className="layout">
        <div className="images">
          <div className="main-img-wrap sk" />
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem" }}>
            {[1,2,3].map(i => <div key={i} className="sk" style={{ flex: 1, height: 36, borderRadius: 6 }} />)}
          </div>
        </div>
        <div className="details">
          <div className="sk sk-line" style={{ width: 80, height: 12, marginBottom: "0.6rem" }} />
          <div className="sk sk-line" style={{ width: "70%", height: 28, marginBottom: "0.4rem" }} />
          <div className="sk sk-line" style={{ width: 100, height: 12, marginBottom: "1.5rem" }} />
          <div className="sk sk-line" style={{ width: 120, height: 36, marginBottom: "1.5rem" }} />
          <div className="sk sk-line" style={{ width: 80, height: 12, marginBottom: "0.75rem" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem" }}>
            {Array.from({ length: 24 }).map((_, i) => <div key={i} className="sk" style={{ width: 34, height: 34, borderRadius: 6 }} />)}
          </div>
          <div className="sk sk-line" style={{ width: 60, height: 12, marginBottom: "0.75rem" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem" }}>
            {["S","M","L","XL","2XL"].map(s => <div key={s} className="sk" style={{ width: 52, height: 36, borderRadius: 6 }} />)}
          </div>
          <div className="sk" style={{ width: "100%", height: 52, borderRadius: 8, marginBottom: "0.6rem" }} />
          <div className="sk" style={{ width: "100%", height: 48, borderRadius: 8 }} />
        </div>
      </div>
      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; padding-bottom: 4rem; }
        .breadcrumb { max-width: 1100px; margin: 0 auto; padding: 1.25rem 2rem 0; }
        .layout { max-width: 1100px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
        .images { position: sticky; top: 1.5rem; }
        .main-img-wrap { aspect-ratio: 1; border-radius: 12px; }
        .details { display: flex; flex-direction: column; }
        .sk { background: linear-gradient(90deg,#161616 25%,#1e1e1e 50%,#161616 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
        .sk-line { display: block; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media (max-width: 768px) { .layout { grid-template-columns: 1fr; gap: 1.5rem; padding: 1rem; } .images { position: static; } }
      `}</style>
    </div>
  );
  if (error || !style) return <div className="loading error">{error || "Product not found"}</div>;

  // ssactivewear.com images are hotlink-protected — route through server-side proxy.
  // cdnm.sanmar.com images are public CDN and can be used directly.
  const proxied = (url: string | null | undefined) =>
    url?.includes("ssactivewear.com")
      ? `/api/proxy-image?url=${encodeURIComponent(url)}`
      : (url ?? null);

  // Sanmar CDN swatch URLs (cdnm.sanmar.com *_SP26.gif) return a placeholder image
  // with HTTP 200 — onError never fires. Skip them; only use ssactivewear swatch images.
  const validSwatch = (url: string | null) =>
    url?.includes("ssactivewear.com") ? url : null;

  // Derive approximate color from name when colorHex is absent.
  const colorNameToHex = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("white") || n.includes("ivory")) return "#f0ede8";
    if (n.includes("cream") || n.includes("creme") || n.includes("natural")) return "#e8dfc8";
    if (n === "black") return "#111";
    if (n.includes("black")) return "#2a2a2a";
    if (n.includes("charcoal")) return "#3c3c3c";
    if (n.includes("coal")) return "#484848";
    if (n.includes("dark grey") || n.includes("dark gray")) return "#555";
    if (n.includes("tundra") || n.includes("stonewash") || n.includes("chambray")) return "#7a9ab5";
    if (n.includes("silver") || n.includes("ash") || n.includes("grey") || n.includes("gray")) return "#888";
    if (n.includes("navy")) return "#1a2848";
    if (n.includes("royal")) return "#1a3fa0";
    if (n.includes("cobalt")) return "#1a5fd0";
    if (n.includes("carolina")) return "#4a8cc8";
    if (n.includes("sky") || n.includes("powder") || n.includes("ice blue")) return "#8ab8d8";
    if (n.includes("neptune") || n.includes("peacock")) return "#2a7a8a";
    if (n.includes("teal") || n.includes("turquoise")) return "#1a8a8a";
    if (n.includes("blue")) return "#2a5a9a";
    if (n.includes("forest") || n.includes("hunter")) return "#1a4a1a";
    if (n.includes("olive") || n.includes("drab")) return "#5a5a2a";
    if (n.includes("sage") || n.includes("laurel") || n.includes("clover")) return "#6a8a6a";
    if (n.includes("lime") || n.includes("safety green") || n.includes("neon green")) return "#5aaa20";
    if (n.includes("green") || n.includes("kelly")) return "#2a7a2a";
    if (n.includes("lemon") || n.includes("yellow")) return "#d4c040";
    if (n.includes("gold") || n.includes("zinnia") || n.includes("sunflower")) return "#c8a000";
    if (n.includes("orange") || n.includes("burnt")) return "#d45820";
    if (n.includes("coral") || n.includes("salmon")) return "#e08070";
    if (n.includes("peach") || n.includes("melon")) return "#dda888";
    if (n.includes("hot pink") || n.includes("neon pink") || n.includes("safety pink")) return "#f020a0";
    if (n.includes("pink") || n.includes("rose") || n.includes("flamingo") || n.includes("blossom")) return "#d88098";
    if (n.includes("red") || n.includes("cherry") || n.includes("cardinal") || n.includes("sangria")) return "#b02020";
    if (n.includes("maroon") || n.includes("garnet") || n.includes("burgundy") || n.includes("wine")) return "#6a1a1a";
    if (n.includes("lavender") || n.includes("lilac")) return "#9a7ab5";
    if (n.includes("purple") || n.includes("violet") || n.includes("iris")) return "#6a3a8a";
    if (n.includes("plum") || n.includes("eggplant")) return "#4a1a5a";
    if (n.includes("espresso") || n.includes("chocolate") || n.includes("brown")) return "#4a2a1a";
    if (n.includes("tan") || n.includes("khaki") || n.includes("sand") || n.includes("adobe")) return "#b89a6a";
    return "#666";
  };

  const rawImg = activeColor
    ? (activeImg === "back" ? activeColor.backImage : activeImg === "model" ? activeColor.modelImage : activeColor.frontImage) || activeColor.frontImage
    : style.styleImage;
  const img = proxied(rawImg);

  const price = activeSize?.piecePrice ?? activeColor?.sizes[0]?.piecePrice ?? null;
  const inStock = activeSize ? activeSize.qtyTotal > 0 : (activeColor?.sizes.some(s => s.qtyTotal > 0) ?? false);

  const handleBuy = () => {
    const sizes = activeColor?.sizes ?? [];
    const totalQty = sizes.reduce((sum, s) => sum + (sizeQtys[s.sku] ?? 0), 0);
    if (totalQty === 0) { setBuyError("Please enter a quantity for at least one size."); return; }

    const orderTotal = sizes.reduce((sum, s) => {
      const q = sizeQtys[s.sku] ?? 0;
      return q > 0 ? sum + s.piecePrice * q : sum;
    }, 0);
    const sizeSummary = sizes
      .filter(s => (sizeQtys[s.sku] ?? 0) > 0)
      .map(s => `${s.sizeName}×${sizeQtys[s.sku]}`)
      .join(", ");
    const firstSku = sizes.find(s => (sizeQtys[s.sku] ?? 0) > 0)?.sku || "";

    const base = process.env.NEXT_PUBLIC_BARTER_NETWORK_URL || "https://barternetworkokc.com";
    const params = new URLSearchParams({
      title:       style?.title || style?.styleName || "Apparel Order",
      brand:       style?.brandName || "",
      color:       activeColor?.colorName || "",
      size:        sizeSummary,
      sku:         firstSku,
      price_cents:   String(Math.round(orderTotal * 100)),
      style_id:      String(style?.styleID || ""),
      image:         activeColor?.frontImage || style?.styleImage || "",
      payment_mode:  "full",
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
              <img key={img} src={img} alt={style.title} className="main-img" />
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
          <h1 className="title">{(style.title || style.styleName).replace(/[-]/g, "").replace(/ {2,}/g, " ").trim()}</h1>
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
                    onClick={() => { setActiveColor(c); setActiveSize(null); setSizeQtys({}); setActiveImg("front"); }}
                    className={`swatch ${activeColor?.colorName === c.colorName ? "active" : ""}`}
                  >
                    {/* Colored dot fallback — always visible */}
                    <span className="swatch-dot" style={{ background: c.colorHex || colorNameToHex(c.colorName) }} />
                    {validSwatch(c.swatchImage) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={validSwatch(c.swatchImage)!}
                        alt={c.colorName}
                        className="swatch-img swatch-img-over"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size & quantity picker */}
          {activeColor && activeColor.sizes.length > 0 && (() => {
            const totalQty = activeColor.sizes.reduce((sum, s) => sum + (sizeQtys[s.sku] ?? 0), 0);
            return (
              <div className="section">
                <p className="section-label">Sizes &amp; Quantities</p>
                <div className="size-qty-table">
                  {activeColor.sizes.map(s => {
                    const oos = s.qtyTotal === 0;
                    return (
                      <div key={s.sku} className={`sqrow ${oos ? "sqoos" : ""}`}>
                        <span className="sq-name">{s.sizeName}</span>
                        <span className="sq-price">${s.piecePrice.toFixed(2)}</span>
                        {oos
                          ? <span className="sq-oos">Out of stock</span>
                          : <input
                              type="number" min={0} max={999}
                              value={sizeQtys[s.sku] ?? 0}
                              onChange={e => setSizeQtys(p => ({ ...p, [s.sku]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              className="sq-input"
                            />
                        }
                      </div>
                    );
                  })}
                </div>
                {totalQty > 0 && (
                  <p className="qty-note" style={{marginTop:"0.5rem"}}>
                    {totalQty} piece{totalQty !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            );
          })()}

          {/* CTA */}
          <button className="cta-btn" onClick={handleBuy}>
            Checkout →
          </button>

          <a href={`/design/${styleId}`} className="design-btn">
            🎨 Design This Product
          </a>

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
        .swatch { position: relative; width: 34px; height: 34px; border-radius: 6px; border: 2px solid transparent; overflow: hidden; cursor: pointer; padding: 0; transition: all 0.15s; background: #1a1a1a; }
        .swatch:hover { border-color: #888; transform: scale(1.08); }
        .swatch.active { border-color: #e8c97e; box-shadow: 0 0 0 1px #e8c97e44; }
        .swatch-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swatch-img-over { position: absolute; inset: 0; border-radius: 4px; }
        .swatch-dot { display: block; width: 100%; height: 100%; border-radius: 4px; }

        /* Sizes & Quantities */
        .size-qty-table { display: flex; flex-direction: column; gap: 0.25rem; }
        .sqrow { display: grid; grid-template-columns: 3.5rem 1fr 5rem; align-items: center; gap: 0.5rem; padding: 0.4rem 0.6rem; border-radius: 7px; border: 1px solid #1e1e1e; background: #111; }
        .sqrow.sqoos { opacity: 0.35; }
        .sq-name { font-size: 0.82rem; font-weight: 700; color: #ccc; }
        .sq-price { font-size: 0.75rem; color: #666; }
        .sq-input { width: 100%; padding: 0.35rem 0.4rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 5px; color: #f0ede8; font-size: 0.85rem; text-align: center; font-family: inherit; box-sizing: border-box; }
        .sq-input:focus { outline: none; border-color: #e8c97e55; }
        .sq-oos { font-size: 0.7rem; color: #555; text-align: right; }

        .qty-note { font-size: 0.75rem; color: #666; margin: -0.5rem 0 1.25rem; }

        /* CTA */
        .cta-btn { width: 100%; padding: 1rem; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: 0.04em; transition: background 0.2s; margin-bottom: 0.6rem; }
        .cta-btn:hover { background: #f0d99a; }
        .buy-error { font-size: 0.78rem; color: #c87e7e; margin: -0.25rem 0 0.5rem; text-align: center; }
        .design-btn { display: block; width: 100%; padding: 0.85rem; margin-bottom: 0.75rem; background: transparent; border: 1px solid #e8c97e55; color: #e8c97e; border-radius: 8px; font-size: 0.9rem; font-weight: 600; text-align: center; text-decoration: none; transition: all 0.2s; box-sizing: border-box; }
        .design-btn:hover { background: #e8c97e18; border-color: #e8c97e; }
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
