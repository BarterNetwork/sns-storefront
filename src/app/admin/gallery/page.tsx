"use client";

import { useEffect, useRef, useState } from "react";

const PRESET_CATEGORIES = [
  "Sports", "Birthday", "Business", "Events",
  "Holidays", "Faith", "Humor", "Patriotic", "Name", "General",
];

interface Design {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string;
  created_at: string;
}

interface UploadItem {
  file: File;
  name: string;
  category: string;
  subcategory: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface EditState {
  name: string;
  category: string;
  subcategory: string;
}

export default function AdminGalleryPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pwError, setPwError] = useState("");

  const [designs, setDesigns] = useState<Design[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);

  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [defaultCategory, setDefaultCategory] = useState("Sports");
  const [customCategory, setCustomCategory] = useState("");
  const [defaultSubcategory, setDefaultSubcategory] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [filterCat, setFilterCat] = useState("All");
  const [filterSub, setFilterSub] = useState("All");

  // inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", category: "", subcategory: "" });
  const [saving, setSaving] = useState(false);

  // bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCat, setBulkCat] = useState("");
  const [bulkSub, setBulkSub] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) { setPassword(saved); setAuthed(true); }
  }, []);

  useEffect(() => { if (authed) loadDesigns(); }, [authed]);

  const pw = () => password || sessionStorage.getItem("admin_pw") || "";

  const login = async () => {
    const res = await fetch("/api/admin/gallery", { headers: { "x-admin-password": password } });
    if (res.ok) { sessionStorage.setItem("admin_pw", password); setAuthed(true); setPwError(""); }
    else setPwError("Incorrect password");
  };

  const loadDesigns = async () => {
    setLoadingDesigns(true);
    const res = await fetch("/api/admin/gallery", { headers: { "x-admin-password": pw() } });
    const json = await res.json();
    setDesigns(json.data || []);
    setLoadingDesigns(false);
  };

  const addFiles = (files: FileList | File[]) => {
    const cat = customCategory.trim() || defaultCategory;
    const items: UploadItem[] = Array.from(files)
      .filter(f => f.type.startsWith("image/"))
      .map(f => ({
        file: f,
        name: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        category: cat,
        subcategory: defaultSubcategory.trim(),
        status: "pending",
      }));
    setQueue(prev => [...prev, ...items]);
  };

  const updateItem = (idx: number, patch: Partial<UploadItem>) =>
    setQueue(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const uploadAll = async () => {
    setUploading(true);
    const p = pw();
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== "pending") continue;
      updateItem(i, { status: "uploading" });
      try {
        const form = new FormData();
        form.append("file", queue[i].file);
        form.append("name", queue[i].name);
        form.append("category", queue[i].category);
        form.append("subcategory", queue[i].subcategory);
        const res = await fetch("/api/admin/gallery", { method: "POST", headers: { "x-admin-password": p }, body: form });
        updateItem(i, { status: res.ok ? "done" : "error", error: res.ok ? undefined : (await res.json()).error });
      } catch (e: any) {
        updateItem(i, { status: "error", error: e.message });
      }
    }
    setUploading(false);
    loadDesigns();
  };

  const deleteDesign = async (id: string) => {
    if (!confirm("Delete this design?")) return;
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE", headers: { "x-admin-password": pw() } });
    setDesigns(prev => prev.filter(d => d.id !== id));
  };

  const startEdit = (d: Design) => {
    setEditingId(d.id);
    setEditState({ name: d.name, category: d.category, subcategory: d.subcategory || "" });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH",
      headers: { "x-admin-password": pw(), "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    if (res.ok) {
      const { data } = await res.json();
      setDesigns(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
      setEditingId(null);
    }
    setSaving(false);
  };

  // ── Bulk ops ──
  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectAll = () =>
    setSelected(new Set(filteredDesigns.map(d => d.id)));

  const clearSelection = () => setSelected(new Set());

  const applyBulk = async () => {
    if (!bulkCat.trim() && !bulkSub.trim()) return;
    if (!confirm(`Apply changes to ${selected.size} design${selected.size !== 1 ? "s" : ""}?`)) return;
    setBulkApplying(true);
    const p = pw();
    const patch: Record<string, string> = {};
    if (bulkCat.trim()) patch.category = bulkCat.trim();
    if (bulkSub.trim() !== undefined) patch.subcategory = bulkSub.trim();
    const ids = Array.from(selected);
    await Promise.all(ids.map(id =>
      fetch(`/api/admin/gallery/${id}`, {
        method: "PATCH",
        headers: { "x-admin-password": p, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    ));
    setDesigns(prev => prev.map(d =>
      selected.has(d.id)
        ? { ...d, ...(patch.category ? { category: patch.category } : {}), subcategory: patch.subcategory ?? d.subcategory }
        : d
    ));
    setBulkApplying(false);
    clearSelection();
    setBulkCat("");
    setBulkSub("");
  };

  const categories = ["All", ...Array.from(new Set(designs.map(d => d.category))).sort()];
  const subcategories = filterCat === "All"
    ? ["All"]
    : ["All", ...Array.from(new Set(designs.filter(d => d.category === filterCat).map(d => d.subcategory || "—"))).sort()];

  const filteredDesigns = designs.filter(d => {
    if (filterCat !== "All" && d.category !== filterCat) return false;
    if (filterSub !== "All") {
      const sub = d.subcategory || "—";
      if (sub !== filterSub) return false;
    }
    return true;
  });

  if (!authed) return (
    <div className="login">
      <div className="login-box">
        <h1>Gallery Admin</h1>
        <input type="password" placeholder="Admin password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} className="pw-input" />
        {pwError && <p className="pw-error">{pwError}</p>}
        <button className="btn-gold" onClick={login}>Sign in</button>
      </div>
      <style jsx>{`
        .login { min-height:100vh; background:#0a0a0a; display:flex; align-items:center; justify-content:center; }
        .login-box { background:#111; border:1px solid #222; border-radius:12px; padding:2.5rem; width:320px; display:flex; flex-direction:column; gap:1rem; }
        h1 { color:#f0ede8; font-size:1.4rem; font-weight:700; margin:0; font-family:'DM Sans',sans-serif; }
        .pw-input { width:100%; padding:0.75rem; background:#0a0a0a; border:1px solid #2a2a2a; border-radius:8px; color:#f0ede8; font-size:0.9rem; font-family:inherit; outline:none; box-sizing:border-box; }
        .pw-error { color:#c87e7e; font-size:0.8rem; margin:0; font-family:'DM Sans',sans-serif; }
        .btn-gold { padding:0.75rem; background:#e8c97e; color:#0a0a0a; border:none; border-radius:8px; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }
      `}</style>
    </div>
  );

  return (
    <div className="page">
      <div className="topbar">
        <h1>Design Gallery <span className="count">{designs.length} designs</span></h1>
        <a href="/" className="back">← Storefront</a>
      </div>

      {/* ── Upload ── */}
      <div className="section">
        <h2>Upload Designs</h2>
        <div className="upload-fields">
          <div className="field-group">
            <label className="label">Category</label>
            <div className="cat-pills">
              {PRESET_CATEGORIES.map(c => (
                <button key={c} className={`pill ${defaultCategory === c && !customCategory ? "active" : ""}`}
                  onClick={() => { setDefaultCategory(c); setCustomCategory(""); }}>{c}</button>
              ))}
            </div>
            <input className="text-input" placeholder="Or type a custom category…" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="label">Subcategory <span className="optional">(optional)</span></label>
            <input className="text-input" placeholder="e.g. Ninja Birthday, Princess…" value={defaultSubcategory} onChange={e => setDefaultSubcategory(e.target.value)} />
          </div>
        </div>

        <div ref={dropRef} className={`drop-zone ${dragging ? "dragging" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => document.getElementById("file-input")?.click()}>
          <input id="file-input" type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => e.target.files && addFiles(e.target.files)} />
          <div className="drop-icon">📁</div>
          <p className="drop-text">Drop images here or click to browse</p>
          <p className="drop-sub">Multiple files supported</p>
        </div>

        {queue.length > 0 && (
          <div className="queue">
            <div className="queue-head">
              <span>{queue.length} file{queue.length !== 1 ? "s" : ""} queued</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn-sm" onClick={() => setQueue(prev => prev.filter(i => i.status !== "done"))}>Clear done</button>
                <button className="btn-gold-sm" onClick={uploadAll}
                  disabled={uploading || queue.every(i => i.status !== "pending")}>
                  {uploading ? "Uploading…" : `Upload ${queue.filter(i => i.status === "pending").length} pending`}
                </button>
              </div>
            </div>
            {queue.map((item, idx) => (
              <div key={idx} className={`queue-item ${item.status}`}>
                <div className="queue-thumb"><img src={URL.createObjectURL(item.file)} alt="" /></div>
                <div className="queue-fields">
                  <input className="q-input" value={item.name} onChange={e => updateItem(idx, { name: e.target.value })} placeholder="Name" disabled={item.status !== "pending"} />
                  <input className="q-input q-sm" value={item.category} onChange={e => updateItem(idx, { category: e.target.value })} placeholder="Category" disabled={item.status !== "pending"} />
                  <input className="q-input q-sm" value={item.subcategory} onChange={e => updateItem(idx, { subcategory: e.target.value })} placeholder="Subcategory" disabled={item.status !== "pending"} />
                </div>
                <div className="queue-status">
                  {item.status === "pending"   && <span className="s-pending">Pending</span>}
                  {item.status === "uploading" && <span className="s-uploading">Uploading…</span>}
                  {item.status === "done"      && <span className="s-done">✓ Done</span>}
                  {item.status === "error"     && <span className="s-error" title={item.error}>✗ Error</span>}
                </div>
                {item.status === "pending" && <button className="remove-btn" onClick={() => setQueue(prev => prev.filter((_, i) => i !== idx))}>✕</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Existing designs ── */}
      <div className="section">
        <div className="designs-head">
          <div className="filter-row">
            <select className="filter-select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterSub("All"); clearSelection(); }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {subcategories.length > 1 && (
              <select className="filter-select" value={filterSub} onChange={e => { setFilterSub(e.target.value); clearSelection(); }}>
                {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <span className="result-count">{filteredDesigns.length} designs</span>
            <button className="btn-sm" onClick={selectAll}>Select all visible</button>
            {selected.size > 0 && <button className="btn-sm" onClick={clearSelection}>Clear ({selected.size})</button>}
          </div>

          {/* ── Bulk action bar ── */}
          {selected.size > 0 && (
            <div className="bulk-bar">
              <span className="bulk-label">{selected.size} selected →</span>
              <input
                className="bulk-input"
                placeholder="New category…"
                value={bulkCat}
                list="cat-list"
                onChange={e => setBulkCat(e.target.value)}
              />
              <datalist id="cat-list">
                {PRESET_CATEGORIES.map(c => <option key={c} value={c} />)}
                {categories.filter(c => c !== "All").map(c => <option key={`ex-${c}`} value={c} />)}
              </datalist>
              <input
                className="bulk-input"
                placeholder="New subcategory… (leave blank to keep)"
                value={bulkSub}
                onChange={e => setBulkSub(e.target.value)}
              />
              <button className="btn-gold-sm" onClick={applyBulk} disabled={bulkApplying || (!bulkCat.trim() && bulkSub === undefined)}>
                {bulkApplying ? "Saving…" : "Apply"}
              </button>
            </div>
          )}
        </div>

        {loadingDesigns ? <p className="muted">Loading…</p> : filteredDesigns.length === 0 ? <p className="muted">No designs.</p> : (() => {
          // Group filtered designs by category → subcategory
          const grouped: Record<string, Record<string, Design[]>> = {};
          for (const d of filteredDesigns) {
            const cat = d.category;
            const sub = d.subcategory || "";
            if (!grouped[cat]) grouped[cat] = {};
            if (!grouped[cat][sub]) grouped[cat][sub] = [];
            grouped[cat][sub].push(d);
          }
          const sortedCats = Object.keys(grouped).sort();

          const DesignCard = ({ d }: { d: Design }) => (
            <div
              key={d.id}
              className={`design-card ${selected.has(d.id) ? "selected" : ""}`}
              onClick={() => { if (editingId !== d.id) toggleSelect(d.id); }}
            >
              <div className="card-check" onClick={e => { e.stopPropagation(); toggleSelect(d.id); }}>
                <input type="checkbox" readOnly checked={selected.has(d.id)} />
              </div>
              <div className="design-img"><img src={d.url} alt={d.name} loading="lazy" /></div>
              {editingId === d.id ? (
                <div className="edit-fields" onClick={e => e.stopPropagation()}>
                  <input className="e-input" value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} placeholder="Name" />
                  <input className="e-input" value={editState.category} onChange={e => setEditState(s => ({ ...s, category: e.target.value }))} placeholder="Category" list="cat-list" />
                  <input className="e-input" value={editState.subcategory} onChange={e => setEditState(s => ({ ...s, subcategory: e.target.value }))} placeholder="Subcategory (optional)" />
                  <div className="edit-actions">
                    <button className="btn-gold-sm" onClick={() => saveEdit(d.id)} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                    <button className="btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="design-info">
                  <p className="design-name">{d.name}</p>
                  {d.subcategory && <p className="design-meta">{d.subcategory}</p>}
                </div>
              )}
              <div className="card-actions" onClick={e => e.stopPropagation()}>
                <button className="action-btn" onClick={() => startEdit(d)} title="Edit">✏</button>
                <button className="action-btn danger" onClick={() => deleteDesign(d.id)} title="Delete">✕</button>
              </div>
            </div>
          );

          return (
            <div className="cat-sections">
              {sortedCats.map(cat => {
                const subs = grouped[cat];
                const subKeys = Object.keys(subs).sort();
                const hasSubcats = subKeys.some(s => s !== "");
                const catCount = Object.values(subs).flat().length;
                return (
                  <div key={cat} className="cat-section">
                    <div className="cat-header">
                      <span className="cat-title">{cat}</span>
                      <span className="cat-count">{catCount}</span>
                      <button className="btn-sm" style={{ marginLeft: "auto" }}
                        onClick={() => setSelected(prev => {
                          const s = new Set(prev);
                          Object.values(subs).flat().forEach(d => s.add(d.id));
                          return s;
                        })}>Select all in {cat}</button>
                    </div>

                    {hasSubcats ? subKeys.map(sub => {
                      const label = sub || "No subcategory";
                      return (
                        <div key={sub} className="subcat-section">
                          {sub && <div className="subcat-header">
                            <span className="subcat-title">{label}</span>
                            <span className="cat-count">{subs[sub].length}</span>
                          </div>}
                          <div className="design-grid">
                            {subs[sub].map(d => <DesignCard key={d.id} d={d} />)}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="design-grid">
                        {subs[""].map(d => <DesignCard key={d.id} d={d} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        .page { min-height:100vh; background:#0a0a0a; color:#f0ede8; font-family:'DM Sans',sans-serif; padding-bottom:4rem; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 2rem; border-bottom:1px solid #1a1a1a; }
        h1 { font-size:1.2rem; font-weight:700; margin:0; }
        .count { color:#555; font-size:0.85rem; font-weight:400; margin-left:0.5rem; }
        .back { color:#666; font-size:0.82rem; text-decoration:none; }
        .back:hover { color:#e8c97e; }

        .section { max-width:1300px; margin:2rem auto; padding:0 2rem; }
        h2 { font-size:0.95rem; font-weight:700; color:#ccc; margin:0 0 1rem; }

        .upload-fields { display:flex; gap:2rem; margin-bottom:1.25rem; flex-wrap:wrap; }
        .field-group { flex:1; min-width:260px; }
        .label { font-size:0.75rem; color:#888; display:block; margin-bottom:0.4rem; }
        .optional { color:#444; }
        .cat-pills { display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom:0.5rem; }
        .pill { padding:0.25rem 0.65rem; border:1px solid #2a2a2a; border-radius:999px; background:transparent; color:#888; font-size:0.72rem; cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .pill:hover { border-color:#e8c97e; color:#e8c97e; }
        .pill.active { background:#e8c97e; border-color:#e8c97e; color:#0a0a0a; font-weight:600; }
        .text-input { width:100%; padding:0.45rem 0.65rem; background:#111; border:1px solid #2a2a2a; border-radius:7px; color:#f0ede8; font-size:0.82rem; font-family:inherit; outline:none; }
        .text-input:focus { border-color:#e8c97e44; }

        .drop-zone { border:2px dashed #2a2a2a; border-radius:12px; padding:2.5rem 2rem; text-align:center; cursor:pointer; transition:all 0.2s; margin-bottom:1.25rem; }
        .drop-zone:hover, .drop-zone.dragging { border-color:#e8c97e; background:#e8c97e08; }
        .drop-icon { font-size:2rem; margin-bottom:0.5rem; }
        .drop-text { color:#ccc; font-size:0.9rem; margin:0 0 0.2rem; }
        .drop-sub { color:#555; font-size:0.75rem; margin:0; }

        .queue { background:#0d0d0d; border:1px solid #1a1a1a; border-radius:10px; overflow:hidden; margin-bottom:1rem; }
        .queue-head { display:flex; align-items:center; justify-content:space-between; padding:0.65rem 1rem; border-bottom:1px solid #1a1a1a; font-size:0.8rem; color:#888; }
        .queue-item { display:flex; align-items:center; gap:0.6rem; padding:0.5rem 1rem; border-bottom:1px solid #111; }
        .queue-item.done { opacity:0.5; }
        .queue-thumb { width:42px; height:42px; flex-shrink:0; border-radius:5px; overflow:hidden; background:#1a1a1a; }
        .queue-thumb img { width:100%; height:100%; object-fit:cover; }
        .queue-fields { flex:1; display:flex; gap:0.4rem; flex-wrap:wrap; }
        .q-input { flex:2; min-width:100px; padding:0.35rem 0.5rem; background:#111; border:1px solid #2a2a2a; border-radius:5px; color:#f0ede8; font-size:0.75rem; font-family:inherit; outline:none; }
        .q-input.q-sm { flex:1; min-width:80px; }
        .q-input:focus { border-color:#e8c97e44; }
        .q-input:disabled { opacity:0.5; }
        .queue-status { font-size:0.72rem; width:72px; text-align:right; flex-shrink:0; }
        .s-pending { color:#555; } .s-uploading { color:#e8c97e; } .s-done { color:#7ec87e; } .s-error { color:#c87e7e; cursor:help; }
        .remove-btn { background:none; border:none; color:#444; cursor:pointer; font-size:0.85rem; padding:0.2rem; }
        .remove-btn:hover { color:#c87e7e; }

        .btn-sm { padding:0.32rem 0.7rem; background:transparent; border:1px solid #2a2a2a; border-radius:6px; color:#888; font-size:0.72rem; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .btn-sm:hover { border-color:#555; color:#ccc; }
        .btn-gold-sm { padding:0.32rem 0.8rem; background:#e8c97e; border:none; border-radius:6px; color:#0a0a0a; font-size:0.72rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .btn-gold-sm:hover:not(:disabled) { background:#f0d99a; }
        .btn-gold-sm:disabled { opacity:0.4; cursor:default; }

        .designs-head { margin-bottom:1rem; }
        .filter-row { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.6rem; }
        .filter-select { padding:0.4rem 0.65rem; background:#111; border:1px solid #2a2a2a; border-radius:7px; color:#f0ede8; font-size:0.8rem; font-family:inherit; outline:none; cursor:pointer; }
        .filter-select:focus { border-color:#e8c97e44; }
        .result-count { font-size:0.75rem; color:#555; }
        .muted { color:#555; font-size:0.85rem; }

        .bulk-bar { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; background:#111; border:1px solid #2a2a2a; border-radius:9px; padding:0.65rem 1rem; margin-bottom:0.75rem; }
        .bulk-label { font-size:0.78rem; color:#e8c97e; font-weight:600; white-space:nowrap; }
        .bulk-input { flex:1; min-width:160px; padding:0.38rem 0.6rem; background:#0a0a0a; border:1px solid #2a2a2a; border-radius:6px; color:#f0ede8; font-size:0.78rem; font-family:inherit; outline:none; }
        .bulk-input:focus { border-color:#e8c97e55; }

        .cat-sections { display:flex; flex-direction:column; gap:2rem; }
        .cat-section { border:1px solid #1a1a1a; border-radius:12px; overflow:hidden; }
        .cat-header { display:flex; align-items:center; gap:0.6rem; padding:0.65rem 1rem; background:#111; border-bottom:1px solid #1a1a1a; }
        .cat-title { font-size:0.9rem; font-weight:700; color:#f0ede8; }
        .cat-count { font-size:0.72rem; color:#555; background:#1a1a1a; padding:0.15rem 0.45rem; border-radius:999px; }
        .subcat-section { border-top:1px solid #111; }
        .subcat-header { display:flex; align-items:center; gap:0.5rem; padding:0.4rem 1rem; background:#0d0d0d; border-bottom:1px solid #111; }
        .subcat-title { font-size:0.75rem; font-weight:600; color:#888; }
        .design-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:0.75rem; padding:0.75rem; }
        .design-grid::-webkit-scrollbar { width:4px; }
        .design-grid::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:999px; }

        .design-card { background:#111; border:1px solid #1a1a1a; border-radius:10px; overflow:hidden; position:relative; cursor:pointer; transition:border-color 0.15s; }
        .design-card:hover { border-color:#2a2a2a; }
        .design-card.selected { border-color:#e8c97e; background:#e8c97e0a; }
        .card-check { position:absolute; top:0.35rem; left:0.35rem; z-index:2; }
        .card-check input[type=checkbox] { width:15px; height:15px; cursor:pointer; accent-color:#e8c97e; }
        .design-img { aspect-ratio:1; background:#1a1a1a; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .design-img img { width:100%; height:100%; object-fit:contain; padding:0.4rem; }
        .design-info { padding:0.5rem 0.6rem 0.4rem; }
        .design-name { font-size:0.75rem; color:#ccc; margin:0 0 0.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .design-meta { font-size:0.65rem; color:#555; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .edit-fields { padding:0.5rem 0.6rem; display:flex; flex-direction:column; gap:0.35rem; }
        .e-input { width:100%; padding:0.32rem 0.5rem; background:#0a0a0a; border:1px solid #2a2a2a; border-radius:5px; color:#f0ede8; font-size:0.72rem; font-family:inherit; outline:none; }
        .e-input:focus { border-color:#e8c97e44; }
        .edit-actions { display:flex; gap:0.35rem; margin-top:0.25rem; }

        .card-actions { position:absolute; top:0.35rem; right:0.35rem; display:flex; gap:0.25rem; z-index:2; }
        .action-btn { background:#0a0a0aCC; border:1px solid #2a2a2a; border-radius:4px; color:#666; font-size:0.68rem; cursor:pointer; width:20px; height:20px; display:flex; align-items:center; justify-content:center; padding:0; }
        .action-btn:hover { background:#1a1a1a; color:#ccc; border-color:#555; }
        .action-btn.danger:hover { background:#c87e7e22; border-color:#c87e7e; color:#c87e7e; }
      `}</style>
    </div>
  );
}
