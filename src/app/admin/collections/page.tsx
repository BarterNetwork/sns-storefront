"use client";

import { useEffect, useMemo, useState } from "react";
import DesignMockup from "@/components/DesignMockup";
import {
  Collection, CollectionProduct, DEFAULT_PLACEMENT, Placement, SLEEVE_SIDES, SleeveMode, SleeveSide,
  basePrintFee, imageSrc, printFeeFor, sleeveArt, sleeveFee,
} from "@/lib/collections";
import { PRINT_PRICES } from "@/lib/pricing";
import type { StyleColor } from "@/lib/style-detail";

interface StyleInfo { style: any; colors: StyleColor[] }
interface SearchHit { style_id: number; brand_name: string; style_name: string; title: string | null; style_image: string | null; min_price: number | null }
interface GalleryDesign { id: string; name: string; category: string; url: string }

// Common labels so customers see "Tee / Hoodie" instead of long catalog titles.
const LABEL_HINTS = ["Tee", "Long Sleeve", "Hoodie", "Crewneck", "Tank", "Youth Tee", "Zip Hoodie", "Polo", "Hat"];

export default function AdminCollectionsPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pwError, setPwError] = useState("");

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Draft of the selected collection (edited locally, saved with one button)
  const [draft, setDraft] = useState<Collection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Style details (colors/photos) cache, keyed by style id
  const [styleInfo, setStyleInfo] = useState<Record<number, StyleInfo | "loading" | "error">>({});
  const [previewColor, setPreviewColor] = useState<Record<number, string>>({});

  // New collection form
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [gallery, setGallery] = useState<GalleryDesign[]>([]);
  const [galleryFilter, setGalleryFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  // Sleeve art picker
  const [sleevePicker, setSleevePicker] = useState<SleeveSide | null>(null);
  const [sleeveUploading, setSleeveUploading] = useState<SleeveSide | null>(null);

  // Style search
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const pw = () => password || (typeof window !== "undefined" ? sessionStorage.getItem("admin_pw") : "") || "";

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) { setPassword(saved); setAuthed(true); }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving with unsaved edits
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const login = async () => {
    const res = await fetch("/api/admin/collections", { headers: { "x-admin-password": password } });
    if (res.status === 401) { setPwError("Incorrect password"); return; }
    sessionStorage.setItem("admin_pw", password);
    setAuthed(true); setPwError("");
  };

  const load = async (selectAfter?: string) => {
    setLoading(true);
    const res = await fetch("/api/admin/collections", { headers: { "x-admin-password": pw() } });
    const json = await res.json();
    if (!res.ok) {
      setSaveMsg(json.error?.includes("design_collections")
        ? "The collections tables don't exist yet — run supabase/migrations/005_design_collections.sql in the Supabase SQL editor."
        : json.error || "Failed to load");
      setLoading(false);
      return;
    }
    const list: Collection[] = json.data || [];
    setCollections(list);
    setLoading(false);
    const id = selectAfter ?? selectedId;
    const pick = list.find(c => c.id === id);
    if (pick) selectCollection(pick, true);
  };

  const selectCollection = (c: Collection, force = false) => {
    if (!force && dirty && !confirm("You have unsaved changes. Discard them?")) return;
    setSelectedId(c.id);
    setDraft(JSON.parse(JSON.stringify(c)));
    setDirty(false);
    setSaveMsg("");
    c.products.forEach(p => ensureStyle(p.style_id));
  };

  const ensureStyle = async (styleId: number) => {
    setStyleInfo(prev => {
      if (prev[styleId]) return prev;
      fetch(`/api/products/${styleId}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => setStyleInfo(p => ({ ...p, [styleId]: { style: d.style, colors: d.colors } })))
        .catch(() => setStyleInfo(p => ({ ...p, [styleId]: "error" })));
      return { ...prev, [styleId]: "loading" };
    });
  };

  const edit = (patch: Partial<Collection>) => {
    setDraft(d => d ? { ...d, ...patch } : d);
    setDirty(true); setSaveMsg("");
  };

  const editProduct = (styleId: number, patch: Partial<CollectionProduct>) => {
    setDraft(d => d ? { ...d, products: d.products.map(p => p.style_id === styleId ? { ...p, ...patch } : p) } : d);
    setDirty(true); setSaveMsg("");
  };

  const moveProduct = (idx: number, dir: -1 | 1) => {
    setDraft(d => {
      if (!d) return d;
      const list = [...d.products];
      const j = idx + dir;
      if (j < 0 || j >= list.length) return d;
      [list[idx], list[j]] = [list[j], list[idx]];
      return { ...d, products: list };
    });
    setDirty(true);
  };

  const removeProduct = (styleId: number) => {
    setDraft(d => d ? { ...d, products: d.products.filter(p => p.style_id !== styleId) } : d);
    setDirty(true);
  };

  const addProduct = (hit: SearchHit) => {
    if (!draft || draft.products.some(p => p.style_id === hit.style_id)) return;
    const title = `${hit.title || ""} ${hit.style_name}`.toLowerCase();
    const guess =
      /zip/.test(title) && /hood/.test(title) ? "Zip Hoodie" :
      /hood/.test(title) ? "Hoodie" :
      /crew/.test(title) && /sweat|fleece/.test(title) ? "Crewneck" :
      /long sleeve|long-sleeve|\bls\b/.test(title) ? "Long Sleeve" :
      /tank/.test(title) ? "Tank" :
      /youth/.test(title) ? "Youth Tee" :
      /polo/.test(title) ? "Polo" :
      /cap|hat|beanie/.test(title) ? "Hat" :
      /tee|t-shirt|shirt/.test(title) ? "Tee" : "";
    // Start from the previous product's placement — usually close for similar garments
    const last = draft.products[draft.products.length - 1];
    edit({
      products: [...draft.products, {
        style_id: hit.style_id,
        label: guess || null,
        print_location: last?.print_location ?? "Front",
        placement: last ? { ...last.placement } : { ...DEFAULT_PLACEMENT },
        print_fee: null,
        default_color: null,
        allowed_colors: null,
        left_sleeve: last?.left_sleeve ?? "off",
        right_sleeve: last?.right_sleeve ?? "off",
        sort_order: draft.products.length,
      }],
    });
    ensureStyle(hit.style_id);
  };

  const save = async () => {
    if (!draft) return;
    const noColors = draft.products.find(p => p.allowed_colors !== null && p.allowed_colors.length === 0);
    if (noColors) {
      const info = styleInfo[noColors.style_id];
      const name = noColors.label || (info && typeof info === "object" ? info.style?.title : "a product");
      setSaveMsg(`Pick at least one color for ${name}, or switch it back to "All colors".`);
      return;
    }
    setSaving(true); setSaveMsg("");
    const res = await fetch(`/api/admin/collections/${draft.id}`, {
      method: "PUT",
      headers: { "x-admin-password": pw(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name, slug: draft.slug, description: draft.description ?? "",
        active: draft.active, products: draft.products,
        left_sleeve_url: draft.left_sleeve_url, right_sleeve_url: draft.right_sleeve_url,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveMsg(json.error || "Save failed"); return; }
    setDirty(false);
    setSaveMsg("Saved");
    setCollections(list => list.map(c => c.id === json.data.id ? json.data : c));
    setDraft(JSON.parse(JSON.stringify(json.data)));
  };

  const remove = async () => {
    if (!draft) return;
    if (!confirm(`Delete "${draft.name}"? Customers will no longer see it. This can't be undone.`)) return;
    const res = await fetch(`/api/admin/collections/${draft.id}`, { method: "DELETE", headers: { "x-admin-password": pw() } });
    if (!res.ok) { setSaveMsg((await res.json()).error || "Delete failed"); return; }
    setCollections(list => list.filter(c => c.id !== draft.id));
    setDraft(null); setSelectedId(null); setDirty(false);
  };

  const loadGallery = async () => {
    if (gallery.length) return;
    const res = await fetch("/api/admin/gallery", { headers: { "x-admin-password": pw() } });
    if (res.ok) setGallery((await res.json()).data || []);
  };

  const openNew = async () => {
    if (dirty && !confirm("You have unsaved changes. Discard them?")) return;
    setShowNew(true); setDirty(false); setDraft(null); setSelectedId(null);
    loadGallery();
  };

  const setSleeveUrl = (side: SleeveSide, url: string | null) =>
    edit(side === "left" ? { left_sleeve_url: url } : { right_sleeve_url: url });

  const uploadSleeve = async (side: SleeveSide, file: File) => {
    setSleeveUploading(side);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/collections/upload", { method: "POST", headers: { "x-admin-password": pw() }, body: form });
    const json = await res.json();
    setSleeveUploading(null);
    if (!res.ok) { setSaveMsg(json.error || "Upload failed"); return; }
    setSleeveUrl(side, json.url);
  };

  const toggleAllowedColor = (p: CollectionProduct, colorName: string, allNames: string[]) => {
    const current = new Set(p.allowed_colors ?? []);
    if (current.has(colorName)) current.delete(colorName); else current.add(colorName);
    const list = allNames.filter(n => current.has(n)); // keep catalog order
    const patch: Partial<CollectionProduct> = { allowed_colors: list };
    // Keep "color shown first" valid
    if (p.default_color && list.length && !current.has(p.default_color)) patch.default_color = list[0];
    if (list.length === 1) patch.default_color = list[0];
    editProduct(p.style_id, patch);
  };

  const create = async () => {
    setCreateErr("");
    if (!newName.trim()) { setCreateErr("Give the design a name."); return; }
    if (!newFile && !newGalleryUrl) { setCreateErr("Upload the design image or pick one from your gallery."); return; }
    setCreating(true);
    const form = new FormData();
    form.append("name", newName);
    form.append("description", newDesc);
    if (newFile) form.append("file", newFile);
    else form.append("design_url", newGalleryUrl);
    const res = await fetch("/api/admin/collections", { method: "POST", headers: { "x-admin-password": pw() }, body: form });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateErr(json.error || "Could not create"); return; }
    setShowNew(false); setNewName(""); setNewDesc(""); setNewFile(null); setNewGalleryUrl("");
    setCollections(list => [json.data, ...list]);
    selectCollection(json.data, true);
  };

  // Debounced style search
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=12`);
      const json = await res.json();
      setHits(json.data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredGallery = useMemo(() => {
    const f = galleryFilter.toLowerCase();
    return gallery.filter(g => !f || g.name.toLowerCase().includes(f) || g.category.toLowerCase().includes(f)).slice(0, 60);
  }, [gallery, galleryFilter]);

  const newPreview = useMemo(() => newFile ? URL.createObjectURL(newFile) : newGalleryUrl, [newFile, newGalleryUrl]);

  // ── Login ──
  if (!authed) {
    return (
      <div className="login">
        <h1>Design Collections</h1>
        <input type="password" placeholder="Admin password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
        <button onClick={login}>Log in</button>
        {pwError && <p className="err">{pwError}</p>}
        <style jsx>{`
          .login { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }
          h1 { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; font-weight: 400; font-size: 2rem; margin: 0 0 0.5rem; }
          input { width: 260px; padding: 0.65rem 0.8rem; background: #111; border: 1px solid #2a2a2a; border-radius: 8px; color: #f0ede8; font-family: inherit; }
          button { width: 260px; padding: 0.65rem; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; }
          .err { color: #c87e7e; font-size: 0.8rem; margin: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Design Collections</h1>
          <p className="sub">One design on several products. Customers pick the product, then color and sizes, on one page.</p>
        </div>
        <nav className="top-links">
          <a href="/admin/gallery">Gallery admin</a>
          <a href="/collections" target="_blank" rel="noreferrer">View shop page ↗</a>
        </nav>
      </header>

      <div className="layout">
        {/* ── Sidebar list ── */}
        <aside className="side">
          <button className="new-btn" onClick={openNew}>+ New collection</button>
          {loading && <p className="muted">Loading…</p>}
          {!loading && collections.length === 0 && !saveMsg && <p className="muted">No collections yet.</p>}
          {collections.map(c => (
            <button key={c.id} className={`side-item ${c.id === selectedId ? "active" : ""}`} onClick={() => selectCollection(c)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.design_url} alt="" className="side-thumb" />
              <span className="side-text">
                <span className="side-name">{c.name}</span>
                <span className="side-meta">
                  <span className={`dot ${c.active ? "on" : ""}`} />{c.active ? "Live" : "Hidden"} · {c.products.length} product{c.products.length === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          ))}
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {!draft && !showNew && (
            <div className="empty">
              {saveMsg ? <p className="err">{saveMsg}</p> : <p>Pick a collection on the left, or create a new one.</p>}
            </div>
          )}

          {showNew && (
            <section className="card">
              <h2>New collection</h2>
              <label className="field">
                <span>Design name</span>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Boley Pride 2026" />
              </label>
              <label className="field">
                <span>Description (optional)</span>
                <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Shown on the product page" />
              </label>

              <div className="field">
                <span>Design image</span>
                <div className="new-design">
                  <div className="new-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {newPreview ? <img src={newPreview} alt="" /> : <span className="muted">No image yet</span>}
                  </div>
                  <div className="new-design-opts">
                    <label className="upload-btn">
                      Upload PNG
                      <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) { setNewFile(f); setNewGalleryUrl(""); } }} />
                    </label>
                    <p className="hint">Transparent PNG works best. Or pick one from your gallery:</p>
                    <input className="small-input" placeholder="Filter gallery…" value={galleryFilter} onChange={e => setGalleryFilter(e.target.value)} />
                    <div className="gallery-grid">
                      {filteredGallery.map(g => (
                        <button key={g.id} title={g.name}
                          className={`gallery-item ${newGalleryUrl === g.url && !newFile ? "picked" : ""}`}
                          onClick={() => { setNewGalleryUrl(g.url); setNewFile(null); if (!newName) setNewName(g.name); }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={g.url} alt={g.name} loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {createErr && <p className="err">{createErr}</p>}
              <div className="row-end">
                <button className="ghost" onClick={() => setShowNew(false)}>Cancel</button>
                <button className="primary" onClick={create} disabled={creating}>{creating ? "Creating…" : "Create & add products →"}</button>
              </div>
            </section>
          )}

          {draft && (
            <>
              {/* Details */}
              <section className="card details">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.design_url} alt="" className="detail-design" />
                <div className="detail-fields">
                  <label className="field">
                    <span>Design name</span>
                    <input value={draft.name} onChange={e => edit({ name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <textarea rows={2} value={draft.description ?? ""} onChange={e => edit({ description: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Page link</span>
                    <div className="slug-row"><span className="muted">/collections/</span>
                      <input value={draft.slug} onChange={e => edit({ slug: e.target.value })} />
                    </div>
                  </label>
                  <label className="toggle">
                    <input type="checkbox" checked={draft.active} onChange={e => edit({ active: e.target.checked })} />
                    <span>Live in shop</span>
                    <span className="muted">{draft.active ? "Customers can see and buy it" : "Hidden from customers"}</span>
                  </label>
                </div>
              </section>

              {/* Sleeve art */}
              <section className="card">
                <div className="section-head">
                  <h2>Sleeve art <span className="muted">(optional · ${sleeveFee("left")} per sleeve)</span></h2>
                  <p className="muted">Add a small logo or text for the sleeves. Then choose per product below whether sleeves are off, the customer&apos;s choice, or always included.</p>
                </div>
                <div className="sleeves">
                  {SLEEVE_SIDES.map(side => {
                    const url = sleeveArt(draft, side);
                    const other = sleeveArt(draft, side === "left" ? "right" : "left");
                    return (
                      <div key={side} className="sleeve-slot">
                        <span className="sleeve-title">{side === "left" ? "Left sleeve" : "Right sleeve"}</span>
                        <div className="sleeve-preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {url ? <img src={url} alt="" /> : <span className="muted">None</span>}
                        </div>
                        <div className="sleeve-actions">
                          <label className="mini as-btn">
                            {sleeveUploading === side ? "Uploading…" : "Upload"}
                            <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadSleeve(side, f); e.target.value = ""; }} />
                          </label>
                          <button className="mini" onClick={() => { setSleevePicker(sleevePicker === side ? null : side); loadGallery(); }}>Gallery</button>
                          {other && other !== url && <button className="mini" onClick={() => setSleeveUrl(side, other)}>Same as {side === "left" ? "right" : "left"}</button>}
                          {url && <button className="mini danger" onClick={() => setSleeveUrl(side, null)}>Remove</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sleevePicker && (
                  <div className="sleeve-gallery">
                    <div className="row-between">
                      <span className="muted">Pick {sleevePicker} sleeve art from your gallery</span>
                      <button className="mini" onClick={() => setSleevePicker(null)}>Close</button>
                    </div>
                    <input className="small-input" placeholder="Filter gallery…" value={galleryFilter} onChange={e => setGalleryFilter(e.target.value)} />
                    <div className="gallery-grid">
                      {filteredGallery.map(g => (
                        <button key={g.id} title={g.name} className="gallery-item"
                          onClick={() => { setSleeveUrl(sleevePicker, g.url); setSleevePicker(null); }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={g.url} alt={g.name} loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Products */}
              <section className="card">
                <div className="section-head">
                  <h2>Products ({draft.products.length})</h2>
                  <p className="muted">Drag the design on each photo to place it, and use the slider to size it. The same spot is used for every color.</p>
                </div>

                <div className="search-wrap">
                  <input className="search" placeholder="Add a product: search S&S by brand or style (e.g. Gildan 5000, hoodie, Bella 3001)…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                  {(hits.length > 0 || searching) && (
                    <div className="hits">
                      {searching && <p className="muted pad">Searching…</p>}
                      {hits.map(h => {
                        const added = draft.products.some(p => p.style_id === h.style_id);
                        return (
                          <button key={h.style_id} className="hit" disabled={added} onClick={() => addProduct(h)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {h.style_image ? <img src={imageSrc(h.style_image)!} alt="" /> : <span className="hit-ph" />}
                            <span className="hit-text">
                              <span className="hit-brand">{h.brand_name} {h.style_name}</span>
                              <span className="hit-title">{h.title}</span>
                            </span>
                            <span className="hit-add">{added ? "Added" : "+ Add"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {draft.products.length === 0 && <p className="muted pad">No products yet. Search above to add a tee, hoodie, crewneck…</p>}

                <div className="products">
                  {draft.products.map((p, idx) => {
                    const info = styleInfo[p.style_id];
                    const allColors = info && typeof info === "object" ? info.colors : [];
                    const allNames = allColors.map(c => c.colorName);
                    const limited = p.allowed_colors !== null;
                    const colors = limited ? allColors.filter(c => p.allowed_colors!.includes(c.colorName)) : allColors;
                    const style = info && typeof info === "object" ? info.style : null;
                    const colorName = previewColor[p.style_id] || p.default_color || colors[0]?.colorName;
                    const color = colors.find(c => c.colorName === colorName) || colors[0] || allColors.find(c => c.colorName === colorName) || allColors[0];
                    const perPiece = basePrintFee(draft, p);
                    const photo = p.print_location === "Back" ? (color?.backImage || color?.frontImage) : color?.frontImage;
                    const basePrice = color?.sizes[0]?.piecePrice ?? null;
                    return (
                      <div key={p.style_id} className="prod">
                        <div className="prod-mock">
                          {info === "loading" && <div className="mock-loading">Loading photos…</div>}
                          {info === "error" && <div className="mock-loading err">Couldn&apos;t load this style</div>}
                          {typeof info === "object" && (
                            <DesignMockup
                              garmentImage={photo || style?.styleImage || null}
                              designUrl={draft.design_url}
                              placement={p.placement}
                              onPlacementChange={(pl: Placement) => editProduct(p.style_id, { placement: pl })}
                            />
                          )}
                          <label className="slider">
                            <span>Size</span>
                            <input type="range" min={0.08} max={0.8} step={0.005} value={p.placement.w}
                              onChange={e => editProduct(p.style_id, { placement: { ...p.placement, w: parseFloat(e.target.value) } })} />
                          </label>
                          <div className="mock-actions">
                            <button className="mini" onClick={() => editProduct(p.style_id, { placement: { ...p.placement, x: 0.5 } })}>Center</button>
                            <button className="mini" onClick={() => editProduct(p.style_id, { placement: { ...DEFAULT_PLACEMENT } })}>Reset</button>
                          </div>
                        </div>

                        <div className="prod-fields">
                          <div className="prod-title">
                            <span className="hit-brand">{style?.brandName} {style?.styleName}</span>
                            <span className="prod-sub">{style?.title}</span>
                          </div>

                          <label className="field">
                            <span>Name customers see</span>
                            <input list="label-hints" value={p.label ?? ""} placeholder="e.g. Hoodie"
                              onChange={e => editProduct(p.style_id, { label: e.target.value })} />
                          </label>

                          <div className="two">
                            <label className="field">
                              <span>Print side</span>
                              <select value={p.print_location}
                                onChange={e => editProduct(p.style_id, { print_location: e.target.value as "Front" | "Back" })}>
                                <option value="Front">Front</option>
                                <option value="Back">Back</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>Print fee / piece</span>
                              <input type="number" min={0} step={0.5} value={p.print_fee ?? ""}
                                placeholder={`$${PRINT_PRICES[p.print_location]} (standard)`}
                                onChange={e => editProduct(p.style_id, { print_fee: e.target.value === "" ? null : parseFloat(e.target.value) })} />
                            </label>
                          </div>

                          {/* Colors offered */}
                          <div className="field">
                            <span>Colors offered</span>
                            <div className="seg">
                              <button className={!limited ? "on" : ""} onClick={() => editProduct(p.style_id, { allowed_colors: null })}>
                                All {allColors.length || ""} colors
                              </button>
                              <button className={limited ? "on" : ""} onClick={() => {
                                if (limited) return;
                                const start = color?.colorName ? [color.colorName] : [];
                                editProduct(p.style_id, { allowed_colors: start, default_color: start[0] ?? null });
                              }}>Only colors I pick</button>
                            </div>
                            {limited && (
                              <>
                                <p className="hint">
                                  Click swatches to offer them. {p.allowed_colors!.length === 0
                                    ? <b className="err">Pick at least one color, or customers won&apos;t see this product.</b>
                                    : <>Offering <b>{p.allowed_colors!.length}</b>: {p.allowed_colors!.join(", ")}</>}
                                </p>
                                <div className="swatches">
                                  {allColors.map(c => {
                                    const on = p.allowed_colors!.includes(c.colorName);
                                    return (
                                      <button key={c.colorName} title={c.colorName}
                                        className={`sw pick ${on ? "picked" : ""}`}
                                        style={{ background: c.colorHex ? `#${c.colorHex.replace("#", "")}` : "#666" }}
                                        onClick={() => { toggleAllowedColor(p, c.colorName, allNames); setPreviewColor(pc => ({ ...pc, [p.style_id]: c.colorName })); }} />
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>

                          {colors.length > 1 && (
                            <label className="field">
                              <span>Color shown first</span>
                              <select value={p.default_color ?? ""} onChange={e => {
                                editProduct(p.style_id, { default_color: e.target.value || null });
                                setPreviewColor(pc => ({ ...pc, [p.style_id]: e.target.value }));
                              }}>
                                <option value="">Automatic (first color)</option>
                                {colors.map(c => <option key={c.colorName} value={c.colorName}>{c.colorName}</option>)}
                              </select>
                            </label>
                          )}

                          {!limited && colors.length > 1 && (
                            <div className="field">
                              <span>Preview on color</span>
                              <div className="swatches">
                                {colors.slice(0, 60).map(c => (
                                  <button key={c.colorName} title={c.colorName}
                                    className={`sw ${c.colorName === color?.colorName ? "on" : ""}`}
                                    style={{ background: c.colorHex ? `#${c.colorHex.replace("#", "")}` : "#666" }}
                                    onClick={() => setPreviewColor(pc => ({ ...pc, [p.style_id]: c.colorName }))} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sleeves */}
                          <div className="two">
                            {SLEEVE_SIDES.map(side => {
                              const hasArt = !!sleeveArt(draft, side);
                              const key = side === "left" ? "left_sleeve" : "right_sleeve";
                              return (
                                <label key={side} className="field">
                                  <span>{side === "left" ? "Left" : "Right"} sleeve</span>
                                  <select value={hasArt ? p[key] : "off"} disabled={!hasArt}
                                    title={hasArt ? "" : "Add sleeve art above first"}
                                    onChange={e => editProduct(p.style_id, { [key]: e.target.value as SleeveMode })}>
                                    <option value="off">{hasArt ? "Off" : "Off (no sleeve art)"}</option>
                                    <option value="optional">Customer&apos;s choice (+${sleeveFee(side)})</option>
                                    <option value="included">Always included (+${sleeveFee(side)})</option>
                                  </select>
                                </label>
                              );
                            })}
                          </div>

                          <p className="price-line">
                            Customer price: {basePrice != null ? <>from <b>${(basePrice + perPiece).toFixed(2)}</b> <span className="muted">(${basePrice.toFixed(2)} garment + ${perPiece.toFixed(2)} print{perPiece !== printFeeFor(p) ? " incl. sleeves" : ""})</span></> : "—"}
                          </p>

                          <div className="prod-actions">
                            <button className="mini" disabled={idx === 0} onClick={() => moveProduct(idx, -1)}>↑ Move up</button>
                            <button className="mini" disabled={idx === draft.products.length - 1} onClick={() => moveProduct(idx, 1)}>↓ Move down</button>
                            <button className="mini danger" onClick={() => removeProduct(p.style_id)}>Remove</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <datalist id="label-hints">{LABEL_HINTS.map(l => <option key={l} value={l} />)}</datalist>
              </section>

              {/* Save bar */}
              <div className="savebar">
                <button className="ghost danger" onClick={remove}>Delete collection</button>
                <span className={`save-msg ${saveMsg && saveMsg !== "Saved" ? "err" : ""}`}>
                  {saveMsg || (dirty ? "Unsaved changes" : "")}
                </span>
                {draft.active && !dirty && <a className="ghost link" href={`/collections/${draft.slug}`} target="_blank" rel="noreferrer">Open page ↗</a>}
                <button className="primary" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </>
          )}
        </main>
      </div>

      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }
        .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid #1a1a1a; flex-wrap: wrap; }
        h1 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; letter-spacing: 0.05em; font-size: 1.9rem; margin: 0; }
        h2 { font-size: 1rem; margin: 0 0 0.75rem; }
        .sub { margin: 0.2rem 0 0; font-size: 0.82rem; color: #777; }
        .top-links { display: flex; gap: 1rem; font-size: 0.8rem; }
        .top-links a { color: #e8c97e; text-decoration: none; }

        .layout { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 80px); }
        .side { border-right: 1px solid #1a1a1a; padding: 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .new-btn { padding: 0.6rem; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; margin-bottom: 0.5rem; }
        .side-item { display: flex; gap: 0.6rem; align-items: center; padding: 0.5rem; background: transparent; border: 1px solid transparent; border-radius: 8px; cursor: pointer; text-align: left; color: inherit; font-family: inherit; }
        .side-item:hover { background: #121212; }
        .side-item.active { border-color: #e8c97e55; background: #e8c97e10; }
        .side-thumb { width: 40px; height: 40px; object-fit: contain; background: #1a1a1a; border-radius: 6px; flex-shrink: 0; }
        .side-text { display: flex; flex-direction: column; min-width: 0; }
        .side-name { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .side-meta { font-size: 0.7rem; color: #777; display: flex; align-items: center; gap: 0.3rem; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #555; display: inline-block; }
        .dot.on { background: #7ec87e; }

        .main { padding: 1.25rem 1.5rem 6rem; display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
        .empty { color: #666; padding: 3rem 0; text-align: center; }
        .card { background: #0f0f0f; border: 1px solid #1c1c1c; border-radius: 12px; padding: 1.25rem; }
        .muted { color: #666; font-size: 0.78rem; }
        .pad { padding: 0.5rem 0; }
        .hint { font-size: 0.75rem; color: #666; margin: 0.4rem 0; }
        .err { color: #c87e7e; font-size: 0.82rem; }

        .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
        .field > span { font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; color: #888; }
        input, textarea, select { background: #141414; border: 1px solid #2a2a2a; border-radius: 7px; color: #f0ede8; padding: 0.5rem 0.65rem; font-family: inherit; font-size: 0.85rem; outline: none; width: 100%; box-sizing: border-box; }
        input:focus, textarea:focus, select:focus { border-color: #e8c97e66; }
        textarea { resize: vertical; }
        input[type="range"] { padding: 0; accent-color: #e8c97e; }
        input[type="checkbox"] { width: auto; accent-color: #e8c97e; }

        .primary { padding: 0.6rem 1.3rem; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .primary:disabled { opacity: 0.45; cursor: default; }
        .ghost { padding: 0.55rem 1rem; background: transparent; color: #aaa; border: 1px solid #2a2a2a; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.82rem; text-decoration: none; }
        .ghost:hover { border-color: #e8c97e; color: #e8c97e; }
        .danger { color: #c87e7e; }
        .ghost.danger:hover { border-color: #c87e7e; color: #e09090; }
        .mini { padding: 0.3rem 0.6rem; background: transparent; color: #aaa; border: 1px solid #2a2a2a; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.72rem; }
        .mini:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .mini:disabled { opacity: 0.35; cursor: default; }
        .mini.danger:hover { border-color: #c87e7e; color: #e09090; }
        .row-end { display: flex; justify-content: flex-end; gap: 0.6rem; }

        .new-design { display: grid; grid-template-columns: 180px 1fr; gap: 1rem; }
        .new-preview { aspect-ratio: 1; background: #1a1a1a; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .new-preview img { max-width: 90%; max-height: 90%; object-fit: contain; }
        .upload-btn { display: inline-block; padding: 0.5rem 1rem; border: 1px solid #e8c97e; color: #e8c97e; border-radius: 8px; cursor: pointer; font-size: 0.82rem; }
        .small-input { padding: 0.4rem 0.6rem; font-size: 0.78rem; margin-bottom: 0.5rem; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 0.4rem; max-height: 220px; overflow-y: auto; }
        .gallery-item { aspect-ratio: 1; background: #1a1a1a; border: 2px solid transparent; border-radius: 6px; cursor: pointer; padding: 4px; }
        .gallery-item img { width: 100%; height: 100%; object-fit: contain; }
        .gallery-item.picked { border-color: #e8c97e; }

        .details { display: grid; grid-template-columns: 140px 1fr; gap: 1.25rem; }
        .detail-design { width: 140px; height: 140px; object-fit: contain; background: #1a1a1a; border-radius: 10px; padding: 8px; box-sizing: border-box; }
        .slug-row { display: flex; align-items: center; gap: 0.3rem; }
        .toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; }

        .section-head { margin-bottom: 0.75rem; }
        .section-head p { margin: 0; }
        .search-wrap { position: relative; margin-bottom: 1rem; }
        .search { padding: 0.7rem 0.85rem; }
        .hits { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #121212; border: 1px solid #2a2a2a; border-radius: 10px; z-index: 20; max-height: 380px; overflow-y: auto; padding: 0.3rem; box-shadow: 0 12px 30px rgba(0,0,0,0.5); }
        .hit { display: flex; align-items: center; gap: 0.7rem; width: 100%; padding: 0.45rem; background: transparent; border: none; border-radius: 7px; color: inherit; cursor: pointer; text-align: left; font-family: inherit; }
        .hit:hover:not(:disabled) { background: #1c1c1c; }
        .hit:disabled { opacity: 0.45; cursor: default; }
        .hit img, .hit-ph { width: 44px; height: 44px; object-fit: contain; background: #f4f2ee; border-radius: 6px; flex-shrink: 0; }
        .hit-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .hit-brand { font-size: 0.72rem; color: #e8c97e; letter-spacing: 0.04em; }
        .hit-title { font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hit-add { font-size: 0.75rem; color: #e8c97e; flex-shrink: 0; }

        .products { display: flex; flex-direction: column; gap: 1rem; }
        .prod { display: grid; grid-template-columns: minmax(220px, 300px) 1fr; gap: 1.25rem; padding: 1rem; border: 1px solid #1c1c1c; border-radius: 10px; background: #0c0c0c; }
        .prod-mock { display: flex; flex-direction: column; gap: 0.5rem; }
        .mock-loading { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; background: #161616; border-radius: 10px; font-size: 0.8rem; color: #666; }
        .slider { display: flex; align-items: center; gap: 0.6rem; font-size: 0.75rem; color: #888; }
        .mock-actions, .prod-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .prod-title { display: flex; flex-direction: column; margin-bottom: 0.75rem; }
        .prod-sub { font-size: 0.85rem; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .swatches { display: flex; flex-wrap: wrap; gap: 0.3rem; }
        .sw { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #222; cursor: pointer; padding: 0; }
        .sw.on { border-color: #e8c97e; }
        .price-line { font-size: 0.82rem; margin: 0.25rem 0 0.75rem; }
        .sw.pick { opacity: 0.35; }
        .sw.pick.picked { opacity: 1; border-color: #e8c97e; box-shadow: 0 0 0 2px #e8c97e55; }
        .seg { display: inline-flex; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; width: fit-content; }
        .seg button { padding: 0.4rem 0.8rem; background: transparent; border: none; color: #888; font-family: inherit; font-size: 0.78rem; cursor: pointer; }
        .seg button.on { background: #e8c97e; color: #0a0a0a; font-weight: 700; }
        .sleeves { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .sleeve-slot { display: flex; flex-direction: column; gap: 0.5rem; }
        .sleeve-title { font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; color: #888; }
        .sleeve-preview { height: 110px; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .sleeve-preview img { max-height: 90px; max-width: 90%; object-fit: contain; }
        .sleeve-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .as-btn { display: inline-block; }
        .sleeve-gallery { margin-top: 1rem; border-top: 1px solid #1c1c1c; padding-top: 0.75rem; }
        .row-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        select:disabled { opacity: 0.5; }

        .savebar { position: fixed; bottom: 0; left: 260px; right: 0; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; background: #0d0d0dee; border-top: 1px solid #1c1c1c; backdrop-filter: blur(6px); z-index: 30; }
        .save-msg { margin-left: auto; font-size: 0.8rem; color: #888; }
        .link { display: inline-block; }

        @media (max-width: 820px) {
          .layout { grid-template-columns: 1fr; }
          .side { border-right: none; border-bottom: 1px solid #1a1a1a; }
          .savebar { left: 0; }
          .prod, .details, .new-design { grid-template-columns: 1fr; }
          .detail-design { width: 100px; height: 100px; }
        }
      `}</style>
    </div>
  );
}
