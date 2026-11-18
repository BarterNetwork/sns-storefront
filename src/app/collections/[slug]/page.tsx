"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import DesignMockup from "@/components/DesignMockup";
import { useCart } from "@/context/CartContext";
import { CollectionProduct, SLEEVE_SIDES, SleeveSide, basePrintFee, imageSrc, printFeeFor, sleeveArt, sleeveFee, sleeveModeFor } from "@/lib/collections";
import type { StyleColor } from "@/lib/style-detail";
import { swatchColor } from "@/lib/color-hex";

type DetailProduct = CollectionProduct & { style: any; colors: StyleColor[] };
interface Detail { id: string; slug: string; name: string; description: string | null; design_url: string; left_sleeve_url: string | null; right_sleeve_url: string | null; products: DetailProduct[] }

const photoFor = (p: DetailProduct, c: StyleColor | undefined) =>
  (p.print_location === "Back" ? (c?.backImage || c?.frontImage) : c?.frontImage) || p.style?.styleImage || null;

const swatchBg = (c: StyleColor) => swatchColor(c);

export default function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, count, openCart } = useCart();

  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [styleIdx, setStyleIdx] = useState(0);
  // Color + size picks are remembered per style, so switching back and forth keeps them
  const [colorBy, setColorBy] = useState<Record<number, string>>({});
  const [qtys, setQtys] = useState<Record<string, number>>({}); // key: sku
  // Optional sleeves the customer ticked, per style
  const [sleevesBy, setSleevesBy] = useState<Record<number, SleeveSide[]>>({});
  const [added, setAdded] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/collections/${encodeURIComponent(slug)}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return; }
        const j = await r.json();
        if (j.data?.products?.length) setData(j.data); else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const product = data?.products[styleIdx];
  const color = useMemo(() => {
    if (!product) return undefined;
    const name = colorBy[product.style_id] || product.default_color;
    return product.colors.find(c => c.colorName === name) || product.colors[0];
  }, [product, colorBy]);

  // Sleeves printed on this product: always-included ones + optional ones the customer ticked
  const activeSleeves: SleeveSide[] = data && product
    ? SLEEVE_SIDES.filter(side => {
        const mode = sleeveModeFor(data, product, side);
        return mode === "included" || (mode === "optional" && (sleevesBy[product.style_id] || []).includes(side));
      })
    : [];
  const sleevesFee = activeSleeves.reduce((s, side) => s + sleeveFee(side), 0);
  const fee = product ? printFeeFor(product) + sleevesFee : 0;
  const sizes = color?.sizes ?? [];
  const lineQty = sizes.reduce((s, z) => s + (qtys[z.sku] || 0), 0);
  const lineTotal = sizes.reduce((s, z) => s + ((z.piecePrice ?? 0) + fee) * (qtys[z.sku] || 0), 0);
  const fromPrice = (p: DetailProduct) => {
    const prices = p.colors.flatMap(c => c.sizes.map(s => s.piecePrice)).filter((n): n is number => n != null);
    return prices.length && data ? Math.min(...prices) + basePrintFee(data, p) : null;
  };

  const setQty = (sku: string, v: number) => setQtys(q => ({ ...q, [sku]: Math.max(0, Math.min(999, v || 0)) }));

  const addToCart = () => {
    if (!data || !product || !color) return;
    if (lineQty === 0) { setErr("Enter a quantity for at least one size."); return; }
    setErr("");
    const label = product.label || product.style?.title || product.style?.styleName;
    for (const s of sizes) {
      const q = qtys[s.sku] || 0;
      if (!q || s.piecePrice == null) continue;
      addItem({
        sku: `${s.sku}::${data.slug}${activeSleeves.length ? `::${activeSleeves.join("+")}` : ""}`,
        styleId: product.style_id,
        brandName: product.style?.brandName || "",
        title: `${data.name} — ${label}`,
        styleName: product.style?.styleName || "",
        colorName: color.colorName,
        sizeName: s.sizeName,
        price: Math.round((s.piecePrice + fee) * 100) / 100,
        qty: q,
        image: imageSrc(photoFor(product, color)),
        collection: {
          collectionSlug: data.slug,
          collectionName: data.name,
          designUrl: data.design_url,
          printLocation: product.print_location,
          placement: product.placement,
          productLabel: product.label,
          garmentSku: s.sku,
          printFee: fee,
          sleeves: activeSleeves.map(side => ({ side, url: sleeveArt(data, side)!, fee: sleeveFee(side) })),
        },
      });
    }
    // Clear this color's quantities so it's easy to add another product next
    setQtys(q => { const n = { ...q }; sizes.forEach(s => delete n[s.sku]); return n; });
    setAdded(`${lineQty} × ${label} (${color.colorName}) added. Pick another product to add more.`);
  };

  if (loading) return <StateBox>Loading…</StateBox>;
  if (notFound || !data || !product) {
    return (
      <StateBox>
        <p>This design isn&apos;t available.</p>
        <a href="/">← Shop</a>
      </StateBox>
    );
  }

  return (
    <div className="page">
      <header className="top">
        <a href="/" className="back">← Shop</a>
        <button className="cart-btn" onClick={openCart}>Cart{count > 0 && <span className="badge">{count}</span>}</button>
      </header>

      <div className="layout">
        {/* Preview */}
        <div className="preview">
          <DesignMockup garmentImage={photoFor(product, color)} designUrl={data.design_url} placement={product.placement}
            sleeves={activeSleeves.map(side => ({ side, url: sleeveArt(data, side)! }))}
            alt={`${data.name} on ${product.label || product.style?.title}`} />
          <p className="print-note">
            {[product.print_location, ...activeSleeves.map(sd => `${sd} sleeve`)].join(" + ")} print · shown on {color?.colorName}
          </p>
          {product.colors.length > 1 && (
            <div className="swatches mobile-swatches">
              {product.colors.map(c => (
                <button key={c.colorName} title={c.colorName} aria-label={c.colorName}
                  className={`sw ${c.colorName === color?.colorName ? "on" : ""}`}
                  style={{ background: swatchBg(c) }}
                  onClick={() => setColorBy(cb => ({ ...cb, [product.style_id]: c.colorName }))} />
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="opts">
          <h1>{data.name}</h1>
          {data.description && <p className="desc">{data.description}</p>}

          {/* Step 1: product */}
          <div className="step step-product">
            <div className="step-head"><span className="num">1</span>Choose your product</div>
            <div className="styles">
              {data.products.map((p, i) => {
                const c = p.colors.find(x => x.colorName === (colorBy[p.style_id] || p.default_color)) || p.colors[0];
                const fp = fromPrice(p);
                return (
                  <button key={p.style_id} className={`style ${i === styleIdx ? "on" : ""}`}
                    onClick={() => { setStyleIdx(i); setErr(""); setAdded(""); }}>
                    <DesignMockup garmentImage={photoFor(p, c)} designUrl={data.design_url} placement={p.placement}
                      sleeves={SLEEVE_SIDES.filter(sd => sleeveModeFor(data, p, sd) === "included").map(sd => ({ side: sd, url: sleeveArt(data, sd)! }))} />
                    <span className="style-name">{p.label || p.style?.title}</span>
                    {fp != null && <span className="style-price">from ${fp.toFixed(2)}</span>}
                  </button>
                );
              })}
            </div>
            <p className="style-detail">{product.style?.brandName} {product.style?.styleName} — {product.style?.title}</p>
          </div>

          {/* Step 2: color */}
          <div className="step step-color">
            <div className="step-head"><span className="num">2</span>Color: <b>{color?.colorName}</b>
              {product.colors.length === 1 && <span className="only">only color for this design</span>}
            </div>
            {product.colors.length > 1 && <div className="swatches">
              {product.colors.map(c => (
                <button key={c.colorName} title={c.colorName} aria-label={c.colorName}
                  className={`sw ${c.colorName === color?.colorName ? "on" : ""}`}
                  style={{ background: swatchBg(c) }}
                  onClick={() => setColorBy(cb => ({ ...cb, [product.style_id]: c.colorName }))} />
              ))}
            </div>}
          </div>

          {/* Sleeves (only when this product offers any) */}
          {SLEEVE_SIDES.some(side => sleeveModeFor(data, product, side) !== "off") && (
            <div className="step">
              <div className="step-head"><span className="num">+</span>Sleeve prints</div>
              <div className="sleeve-opts">
                {SLEEVE_SIDES.map(side => {
                  const mode = sleeveModeFor(data, product, side);
                  if (mode === "off") return null;
                  const on = activeSleeves.includes(side);
                  return (
                    <label key={side} className={`sleeve-opt ${on ? "on" : ""} ${mode === "included" ? "locked" : ""}`}>
                      <input type="checkbox" checked={on} disabled={mode === "included"}
                        onChange={e => setSleevesBy(sb => {
                          const cur = new Set(sb[product.style_id] || []);
                          if (e.target.checked) cur.add(side); else cur.delete(side);
                          return { ...sb, [product.style_id]: SLEEVE_SIDES.filter(x => cur.has(x)) };
                        })} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sleeveArt(data, side)!} alt="" />
                      <span className="sleeve-text">
                        <b>{side === "left" ? "Left" : "Right"} sleeve</b>
                        <span>{mode === "included" ? `Included · $${sleeveFee(side).toFixed(2)}` : `Add for $${sleeveFee(side).toFixed(2)}`}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: sizes */}
          <div className="step">
            <div className="step-head"><span className="num">3</span>Sizes &amp; quantities</div>
            <div className="sizes">
              {sizes.map(s => {
                const out = s.qtyTotal != null && s.qtyTotal <= 0;
                return (
                  <label key={s.sku} className={`size ${out ? "out" : ""}`}>
                    <span className="size-name">{s.sizeName}</span>
                    <span className="size-price">{s.piecePrice != null ? `$${(s.piecePrice + fee).toFixed(2)}` : "—"}</span>
                    <input type="number" inputMode="numeric" min={0} max={999} disabled={out || s.piecePrice == null}
                      value={qtys[s.sku] || ""} placeholder={out ? "Out" : "0"}
                      onChange={e => setQty(s.sku, parseInt(e.target.value))} />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="buy">
            <div className="buy-total">
              <span>{lineQty} item{lineQty === 1 ? "" : "s"}</span>
              <b>${lineTotal.toFixed(2)}</b>
            </div>
            <button className="add" onClick={addToCart} disabled={lineQty === 0}>Add to cart</button>
          </div>
          {err && <p className="err">{err}</p>}
          {added && (
            <p className="added">✓ {added} <button className="link" onClick={openCart}>View cart</button></p>
          )}
          <p className="fine">
            Price includes the {product.print_location.toLowerCase()} print (${printFeeFor(product).toFixed(2)})
            {activeSleeves.length > 0 && <> and {activeSleeves.length === 2 ? "both sleeves" : `${activeSleeves[0]} sleeve`} (${sleevesFee.toFixed(2)})</>} per piece.
          </p>
        </div>
      </div>

      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; padding-bottom: 4rem; }
        .top { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #1a1a1a; }
        .back { color: #888; text-decoration: none; font-size: 0.85rem; }
        .back:hover { color: #e8c97e; }
        .cart-btn { display: flex; align-items: center; gap: 0.4rem; background: transparent; border: 1px solid #2a2a2a; color: #f0ede8; border-radius: 999px; padding: 0.45rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.82rem; }
        .cart-btn:hover { border-color: #e8c97e; }
        .badge { background: #e8c97e; color: #0a0a0a; font-size: 0.7rem; font-weight: 700; border-radius: 999px; padding: 0.05rem 0.45rem; }

        .layout { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2.5rem; align-items: start; }
        .preview { position: sticky; top: 1.5rem; }
        .print-note { font-size: 0.75rem; color: #666; text-align: center; margin: 0.6rem 0 0; }

        h1 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: clamp(2rem, 5vw, 2.8rem); letter-spacing: 0.04em; margin: 0; line-height: 1; }
        .desc { color: #999; line-height: 1.5; margin: 0.6rem 0 0; }
        .step { margin-top: 1.6rem; }
        .step-head { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #bbb; margin-bottom: 0.7rem; }
        .only { font-size: 0.72rem; color: #777; margin-left: 0.3rem; }
        .sleeve-opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.6rem; }
        .sleeve-opt { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.7rem; background: #111; border: 2px solid #1e1e1e; border-radius: 10px; cursor: pointer; }
        .sleeve-opt.on { border-color: #e8c97e; background: #e8c97e0d; }
        .sleeve-opt.locked { cursor: default; }
        .sleeve-opt input { accent-color: #e8c97e; width: 16px; height: 16px; margin: 0; }
        .sleeve-opt img { width: 40px; height: 40px; object-fit: contain; background: #1a1a1a; border-radius: 6px; padding: 3px; box-sizing: border-box; }
        .sleeve-text { display: flex; flex-direction: column; font-size: 0.8rem; }
        .sleeve-text span { font-size: 0.72rem; color: #999; }
        .num { width: 22px; height: 22px; border-radius: 50%; background: #e8c97e; color: #0a0a0a; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }

        .styles { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 0.6rem; }
        .style { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.4rem 0.4rem 0.55rem; background: #111; border: 2px solid #1e1e1e; border-radius: 10px; cursor: pointer; color: inherit; font-family: inherit; text-align: center; }
        .style:hover { border-color: #444; }
        .style.on { border-color: #e8c97e; background: #e8c97e0d; }
        .style-name { font-size: 0.82rem; font-weight: 600; }
        .style-price { font-size: 0.72rem; color: #999; }
        .style-detail { font-size: 0.75rem; color: #666; margin: 0.55rem 0 0; }

        .swatches { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .sw { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #2a2a2a; cursor: pointer; padding: 0; box-shadow: inset 0 0 0 2px #0a0a0a; }
        .sw.on { border-color: #e8c97e; }

        .sizes { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 0.5rem; }
        .size { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.5rem 0.4rem; background: #111; border: 1px solid #1e1e1e; border-radius: 8px; }
        .size.out { opacity: 0.4; }
        .size-name { font-size: 0.85rem; font-weight: 700; }
        .size-price { font-size: 0.7rem; color: #888; }
        .size input { width: 100%; box-sizing: border-box; text-align: center; padding: 0.35rem; background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-family: inherit; font-size: 0.9rem; outline: none; }
        .size input:focus { border-color: #e8c97e88; }

        .buy { display: flex; align-items: center; gap: 1rem; margin-top: 1.6rem; padding-top: 1.2rem; border-top: 1px solid #1a1a1a; }
        .buy-total { display: flex; flex-direction: column; font-size: 0.78rem; color: #888; }
        .buy-total b { font-size: 1.3rem; color: #e8c97e; }
        .add { flex: 1; padding: 0.9rem; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit; }
        .add:hover:not(:disabled) { background: #f0d99a; }
        .add:disabled { opacity: 0.45; cursor: default; }
        .err { color: #c87e7e; font-size: 0.82rem; margin: 0.6rem 0 0; }
        .added { color: #7ec87e; font-size: 0.82rem; margin: 0.6rem 0 0; }
        .link { background: none; border: none; color: #e8c97e; text-decoration: underline; cursor: pointer; font-family: inherit; font-size: inherit; padding: 0; }
        .fine { font-size: 0.72rem; color: #555; margin: 0.8rem 0 0; }

        .mobile-swatches { display: none; }

        @media (max-width: 760px) {
          .layout { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.25rem 1rem; }
          .preview { position: static; max-width: 420px; margin: 0 auto; width: 100%; }
          .top { padding: 0.85rem 1rem; }
          .mobile-swatches { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.75rem 0 0; justify-content: center; }
          .step-color .swatches { display: none; }
        }
      `}</style>
    </div>
  );
}

function StateBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="state">
      {children}
      <style jsx>{`
        .state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; background: #0a0a0a; color: #888; font-family: 'DM Sans', sans-serif; }
        .state :global(a) { color: #e8c97e; text-decoration: none; }
      `}</style>
    </div>
  );
}
