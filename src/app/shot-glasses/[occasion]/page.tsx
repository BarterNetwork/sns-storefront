"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  calculateBreakdown,
  getPackagingQty,
  formatCents,
  getTierLabel,
  PACKAGING_LABELS,
  type GlassSize,
  type PackagingType,
  type PricingTier,
  type FlatConfig,
} from "@/lib/shot-glass-pricing";

interface Design {
  id: number;
  name: string;
  image_urls: string[];
  sort_order: number;
  shot_glass_occasions: { id: number; slug: string; name: string } | null;
}

interface ColorOption { id: number; type: string; name: string; hex: string; }

interface ConfigData {
  config: FlatConfig;
  tiers: PricingTier[];
  bowColors: ColorOption[];
  ribbonColors: ColorOption[];
}

type Step = "glass" | "personalization" | "packaging" | "decorations" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "glass",          label: "Glass"      },
  { id: "personalization",label: "Personal"   },
  { id: "packaging",      label: "Packaging"  },
  { id: "decorations",    label: "Decorations"},
  { id: "review",         label: "Review"     },
];

export default function OccasionPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.occasion as string;
  const { addItem, openCart } = useCart();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [occasionName, setOccasionName] = useState("");
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  // Configurator state
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [step, setStep] = useState<Step>("glass");

  // Glass
  const [glassSize, setGlassSize] = useState<GlassSize>("standard");
  const [glassQty, setGlassQty] = useState(1);

  // Double carrier — second design
  const [design2, setDesign2] = useState<Design | null>(null);
  const [showDesign2Picker, setShowDesign2Picker] = useState(false);

  // Personalization
  const [personalizationLines, setPersonalizationLines] = useState<string[]>([""]);
  const [photos, setPhotos] = useState<{ file: File; url: string; uploading: boolean; signedUrl?: string }[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);

  // Packaging
  const [packagingType, setPackagingType] = useState<PackagingType>("none");
  const [bowColor, setBowColor] = useState("");
  const [ribbonColor, setRibbonColor] = useState("");

  // Box decorations
  const [addBow, setAddBow] = useState(false);
  const [addRibbon, setAddRibbon] = useState(false);
  const [addUvSticker, setAddUvSticker] = useState(false);
  const [uvStickerText, setUvStickerText] = useState("");

  // Contact / submit
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/shot-glasses/designs?occasion=${slug}`).then(r => r.json()),
      fetch("/api/shot-glasses/config").then(r => r.json()),
    ]).then(([d, c]) => {
      const list: Design[] = d.data || [];
      setDesigns(list);
      if (list[0]?.shot_glass_occasions?.name) setOccasionName(list[0].shot_glass_occasions.name);
      setConfigData(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  const isBox = packagingType === "short_box" || packagingType === "tall_box";
  const packagingQty = getPackagingQty(packagingType, glassQty);

  const breakdown = configData
    ? calculateBreakdown({
        glassSize,
        glassQty,
        packagingType,
        addBow: addBow && isBox,
        addRibbon: addRibbon && isBox,
        addUvSticker: addUvSticker && isBox,
        tiers: configData.tiers,
        config: configData.config,
      })
    : null;

  // Compatible packaging for the selected glass size
  const compatiblePackaging = (p: PackagingType): boolean => {
    if (p === "tall_box"  && glassSize === "standard") return false;
    if (p === "short_box" && glassSize === "tall")     return false;
    return true;
  };

  const openConfigurator = useCallback((design: Design) => {
    setSelectedDesign(design);
    setSelectedImageIdx(0);
    setStep("glass");
    setGlassSize("standard");
    setGlassQty(1);
    setDesign2(null);
    setPackagingType("none");
    setAddBow(false);
    setAddRibbon(false);
    setAddUvSticker(false);
    setUvStickerText("");
    setBowColor("");
    setRibbonColor("");
    setPersonalizationLines([""]);
    setPhotos([]);
    setName(""); setEmail(""); setPhone(""); setNotes("");
    setSubmitError("");
    setPanelOpen(true);
  }, []);

  // Photo upload
  const handlePhotoAdd = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file);
      const entry = { file, url: preview, uploading: true };
      setPhotos(prev => [...prev, entry]);

      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/shot-glasses/upload-photo", { method: "POST", body: form });
        const data = await res.json();
        setPhotos(prev => prev.map(p =>
          p.url === preview ? { ...p, uploading: false, signedUrl: data.url } : p
        ));
      } catch {
        setPhotos(prev => prev.map(p =>
          p.url === preview ? { ...p, uploading: false } : p
        ));
      }
    }
  };

  const removePhoto = (url: string) => setPhotos(prev => prev.filter(p => p.url !== url));

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const canAdvance = (): boolean => {
    if (step === "review") return false;
    return true;
  };

  const skipDecorations = step === "packaging" && !isBox;

  const goNext = () => {
    const idx = STEPS.findIndex(s => s.id === step);
    if (idx >= STEPS.length - 1) return;
    const nextStep = STEPS[idx + 1].id;
    // Skip decorations step if no box
    if (nextStep === "decorations" && !isBox) {
      setStep("review");
    } else {
      setStep(nextStep);
    }
  };

  const goPrev = () => {
    const idx = STEPS.findIndex(s => s.id === step);
    if (idx <= 0) return;
    const prevStep = STEPS[idx - 1].id;
    if (prevStep === "decorations" && !isBox) {
      setStep("packaging");
    } else {
      setStep(prevStep);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedDesign || !breakdown) return;
    setSubmitting(true);
    setSubmitError("");

    const photoUrls = photos.map(p => p.signedUrl || p.url).filter(Boolean);

    // Server-side submit (saves order record)
    try {
      const res = await fetch("/api/shot-glasses/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion_slug: slug,
          design_id: selectedDesign.id,
          design_name: selectedDesign.name,
          design2_id: design2?.id ?? null,
          design2_name: design2?.name ?? null,
          glass_size: glassSize,
          glass_qty: glassQty,
          packaging_type: packagingType,
          add_bow: addBow && isBox,
          add_ribbon: addRibbon && isBox,
          add_uv_sticker: addUvSticker && isBox,
          bow_color: bowColor || null,
          ribbon_color: ribbonColor || null,
          uv_sticker_text: uvStickerText || null,
          photo_urls: photoUrls,
          personalization_lines: personalizationLines.filter(l => l.trim()),
          total_cents: breakdown.totalCents,
          customer_name: name.trim() || null,
          customer_email: email.trim().toLowerCase() || null,
          customer_phone: phone.trim() || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      // Add to cart
      const sku = `sg-${data.id}`;
      addItem({
        sku,
        styleId: 0,
        brandName: "Shot Glass",
        title: selectedDesign.name,
        styleName: `${glassSize === "tall" ? "Tall" : "Standard"} · ${occasionName}`,
        colorName: PACKAGING_LABELS[packagingType],
        sizeName:  `${glassQty} glass${glassQty !== 1 ? "es" : ""}`,
        price: breakdown.totalCents / 100,
        qty: 1,
        image: selectedDesign.image_urls?.[0] ?? null,
        shotGlass: {
          occasionSlug: slug,
          occasionName,
          designId: selectedDesign.id,
          designName: selectedDesign.name,
          design2Id: design2?.id,
          design2Name: design2?.name,
          glassSize,
          glassQty,
          packagingType,
          packagingQty,
          addBow: addBow && isBox,
          addRibbon: addRibbon && isBox,
          addUvSticker: addUvSticker && isBox,
          bowColor,
          ribbonColor,
          uvStickerText,
          personalizationLines: personalizationLines.filter(l => l.trim()),
          photoUrls,
          priceBreakdown: breakdown as unknown as Record<string, unknown>,
          totalCents: breakdown.totalCents,
          notes,
        },
      });
      setPanelOpen(false);
      openCart();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontFamily: "'DM Sans', sans-serif" }}>
        Loading collection…
      </div>
    );
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="header-inner">
          <button className="back-btn" onClick={() => router.push("/shot-glasses")}>← All Occasions</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="T-Shirt Depot & More" width={40} height={40} style={{ height: 40, width: 40, objectFit: "contain" }} />
        </div>
      </header>

      <section className="occ-hero">
        <div className="occ-hero-eyebrow">Personalized Shot Glasses</div>
        <h1 className="occ-hero-title">{occasionName || slug.replace(/-/g, " ")}</h1>
        <p className="occ-hero-sub">{designs.length} design{designs.length !== 1 ? "s" : ""} · Starting at $10 · Personalization included · Select a design to start</p>
      </section>

      <main className="main">
        {designs.length === 0 ? (
          <div className="empty">No designs available for this occasion yet.</div>
        ) : (
          <div className="designs-grid">
            {designs.map(d => (
              <div key={d.id} className="design-card" onClick={() => openConfigurator(d)}>
                <div className="design-img-wrap">
                  {d.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image_urls[0]} alt={d.name} className="design-img" />
                  ) : (
                    <div className="design-img-placeholder">🥃</div>
                  )}
                  {d.image_urls?.length > 1 && <span className="img-count">+{d.image_urls.length - 1}</span>}
                </div>
                <div className="design-info">
                  <span className="design-name">{d.name}</span>
                  <span className="design-price">from $10.00</span>
                  <button className="design-cta">Personalize →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Configurator Modal ── */}
      {panelOpen && selectedDesign && (
        <div className="panel-overlay" onClick={e => { if (e.target === e.currentTarget) setPanelOpen(false); }}>
          <div className="panel">

            {/* Left column — image */}
            <div className="panel-left">
              <div className="preview-img-wrap">
                {selectedDesign.image_urls?.[selectedImageIdx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedDesign.image_urls[selectedImageIdx]} alt={selectedDesign.name} className="preview-img" />
                ) : <div className="preview-placeholder">🥃</div>}
              </div>
              {selectedDesign.image_urls?.length > 1 && (
                <div className="preview-thumbs">
                  {selectedDesign.image_urls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className={`preview-thumb${i === selectedImageIdx ? " active" : ""}`} onClick={() => setSelectedImageIdx(i)} />
                  ))}
                </div>
              )}
              <div className="panel-design-name-left">{selectedDesign.name}</div>
            </div>

            {/* Right column — configuration */}
            <div className="panel-right">
              {/* Header */}
              <div className="panel-header">
                <div className="panel-eyebrow">Configure your order</div>
                <button className="panel-close" onClick={() => setPanelOpen(false)}>✕</button>
              </div>

              {/* Step nav */}
              <div className="step-nav">
                {STEPS.map((s, i) => {
                  const isDone = i < stepIndex;
                  const isSkipped = s.id === "decorations" && !isBox;
                  if (isSkipped) return null;
                  return (
                    <button key={s.id} className={`step-pill${step === s.id ? " active" : ""}${isDone ? " done" : ""}`} onClick={() => setStep(s.id)}>
                      {isDone ? "✓" : i + 1} {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Step content */}
              <div className="step-content">

              {/* ── STEP 1: Glass ── */}
              {step === "glass" && (
                <div className="step-section">
                  <h3 className="step-title">Glass Size & Quantity</h3>

                  <div className="option-group">
                    <div className="option-label">Size</div>
                    <div className="option-row">
                      <button className={`opt-btn${glassSize === "standard" ? " active" : ""}`} onClick={() => { setGlassSize("standard"); if (packagingType === "tall_box") setPackagingType("none"); }}>
                        Standard (1.5 oz)
                      </button>
                      <button className={`opt-btn${glassSize === "tall" ? " active" : ""}`} onClick={() => { setGlassSize("tall"); if (packagingType === "short_box") setPackagingType("none"); }}>
                        Tall (2 oz) <span className="opt-badge">+$2.00</span>
                      </button>
                    </div>
                  </div>

                  <div className="option-group">
                    <div className="option-label">How many glasses?</div>
                    <div className="qty-row">
                      <button className="qty-btn" onClick={() => setGlassQty(q => Math.max(1, q - 1))}>−</button>
                      <input className="qty-input" type="number" min={1} value={glassQty} onChange={e => setGlassQty(Math.max(1, parseInt(e.target.value) || 1))} />
                      <button className="qty-btn" onClick={() => setGlassQty(q => q + 1)}>+</button>
                    </div>
                    {configData && (
                      <div className="tier-label">
                        {getTierLabel(configData.tiers, "glass", glassQty) && (
                          <>Tier: {getTierLabel(configData.tiers, "glass", glassQty)} glasses · {formatCents((configData.config["tall_upgrade"] ?? 200) && glassSize === "tall" ? (configData.tiers.find(t => t.glass_type === "glass" && glassQty >= t.min_qty && (t.max_qty === null || glassQty <= t.max_qty))?.price_cents ?? 1000) + (configData.config["tall_upgrade"] ?? 200) : (configData.tiers.find(t => t.glass_type === "glass" && glassQty >= t.min_qty && (t.max_qty === null || glassQty <= t.max_qty))?.price_cents ?? 1000))}/glass</>
                        )}
                      </div>
                    )}
                    <div className="qty-presets">
                      {[1, 6, 12, 25, 50].map(n => (
                        <button key={n} className={`qty-preset${glassQty === n ? " active" : ""}`} onClick={() => setGlassQty(n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Personalization ── */}
              {step === "personalization" && (
                <div className="step-section">
                  <h3 className="step-title">Personalization</h3>
                  <p className="step-desc">Add names, dates, or messages for your glasses. Personalization is included in the price.</p>

                  <div className="option-group">
                    <div className="option-label">Text (names, dates, messages)</div>
                    {personalizationLines.map((line, i) => (
                      <div key={i} className="pline-row">
                        <input
                          className="text-input"
                          placeholder={i === 0 ? "e.g. Happy Birthday Sarah!" : `Line ${i + 1} (optional)`}
                          value={line}
                          onChange={e => setPersonalizationLines(prev => prev.map((l, j) => j === i ? e.target.value : l))}
                        />
                        {personalizationLines.length > 1 && (
                          <button className="remove-line-btn" onClick={() => setPersonalizationLines(prev => prev.filter((_, j) => j !== i))}>✕</button>
                        )}
                      </div>
                    ))}
                    {personalizationLines.length < 5 && (
                      <button className="add-line-btn" onClick={() => setPersonalizationLines(prev => [...prev, ""])}>+ Add another line</button>
                    )}
                  </div>

                  <div className="option-group">
                    <div className="option-label">Photos (optional)</div>
                    <p className="step-desc" style={{ marginTop: 0 }}>Upload photos to include on your glasses. JPEG or PNG, max 10 MB each.</p>
                    <div className="photo-grid">
                      {photos.map(p => (
                        <div key={p.url} className="photo-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" className="photo-img" />
                          {p.uploading && <div className="photo-uploading">↑</div>}
                          <button className="photo-remove" onClick={() => removePhoto(p.url)}>✕</button>
                        </div>
                      ))}
                      <button className="photo-add-btn" onClick={() => photoInput.current?.click()}>
                        <span style={{ fontSize: "1.5rem" }}>+</span>
                        <span style={{ fontSize: "0.72rem", color: "#555" }}>Add Photo</span>
                      </button>
                    </div>
                    <input
                      ref={photoInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: "none" }}
                      onChange={e => e.target.files && handlePhotoAdd(e.target.files)}
                    />
                  </div>

                  <div className="info-box">
                    If multiple glasses need different names or photos, list each in a separate line above or upload multiple photos.
                    We'll contact you to confirm all personalization details before production.
                  </div>
                </div>
              )}

              {/* ── STEP 3: Packaging ── */}
              {step === "packaging" && (
                <div className="step-section">
                  <h3 className="step-title">Packaging</h3>

                  <div className="option-col">
                    {(["none","single_carrier","double_carrier","short_box","tall_box"] as PackagingType[]).map(p => {
                      const incompatible = !compatiblePackaging(p);
                      const qty = getPackagingQty(p, glassQty);
                      const pricePerUnit = configData
                        ? configData.tiers.find(t => t.glass_type === p && qty >= t.min_qty && (t.max_qty === null || qty <= t.max_qty))?.price_cents ?? 0
                        : 0;
                      const tierTotal = pricePerUnit * qty;

                      const noteMap: Record<PackagingType, string> = {
                        none:            "",
                        single_carrier:  `Holds 1 glass · ${qty} carrier${qty !== 1 ? "s" : ""}`,
                        double_carrier:  `Holds 2 glasses · ${qty} carrier${qty !== 1 ? "s" : ""}`,
                        short_box:       `Standard glass only · ${qty} box${qty !== 1 ? "es" : ""}`,
                        tall_box:        `Tall glass only · ${qty} box${qty !== 1 ? "es" : ""}`,
                      };

                      return (
                        <button
                          key={p}
                          className={`opt-btn-wide${packagingType === p ? " active" : ""}${incompatible ? " disabled" : ""}`}
                          disabled={incompatible}
                          onClick={() => !incompatible && setPackagingType(p)}
                        >
                          <div className="opt-wide-left">
                            <span className="opt-wide-name">{PACKAGING_LABELS[p]}</span>
                            {noteMap[p] && <span className="opt-note">{noteMap[p]}</span>}
                          </div>
                          {p === "none"
                            ? <span className="opt-badge-muted">Free</span>
                            : <span className="opt-badge">{formatCents(tierTotal)}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Double carrier — select second design */}
                  {packagingType === "double_carrier" && (
                    <div className="option-group" style={{ marginTop: "1.25rem" }}>
                      <div className="option-label">Second glass design (optional)</div>
                      <p className="step-desc" style={{ marginTop: 0 }}>A double carrier holds two glasses which can have different designs.</p>
                      {design2 ? (
                        <div className="design2-row">
                          <span className="design2-name">{design2.name}</span>
                          <button className="btn-ghost-sm" onClick={() => setDesign2(null)}>Change</button>
                        </div>
                      ) : (
                        <button className="btn-ghost-sm" onClick={() => setShowDesign2Picker(true)}>Choose second design →</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Box Decorations ── */}
              {step === "decorations" && isBox && (
                <div className="step-section">
                  <h3 className="step-title">Gift Box Decorations</h3>
                  <p className="step-desc">Each option is charged per box. Mix and match.</p>

                  <div className="option-col">
                    <label className="deco-row">
                      <input type="checkbox" checked={addBow} onChange={e => setAddBow(e.target.checked)} />
                      <span className="deco-label">Add Bow</span>
                      <span className="opt-badge">+$0.50/box</span>
                    </label>
                    {addBow && (
                      <div style={{ marginLeft: "1.5rem" }}>
                        {configData?.bowColors && configData.bowColors.length > 0 && (
                          <div className="color-swatches">
                            {configData.bowColors.map(c => (
                              <button key={c.id} title={c.name} className={`swatch${bowColor === c.name ? " active" : ""}`} style={{ background: c.hex }} onClick={() => setBowColor(c.name)} />
                            ))}
                          </div>
                        )}
                        <input
                          className="text-input"
                          style={{ marginTop: "0.5rem" }}
                          placeholder="Or type a color (e.g. gold, hot pink)"
                          value={bowColor}
                          onChange={e => setBowColor(e.target.value)}
                        />
                      </div>
                    )}

                    <label className="deco-row">
                      <input type="checkbox" checked={addRibbon} onChange={e => setAddRibbon(e.target.checked)} />
                      <span className="deco-label">Add Ribbon</span>
                      <span className="opt-badge">+$1.00/box</span>
                    </label>
                    {addRibbon && (
                      <div style={{ marginLeft: "1.5rem" }}>
                        {configData?.ribbonColors && configData.ribbonColors.length > 0 && (
                          <div className="color-swatches">
                            {configData.ribbonColors.map(c => (
                              <button key={c.id} title={c.name} className={`swatch${ribbonColor === c.name ? " active" : ""}`} style={{ background: c.hex }} onClick={() => setRibbonColor(c.name)} />
                            ))}
                          </div>
                        )}
                        <input
                          className="text-input"
                          style={{ marginTop: "0.5rem" }}
                          placeholder="Or type a color (e.g. gold, hot pink)"
                          value={ribbonColor}
                          onChange={e => setRibbonColor(e.target.value)}
                        />
                      </div>
                    )}

                    <label className="deco-row">
                      <input type="checkbox" checked={addUvSticker} onChange={e => setAddUvSticker(e.target.checked)} />
                      <span className="deco-label">Add Personalization</span>
                      <span className="opt-badge">+$1.50/box</span>
                    </label>
                    {addUvSticker && (
                      <div style={{ marginLeft: "1.5rem" }}>
                        <input
                          className="text-input"
                          placeholder="Name, message, or 'same design as glass'"
                          value={uvStickerText}
                          onChange={e => setUvStickerText(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {!addBow && !addRibbon && !addUvSticker && (
                    <div className="info-box" style={{ marginTop: "1rem" }}>No decorations selected — your gift box will come without extras.</div>
                  )}
                </div>
              )}

              {/* ── STEP 5: Review ── */}
              {step === "review" && breakdown && (
                <div className="step-section">
                  <h3 className="step-title">Review & Add to Cart</h3>

                  <div className="breakdown">
                    <div className="breakdown-row">
                      <span>{glassQty}× {glassSize} glass{glassQty !== 1 ? "es" : ""} @ {formatCents(breakdown.glassPricePerUnit)}</span>
                      <span>{formatCents(breakdown.glassTotalCents)}</span>
                    </div>
                    {breakdown.packagingTotalCents > 0 && (
                      <div className="breakdown-row">
                        <span>{breakdown.packagingQty}× {PACKAGING_LABELS[packagingType]} @ {formatCents(breakdown.packagingPricePerUnit)}</span>
                        <span>{formatCents(breakdown.packagingTotalCents)}</span>
                      </div>
                    )}
                    {breakdown.bowCents > 0 && (
                      <div className="breakdown-row">
                        <span>Bow × {packagingQty}</span>
                        <span>{formatCents(breakdown.bowCents)}</span>
                      </div>
                    )}
                    {breakdown.ribbonCents > 0 && (
                      <div className="breakdown-row">
                        <span>Ribbon × {packagingQty}</span>
                        <span>{formatCents(breakdown.ribbonCents)}</span>
                      </div>
                    )}
                    {breakdown.uvStickerCents > 0 && (
                      <div className="breakdown-row">
                        <span>UV Sticker × {packagingQty}</span>
                        <span>{formatCents(breakdown.uvStickerCents)}</span>
                      </div>
                    )}
                    <div className="breakdown-total">
                      <span>Total</span>
                      <span>{formatCents(breakdown.totalCents)}</span>
                    </div>
                  </div>

                  <div className="option-group">
                    <div className="option-label">Your contact info</div>
                    <input className="text-input" placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} />
                    <input className="text-input" type="email" placeholder="Email address *" value={email} onChange={e => setEmail(e.target.value)} />
                    <input className="text-input" type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
                    <textarea className="text-input" rows={2} placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>

                  <p className="disclaimer">
                    Adding to cart submits an inquiry. We'll confirm all personalization details with you before production.
                    Payment is arranged via Barter Bucks.
                  </p>

                  {submitError && <p className="field-error">{submitError}</p>}

                  <button
                    className="btn-gold submit-btn"
                    disabled={submitting || !name.trim() || !email.trim()}
                    onClick={handleAddToCart}
                  >
                    {submitting ? "Adding…" : `Add to Cart · ${formatCents(breakdown.totalCents)}`}
                  </button>
                </div>
              )}
            </div>

              {/* Footer */}
              <div className="panel-footer">
                <div className="footer-price">
                  {breakdown && (
                    <>
                      <span className="price-total">{formatCents(breakdown.totalCents)}</span>
                      <span className="price-qty">for {glassQty} glass{glassQty !== 1 ? "es" : ""}</span>
                    </>
                  )}
                </div>
                <div className="footer-nav">
                  {stepIndex > 0 && <button className="btn-ghost" onClick={goPrev}>← Back</button>}
                  {step !== "review" && (
                    <button className="btn-gold" disabled={!canAdvance()} onClick={goNext}>Next →</button>
                  )}
                </div>
              </div>
            </div>{/* end panel-right */}
          </div>
        </div>
      )}

      {/* Design 2 picker modal */}
      {showDesign2Picker && (
        <div className="panel-overlay" onClick={() => setShowDesign2Picker(false)}>
          <div className="d2-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "1rem 1.25rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e1e", flexShrink: 0 }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f0ede8" }}>Choose Second Design</span>
              <button className="panel-close" onClick={() => setShowDesign2Picker(false)}>✕</button>
            </div>
            <div style={{ overflow: "auto", flex: 1, padding: "1rem 1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem" }}>
                {designs.map(d => (
                  <button key={d.id} className="design2-pick-btn" onClick={() => { setDesign2(d); setShowDesign2Picker(false); }}>
                    {d.image_urls?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.image_urls[0]} alt={d.name} style={{ width: "100%", aspectRatio: "1", objectFit: "contain", background: "#161616", borderRadius: "6px" }} />
                    )}
                    <span style={{ fontSize: "0.72rem", color: "#888", display: "block", marginTop: "0.3rem" }}>{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .d2-modal { background: #111; border: 1px solid #222; border-radius: 12px; width: min(560px, 96vw); max-height: 70vh; display: flex; flex-direction: column; overflow: hidden; }
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }
        .site-header { border-bottom: 1px solid #1a1a1a; padding: 0.9rem 2rem; }
        .header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
        .back-btn { background: none; border: 1px solid #2a2a2a; color: #888; font-size: 0.8rem; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .back-btn:hover { border-color: #e8c97e; color: #e8c97e; }

        .occ-hero { padding: 2.5rem 2rem 1.5rem; border-bottom: 1px solid #161616; max-width: 1200px; margin: 0 auto; }
        .occ-hero-eyebrow { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: #e8c97e; margin-bottom: 0.4rem; font-weight: 600; }
        .occ-hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 4vw, 3rem); letter-spacing: 0.04em; margin: 0 0 0.4rem; line-height: 1; text-transform: capitalize; }
        .occ-hero-sub { font-size: 0.82rem; color: #aaa; margin: 0; }

        .main { max-width: 1200px; margin: 0 auto; padding: 2rem 2rem 4rem; }
        .designs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
        .empty { text-align: center; padding: 4rem; color: #555; font-size: 0.9rem; }

        .design-card { background: #111; border: 1px solid #1e1e1e; border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color 0.2s, transform 0.15s; }
        .design-card:hover { border-color: #e8c97e55; transform: translateY(-2px); }
        .design-img-wrap { aspect-ratio: 1; overflow: hidden; background: #161616; display: flex; align-items: center; justify-content: center; position: relative; }
        .design-img { width: 100%; height: 100%; object-fit: contain; }
        .design-img-placeholder { font-size: 2.5rem; }
        .img-count { position: absolute; bottom: 6px; right: 8px; background: #000a; color: #ccc; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; }
        .design-info { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .design-name { font-size: 0.88rem; font-weight: 600; }
        .design-price { font-size: 0.72rem; color: #e8c97e; }
        .design-cta { background: none; border: 1px solid #2a2a2a; color: #888; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 5px; cursor: pointer; font-family: inherit; margin-top: 0.3rem; transition: all 0.2s; text-align: left; }
        .design-card:hover .design-cta { border-color: #e8c97e55; color: #e8c97e; }

        /* Modal */
        .panel-overlay { position: fixed; inset: 0; background: #000d; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .panel { background: #111; border: 1px solid #222; border-radius: 14px; width: min(900px, 100%); height: min(640px, calc(100vh - 48px)); display: flex; flex-direction: row; overflow: hidden; }

        /* Left — image */
        .panel-left { width: 300px; flex-shrink: 0; background: #0d0d0d; border-right: 1px solid #1e1e1e; display: flex; flex-direction: column; padding: 1.25rem; gap: 0.75rem; }
        .preview-img-wrap { flex: 1; background: #161616; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .preview-img { width: 100%; height: 100%; object-fit: contain; }
        .preview-placeholder { font-size: 3rem; }
        .preview-thumbs { display: flex; gap: 0.4rem; overflow-x: auto; flex-shrink: 0; }
        .preview-thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 5px; border: 2px solid transparent; cursor: pointer; opacity: 0.55; flex-shrink: 0; }
        .preview-thumb.active { border-color: #e8c97e; opacity: 1; }
        .panel-design-name-left { font-size: 0.8rem; font-weight: 600; color: #bbb; line-height: 1.4; flex-shrink: 0; }

        /* Right — config */
        .panel-right { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 1rem 1.25rem 0.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-shrink: 0; border-bottom: 1px solid #1a1a1a; }
        .panel-eyebrow { font-size: 0.68rem; letter-spacing: 0.15em; text-transform: uppercase; color: #e8c97e; font-weight: 600; }
        .panel-close { background: none; border: 1px solid #2a2a2a; color: #666; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; flex-shrink: 0; }
        .panel-close:hover { border-color: #555; color: #ccc; }

        .step-nav { display: flex; gap: 0.3rem; padding: 0.75rem 1.25rem; overflow-x: auto; flex-shrink: 0; border-bottom: 1px solid #1a1a1a; }
        .step-pill { background: none; border: 1px solid #333; color: #888; font-size: 0.72rem; padding: 0.3rem 0.8rem; border-radius: 20px; cursor: pointer; white-space: nowrap; font-family: inherit; transition: all 0.2s; }
        .step-pill.active { border-color: #e8c97e; color: #e8c97e; background: #1a1a0a; }
        .step-pill.done { border-color: #3a3a2a; color: #aaa; }

        .step-content { flex: 1; padding: 0 1.25rem; overflow-y: auto; }
        .step-section { padding-bottom: 1.25rem; }
        .step-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 0.04em; margin: 0.75rem 0 0.5rem; color: #f0ede8; }
        .step-desc { font-size: 0.8rem; color: #aaa; line-height: 1.6; margin: 0 0 1rem; }

        .option-group { margin-bottom: 1.1rem; }
        .option-label { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: #bbb; margin-bottom: 0.5rem; font-weight: 600; }
        .option-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .option-col { display: flex; flex-direction: column; gap: 0.4rem; }

        .opt-btn { background: #1a1a1a; border: 1px solid #333; color: #ccc; font-size: 0.82rem; padding: 0.5rem 0.9rem; border-radius: 7px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .opt-btn.active { border-color: #e8c97e; color: #e8c97e; background: #1e1e0a; }
        .opt-btn:hover:not(.active) { border-color: #555; color: #f0ede8; }

        .opt-btn-wide { background: #1a1a1a; border: 1px solid #333; color: #ccc; font-size: 0.82rem; padding: 0.65rem 0.9rem; border-radius: 7px; cursor: pointer; font-family: inherit; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; text-align: left; }
        .opt-btn-wide.active { border-color: #e8c97e; color: #e8c97e; background: #1e1e0a; }
        .opt-btn-wide:hover:not(.active):not(.disabled) { border-color: #555; color: #f0ede8; }
        .opt-btn-wide.disabled { opacity: 0.4; cursor: not-allowed; }
        .opt-wide-left { display: flex; flex-direction: column; gap: 0.15rem; }
        .opt-wide-name { font-size: 0.84rem; }
        .opt-note { font-size: 0.72rem; color: #999; }
        .opt-badge { background: #2a1a00; color: #e8c97e; font-size: 0.65rem; padding: 1px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
        .opt-badge-muted { background: #1e1e1e; color: #555; font-size: 0.65rem; padding: 1px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }

        .deco-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0; border-bottom: 1px solid #252525; cursor: pointer; }
        .deco-label { flex: 1; font-size: 0.85rem; color: #e0ddd8; }

        .color-swatches { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0 0.75rem; }
        .swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
        .swatch.active { border-color: #e8c97e; transform: scale(1.15); }

        .text-input { width: 100%; background: #1a1a1a; border: 1px solid #333; color: #f0ede8; font-family: inherit; font-size: 0.85rem; padding: 0.6rem 0.8rem; border-radius: 7px; outline: none; margin-bottom: 0.5rem; box-sizing: border-box; resize: vertical; }
        .text-input:focus { border-color: #e8c97e77; }
        .text-input::placeholder { color: #666; }

        .pline-row { display: flex; gap: 0.4rem; align-items: flex-start; }
        .pline-row .text-input { margin-bottom: 0.4rem; }
        .remove-line-btn { background: none; border: 1px solid #2a2a2a; color: #555; font-size: 0.75rem; padding: 0.3rem 0.5rem; border-radius: 5px; cursor: pointer; flex-shrink: 0; margin-top: 2px; }
        .remove-line-btn:hover { color: #c87e7e; border-color: #c87e7e44; }
        .add-line-btn { background: none; border: 1px dashed #2a2a2a; color: #555; font-size: 0.78rem; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .add-line-btn:hover { border-color: #e8c97e44; color: #e8c97e; }

        .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 0.5rem; margin-top: 0.5rem; }
        .photo-thumb { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: #161616; border: 1px solid #2a2a2a; }
        .photo-img { width: 100%; height: 100%; object-fit: cover; }
        .photo-uploading { position: absolute; inset: 0; background: #000a; display: flex; align-items: center; justify-content: center; color: #e8c97e; font-size: 1rem; }
        .photo-remove { position: absolute; top: 3px; right: 3px; background: #000a; border: none; color: #ccc; border-radius: 50%; width: 18px; height: 18px; font-size: 0.6rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .photo-add-btn { aspect-ratio: 1; background: #161616; border: 1px dashed #2a2a2a; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; cursor: pointer; color: #555; font-family: inherit; transition: all 0.2s; }
        .photo-add-btn:hover { border-color: #e8c97e44; color: #e8c97e; }

        .qty-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; }
        .qty-btn { background: #1e1e1e; border: 1px solid #2a2a2a; color: #ccc; width: 36px; height: 36px; border-radius: 7px; cursor: pointer; font-size: 1.1rem; transition: all 0.15s; }
        .qty-btn:hover { border-color: #444; }
        .qty-input { background: #161616; border: 1px solid #2a2a2a; color: #f0ede8; font-size: 1rem; text-align: center; width: 70px; height: 36px; border-radius: 7px; font-family: inherit; outline: none; }
        .qty-input:focus { border-color: #e8c97e55; }
        .tier-label { font-size: 0.75rem; color: #e8c97e; margin-bottom: 0.9rem; min-height: 1.1rem; }
        .qty-presets { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .qty-preset { background: #1a1a1a; border: 1px solid #333; color: #aaa; font-size: 0.78rem; padding: 0.3rem 0.7rem; border-radius: 5px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .qty-preset.active { border-color: #e8c97e; color: #e8c97e; background: #1e1e0a; }
        .qty-preset:hover:not(.active) { border-color: #555; color: #f0ede8; }

        .info-box { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.8rem; color: #bbb; line-height: 1.6; }

        .design2-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; background: #161616; border: 1px solid #2a2a2a; border-radius: 7px; }
        .design2-name { font-size: 0.82rem; color: #ccc; flex: 1; }
        .btn-ghost-sm { background: none; border: 1px solid #2a2a2a; color: #888; font-size: 0.75rem; padding: 0.3rem 0.7rem; border-radius: 5px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-ghost-sm:hover { border-color: #444; color: #ccc; }
        .design2-pick-btn { background: none; border: none; cursor: pointer; text-align: left; padding: 0; }

        .breakdown { background: #161616; border: 1px solid #1e1e1e; border-radius: 8px; overflow: hidden; margin-bottom: 1.25rem; }
        .breakdown-row { display: flex; justify-content: space-between; padding: 0.5rem 0.9rem; font-size: 0.8rem; color: #ccc; border-bottom: 1px solid #222; }
        .breakdown-total { display: flex; justify-content: space-between; padding: 0.65rem 0.9rem; font-size: 0.9rem; font-weight: 600; color: #f0ede8; }

        .disclaimer { font-size: 0.75rem; color: #999; line-height: 1.5; margin-bottom: 1rem; }
        .field-error { font-size: 0.75rem; color: #e57373; margin: 0.2rem 0 0.5rem; }

        .btn-gold { background: #e8c97e; color: #0a0a0a; font-size: 0.85rem; font-weight: 700; font-family: inherit; padding: 0.65rem 1.25rem; border: none; border-radius: 7px; cursor: pointer; transition: background 0.2s; }
        .btn-gold:hover:not(:disabled) { background: #f0d88e; }
        .btn-gold:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-ghost { background: none; border: 1px solid #2a2a2a; color: #888; font-size: 0.85rem; font-family: inherit; padding: 0.65rem 1.25rem; border-radius: 7px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #444; color: #ccc; }
        .submit-btn { width: 100%; }

        .panel-footer { flex-shrink: 0; background: #111; border-top: 1px solid #1e1e1e; padding: 0.9rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .footer-price { display: flex; flex-direction: column; gap: 0.1rem; }
        .price-total { font-size: 1.1rem; font-weight: 700; color: #e8c97e; }
        .price-qty { font-size: 0.72rem; color: #999; }
        .footer-nav { display: flex; gap: 0.5rem; }

        @media (max-width: 700px) {
          .panel-overlay { align-items: flex-end; padding: 0; }
          .panel { width: 100vw; height: 92vh; border-radius: 14px 14px 0 0; border-bottom: none; flex-direction: column; }
          .panel-left { width: 100%; flex-direction: row; padding: 0.75rem 1rem; border-right: none; border-bottom: 1px solid #1e1e1e; gap: 0.75rem; height: auto; }
          .preview-img-wrap { width: 80px; height: 80px; flex: none; border-radius: 8px; }
          .panel-design-name-left { font-size: 0.82rem; color: #ccc; align-self: center; }
          .preview-thumbs { display: none; }
          .designs-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
          .main { padding: 1.5rem 1rem 3rem; }
          .occ-hero { padding: 1.5rem 1rem 1rem; }
        }
      `}</style>
    </div>
  );
}
