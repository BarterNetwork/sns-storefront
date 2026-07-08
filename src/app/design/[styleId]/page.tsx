"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Size {
  sku: string;
  sizeName: string;
  piecePrice: number;
  qtyTotal: number;
}

interface Color {
  colorName: string;
  colorHex: string | null;
  swatchImage: string | null;
  frontImage: string | null;
  backImage: string | null;
  sizes: Size[];
}

interface Style {
  styleID: number;
  brandName: string;
  styleName: string;
  title: string;
  description: string | null;
  baseCategory: string | null;
}

type View = "front" | "back";

export default function DesignPage() {
  const params = useParams();
  const router = useRouter();
  const styleId = params.styleId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [style, setStyle] = useState<Style | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [activeSize, setActiveSize] = useState<Size | null>(null);
  const [view, setView] = useState<View>("front");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tool state
  const [activeTool, setActiveTool] = useState<"select" | "text">("select");
  const [textInput, setTextInput] = useState("");
  const [fontSize, setFontSize] = useState(36);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#ffffff");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  // UI state
  const [removingBg, setRemovingBg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Print zones
  const [printFront, setPrintFront] = useState(true);
  const [printBack, setPrintBack] = useState(false);
  const [printLeftSleeve, setPrintLeftSleeve] = useState(false);
  const [printRightSleeve, setPrintRightSleeve] = useState(false);

  // Pricing constants
  const PRINT_FRONT = 15;
  const PRINT_BACK = 5;
  const PRINT_SLEEVE = 3;
  const REBATE_THRESHOLD = 200;
  const REBATE_AMOUNT = 50;

  const fonts = ["Arial", "Georgia", "Impact", "Courier New", "Trebuchet MS", "Bebas Neue", "Pacifico", "Oswald"];

  // Load product data
  useEffect(() => {
    fetch(`/api/products/${styleId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setStyle(data.style);
        setColors(data.colors || []);
        if (data.colors?.length > 0) setActiveColor(data.colors[0]);
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [styleId]);

  // Init Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    import("fabric").then(({ fabric }) => {
      const canvas = new fabric.Canvas(canvasRef.current!, {
        width: 500,
        height: 500,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      canvas.on("selection:created", (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      canvas.on("selection:updated", (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      canvas.on("selection:cleared", () => setSelectedObj(null));

      setCanvasReady(true);
    });

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  // Update product background image when color or view changes
  useEffect(() => {
    if (!fabricRef.current || !canvasReady) return;
    const canvas = fabricRef.current;
    const imgUrl = view === "back" ? activeColor?.backImage : activeColor?.frontImage;

    if (!imgUrl) {
      canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
      return;
    }

    import("fabric").then(({ fabric }) => {
      fabric.Image.fromURL(
        `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`,
        (img: any) => {
          img.scaleToWidth(500);
          img.scaleToHeight(500);
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            scaleX: 500 / (img.width || 500),
            scaleY: 500 / (img.height || 500),
            originX: "left",
            originY: "top",
          });
        },
        { crossOrigin: "anonymous" }
      );
    });
  }, [activeColor, view, canvasReady]);

  const addText = useCallback(() => {
    if (!fabricRef.current || !textInput.trim()) return;
    import("fabric").then(({ fabric }) => {
      const text = new fabric.IText(textInput, {
        left: 150,
        top: 150,
        fontSize,
        fontFamily,
        fill: textColor,
        fontWeight: bold ? "bold" : "normal",
        fontStyle: italic ? "italic" : "normal",
        editable: true,
      });
      fabricRef.current.add(text);
      fabricRef.current.setActiveObject(text);
      fabricRef.current.renderAll();
      setTextInput("");
      setActiveTool("select");
    });
  }, [textInput, fontSize, fontFamily, textColor, bold, italic]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(dataUrl, (img: any) => {
          const max = 200;
          if (img.width > max || img.height > max) {
            img.scaleToWidth(Math.min(img.width, max));
          }
          img.set({ left: 150, top: 150 });
          fabricRef.current.add(img);
          fabricRef.current.setActiveObject(img);
          fabricRef.current.renderAll();
        });
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeBg = async () => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || obj.type !== "image") return;
    setRemovingBg(true);
    try {
      const dataUrl = obj.toDataURL({ format: "png" });
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }

      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(data.image, (newImg: any) => {
          newImg.set({
            left: obj.left,
            top: obj.top,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
          });
          fabricRef.current.remove(obj);
          fabricRef.current.add(newImg);
          fabricRef.current.setActiveObject(newImg);
          fabricRef.current.renderAll();
        });
      });
    } finally {
      setRemovingBg(false);
    }
  };

  const deleteSelected = () => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    fabricRef.current.remove(obj);
    fabricRef.current.renderAll();
    setSelectedObj(null);
  };

  const bringForward = () => { fabricRef.current?.bringForward(fabricRef.current.getActiveObject()); fabricRef.current?.renderAll(); };
  const sendBackward = () => { fabricRef.current?.sendBackwards(fabricRef.current.getActiveObject()); fabricRef.current?.renderAll(); };

  const undo = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  };

  const handleSubmitOrder = async () => {
    if (!activeSize) { setSubmitError("Please select a size."); return; }
    if (!style || !activeColor) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const canvas = fabricRef.current;
      const mockupDataUrl = canvas?.toDataURL({ format: "png", multiplier: 2 }) ?? null;

      const printZones = [
        printFront && "Front",
        printBack && "Back",
        printLeftSleeve && "Left Sleeve",
        printRightSleeve && "Right Sleeve",
      ].filter(Boolean).join(", ");

      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style_id: style.styleID,
          brand_name: style.brandName,
          style_name: style.styleName,
          title: style.title,
          color: activeColor.colorName,
          size: activeSize.sizeName,
          sku: activeSize.sku,
          qty,
          garment_price: garmentPrice,
          print_fee: printFee,
          price_per: pricePerPiece,
          order_total: orderTotal,
          barter_bucks_rebate: rebatesEarned,
          print_zones: printZones,
          design_mockup: mockupDataUrl,
          note: `Custom design order — Print locations: ${printZones}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit order");
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sizes = activeColor?.sizes ?? ([] as Size[]);
  const garmentPrice = activeSize?.piecePrice ?? sizes[0]?.piecePrice ?? null;

  const printFee =
    (printFront ? PRINT_FRONT : 0) +
    (printBack ? PRINT_BACK : 0) +
    (printLeftSleeve ? PRINT_SLEEVE : 0) +
    (printRightSleeve ? PRINT_SLEEVE : 0);

  const pricePerPiece = garmentPrice != null ? garmentPrice + printFee : null;
  const orderTotal = pricePerPiece != null ? pricePerPiece * qty : null;
  const rebatesEarned = orderTotal != null ? Math.floor(orderTotal / REBATE_THRESHOLD) * REBATE_AMOUNT : 0;

  if (loading) return <div className="loading">Loading product…</div>;
  if (error || !style) return <div className="loading error">{error || "Product not found"}</div>;

  if (submitted) {
    return (
      <div className="loading" style={{ flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "3rem" }}>✅</div>
        <h2 style={{ color: "#e8c97e", margin: 0 }}>Order submitted!</h2>
        <p style={{ color: "#888", textAlign: "center", maxWidth: 320 }}>
          We received your custom design for the {style.title}. We'll be in touch to confirm your order.
        </p>
        <button className="btn-gold" onClick={() => router.push(`/product/${styleId}`)}>Back to product</button>
      </div>
    );
  }

  return (
    <div className="designer">
      {/* Header */}
      <div className="header">
        <a href={`/product/${styleId}`} className="back-link">← Back</a>
        <div className="header-title">
          <span className="brand-tag">{style.brandName}</span>
          <h1>{style.title || style.styleName}</h1>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={undo}>↩ Undo</button>
          {selectedObj && (
            <>
              <button className="btn-ghost" onClick={bringForward}>↑ Forward</button>
              <button className="btn-ghost" onClick={sendBackward}>↓ Back</button>
              <button className="btn-danger" onClick={deleteSelected}>✕ Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="workspace">
        {/* Left panel — tools */}
        <div className="panel">
          <section className="tool-section">
            <p className="tool-label">View</p>
            <div className="tab-row">
              <button className={`tab ${view === "front" ? "active" : ""}`} onClick={() => setView("front")}>Front</button>
              {activeColor?.backImage && (
                <button className={`tab ${view === "back" ? "active" : ""}`} onClick={() => setView("back")}>Back</button>
              )}
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Color — <span className="selected-val">{activeColor?.colorName}</span></p>
            <div className="swatch-grid">
              {colors.map(c => (
                <button
                  key={c.colorName}
                  title={c.colorName}
                  onClick={() => setActiveColor(c)}
                  className={`swatch ${activeColor?.colorName === c.colorName ? "active" : ""}`}
                >
                  {c.swatchImage
                    ? <img src={c.swatchImage} alt={c.colorName} />
                    : <span style={{ background: c.colorHex || "#555" }} />
                  }
                </button>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Add Text</p>
            <input
              className="text-input"
              placeholder="Your text here"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addText()}
            />
            <div className="row">
              <select className="select" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                {fonts.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input
                type="number"
                className="size-input"
                value={fontSize}
                min={10}
                max={120}
                onChange={e => setFontSize(Number(e.target.value))}
              />
            </div>
            <div className="row">
              <button className={`fmt-btn ${bold ? "active" : ""}`} onClick={() => setBold(b => !b)}><b>B</b></button>
              <button className={`fmt-btn ${italic ? "active" : ""}`} onClick={() => setItalic(i => !i)}><i>I</i></button>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="color-picker" title="Text color" />
            </div>
            <button className="btn-gold" onClick={addText} disabled={!textInput.trim()}>Add to design</button>
          </section>

          <section className="tool-section">
            <p className="tool-label">Upload Image</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>Upload image</button>
            {selectedObj?.type === "image" && (
              <button className="btn-outline" onClick={removeBg} disabled={removingBg}>
                {removingBg ? "Removing…" : "✂ Remove background"}
              </button>
            )}
          </section>
        </div>

        {/* Canvas */}
        <div className="canvas-wrap">
          <canvas ref={canvasRef} />
          {!canvasReady && <div className="canvas-loading">Loading canvas…</div>}
        </div>

        {/* Right panel — order */}
        <div className="panel">
          <section className="tool-section">
            <p className="tool-label">Print Locations</p>
            <div className="zone-list">
              <label className="zone-row">
                <input type="checkbox" checked={printFront} onChange={e => setPrintFront(e.target.checked)} />
                <span>Front</span>
                <span className="zone-price">+${PRINT_FRONT}</span>
              </label>
              <label className="zone-row">
                <input type="checkbox" checked={printBack} onChange={e => setPrintBack(e.target.checked)} />
                <span>Back</span>
                <span className="zone-price">+${PRINT_BACK}</span>
              </label>
              <label className="zone-row">
                <input type="checkbox" checked={printLeftSleeve} onChange={e => setPrintLeftSleeve(e.target.checked)} />
                <span>Left Sleeve</span>
                <span className="zone-price">+${PRINT_SLEEVE}</span>
              </label>
              <label className="zone-row">
                <input type="checkbox" checked={printRightSleeve} onChange={e => setPrintRightSleeve(e.target.checked)} />
                <span>Right Sleeve</span>
                <span className="zone-price">+${PRINT_SLEEVE}</span>
              </label>
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Size</p>
            <div className="size-grid">
              {sizes.map(s => (
                <button
                  key={s.sku}
                  disabled={s.qtyTotal === 0}
                  onClick={() => setActiveSize(s)}
                  className={`size-btn ${activeSize?.sku === s.sku ? "active" : ""} ${s.qtyTotal === 0 ? "oos" : ""}`}
                >
                  {s.sizeName}
                </button>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Quantity</p>
            <div className="qty-row">
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span className="qty-val">{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
          </section>

          {pricePerPiece != null && (
            <section className="tool-section">
              <p className="tool-label">Price Breakdown</p>
              <div className="breakdown">
                <div className="breakdown-row"><span>Garment</span><span>${garmentPrice?.toFixed(2)}</span></div>
                {printFront && <div className="breakdown-row"><span>Front print</span><span>+${PRINT_FRONT}.00</span></div>}
                {printBack && <div className="breakdown-row"><span>Back print</span><span>+${PRINT_BACK}.00</span></div>}
                {printLeftSleeve && <div className="breakdown-row"><span>Left sleeve</span><span>+${PRINT_SLEEVE}.00</span></div>}
                {printRightSleeve && <div className="breakdown-row"><span>Right sleeve</span><span>+${PRINT_SLEEVE}.00</span></div>}
                <div className="breakdown-row total"><span>Per piece</span><span>${pricePerPiece.toFixed(2)}</span></div>
                {qty > 1 && <div className="breakdown-row total"><span>Total ({qty} pcs)</span><span>${orderTotal?.toFixed(2)}</span></div>}
              </div>
              {rebatesEarned > 0 && (
                <div className="rebate-badge">
                  🎉 You earn <strong>${rebatesEarned} in Barter Bucks</strong> on this order!
                </div>
              )}
            </section>
          )}

          <section className="tool-section">
            <button className="btn-gold full" onClick={handleSubmitOrder} disabled={submitting || !activeSize}>
              {submitting ? "Submitting…" : "Submit Design Order →"}
            </button>
            {!activeSize && <p className="hint">Select a size to order</p>}
            {submitError && <p className="err">{submitError}</p>}
            <p className="hint">We'll review your design and contact you to confirm.</p>
          </section>
        </div>
      </div>

      <style jsx>{`
        .designer { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }

        .loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: #888; flex-direction: column; gap: 0.5rem; }
        .error { color: #c87e7e; }

        .header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid #1a1a1a; background: #0d0d0d; flex-wrap: wrap; }
        .back-link { font-size: 0.8rem; color: #666; text-decoration: none; white-space: nowrap; }
        .back-link:hover { color: #e8c97e; }
        .header-title { flex: 1; min-width: 0; }
        .header-title h1 { font-size: 1rem; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .brand-tag { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: #e8c97e; }
        .header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

        .workspace { display: grid; grid-template-columns: 260px 1fr 240px; gap: 0; flex: 1; min-height: 0; }

        .panel { background: #0d0d0d; border-right: 1px solid #1a1a1a; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0; }
        .panel:last-child { border-right: none; border-left: 1px solid #1a1a1a; }

        .tool-section { padding: 1rem 0; border-bottom: 1px solid #1a1a1a; }
        .tool-section:last-child { border-bottom: none; }
        .tool-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin: 0 0 0.6rem; }
        .selected-val { color: #ccc; font-weight: 400; text-transform: none; letter-spacing: 0; }

        .tab-row { display: flex; gap: 0.4rem; }
        .tab { flex: 1; padding: 0.4rem; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 0.75rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .tab:hover { border-color: #e8c97e; color: #e8c97e; }
        .tab.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }

        .swatch-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .swatch { width: 30px; height: 30px; border-radius: 5px; border: 2px solid transparent; overflow: hidden; cursor: pointer; padding: 0; background: #1a1a1a; transition: all 0.15s; }
        .swatch:hover { border-color: #888; transform: scale(1.1); }
        .swatch.active { border-color: #e8c97e; }
        .swatch img, .swatch span { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 3px; }

        .text-input { width: 100%; padding: 0.5rem 0.6rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.85rem; font-family: inherit; margin-bottom: 0.5rem; box-sizing: border-box; }
        .text-input:focus { outline: none; border-color: #e8c97e55; }
        .row { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; align-items: center; }
        .select { flex: 1; padding: 0.4rem 0.5rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.78rem; font-family: inherit; cursor: pointer; }
        .select:focus { outline: none; }
        .size-input { width: 56px; padding: 0.4rem 0.5rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.78rem; text-align: center; }
        .size-input:focus { outline: none; }
        .fmt-btn { width: 32px; height: 32px; border: 1px solid #2a2a2a; background: transparent; color: #888; border-radius: 5px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
        .fmt-btn:hover, .fmt-btn.active { border-color: #e8c97e; color: #e8c97e; background: #e8c97e18; }
        .color-picker { width: 32px; height: 32px; border: 1px solid #2a2a2a; border-radius: 5px; padding: 2px; background: transparent; cursor: pointer; }
        .hidden { display: none; }

        .size-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .size-btn { padding: 0.4rem 0.7rem; border: 1px solid #2a2a2a; background: transparent; color: #ccc; font-size: 0.78rem; border-radius: 5px; cursor: pointer; font-family: inherit; transition: all 0.15s; position: relative; }
        .size-btn:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .size-btn.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }
        .size-btn.oos { color: #444; border-color: #1e1e1e; cursor: default; }

        .qty-row { display: flex; align-items: center; gap: 0; border: 1px solid #2a2a2a; border-radius: 7px; overflow: hidden; width: fit-content; }
        .qty-btn { width: 36px; height: 36px; background: transparent; border: none; color: #ccc; font-size: 1.1rem; cursor: pointer; transition: color 0.15s; }
        .qty-btn:hover { color: #e8c97e; }
        .qty-val { min-width: 36px; text-align: center; font-size: 0.9rem; font-weight: 600; }

        .price { font-size: 1.5rem; font-weight: 700; color: #f0ede8; margin: 0; }
        .price-note { font-size: 0.72rem; color: #555; margin: 0.25rem 0 0; }

        .btn-gold { background: #e8c97e; color: #0a0a0a; border: none; border-radius: 7px; padding: 0.55rem 1rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; white-space: nowrap; }
        .btn-gold:hover:not(:disabled) { background: #f0d99a; }
        .btn-gold:disabled { opacity: 0.5; cursor: default; }
        .btn-gold.full { width: 100%; padding: 0.75rem; font-size: 0.9rem; }
        .btn-outline { width: 100%; padding: 0.5rem; border: 1px solid #2a2a2a; background: transparent; color: #ccc; border-radius: 7px; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.15s; margin-bottom: 0.4rem; }
        .btn-outline:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .btn-outline:disabled { opacity: 0.5; cursor: default; }
        .btn-ghost { padding: 0.35rem 0.7rem; border: 1px solid #2a2a2a; background: transparent; color: #888; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #888; color: #ccc; }
        .btn-danger { padding: 0.35rem 0.7rem; border: 1px solid #c87e7e44; background: transparent; color: #c87e7e; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-danger:hover { background: #c87e7e18; }

        .canvas-wrap { background: #111; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .canvas-loading { position: absolute; color: #555; font-size: 0.85rem; }

        .zone-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .zone-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: #ccc; cursor: pointer; }
        .zone-row input { accent-color: #e8c97e; width: 14px; height: 14px; cursor: pointer; }
        .zone-row span:nth-child(2) { flex: 1; }
        .zone-price { color: #888; font-size: 0.75rem; }

        .breakdown { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
        .breakdown-row { display: flex; justify-content: space-between; font-size: 0.78rem; color: #888; }
        .breakdown-row.total { color: #f0ede8; font-weight: 700; border-top: 1px solid #2a2a2a; padding-top: 0.3rem; margin-top: 0.2rem; }

        .rebate-badge { background: #e8c97e12; border: 1px solid #e8c97e33; border-radius: 8px; padding: 0.6rem 0.75rem; font-size: 0.78rem; color: #e8c97e; text-align: center; }
        .rebate-badge strong { font-weight: 700; }

        .hint { font-size: 0.72rem; color: #555; margin: 0.4rem 0 0; text-align: center; }
        .err { font-size: 0.75rem; color: #c87e7e; margin: 0.4rem 0 0; }

        @media (max-width: 900px) {
          .workspace { grid-template-columns: 1fr; }
          .panel { border-right: none; border-bottom: 1px solid #1a1a1a; }
          .panel:last-child { border-left: none; border-top: 1px solid #1a1a1a; }
          .canvas-wrap { min-height: 400px; }
        }
      `}</style>
    </div>
  );
}
