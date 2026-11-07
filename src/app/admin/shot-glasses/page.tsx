"use client";

import { useState, useEffect, useCallback } from "react";

const ADMIN_KEY = "tsd_admin_pw";

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  occasion_slug: string | null;
  design_name: string | null;
  glass_size: string;
  glass_decorated: boolean;
  customization_type: string;
  packaging: string;
  ribbon: boolean;
  ribbon_color: string | null;
  crinkle_color: string | null;
  quantity: number;
  total_cents: number;
  status: string;
  notes: string | null;
  personalization: Record<string, string>;
}

interface ConfigRow { key: string; value_cents: number; label: string; }
interface TierRow { id: number; glass_type: string; min_qty: number; max_qty: number | null; price_cents: number; }

const STATUS_OPTIONS = ["pending", "confirmed", "in_production", "ready", "completed", "cancelled"];

function formatCents(c: number) { return `$${(c / 100).toFixed(2)}`; }
function fmt(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export default function AdminShotGlassesPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<"orders" | "config">("orders");

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    "x-admin-password": password,
  }), [password]);

  const login = async () => {
    setAuthError("");
    const res = await fetch(`/api/admin/shot-glasses?resource=orders&status=pending`, { headers: headers() });
    if (res.status === 401) { setAuthError("Wrong password"); return; }
    setAuthed(true);
    const data = await res.json();
    setOrders(data.data || []);
    setLoading(false);
  };

  const loadOrders = useCallback(async (status = orderStatus) => {
    setLoading(true);
    const res = await fetch(`/api/admin/shot-glasses?resource=orders&status=${status}`, { headers: headers() });
    const data = await res.json();
    setOrders(data.data || []);
    setLoading(false);
  }, [headers, orderStatus]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/shot-glasses?resource=config`, { headers: headers() });
    const data = await res.json();
    setConfig(data.config || []);
    setTiers(data.tiers || []);
    const edits: Record<string, string> = {};
    for (const row of (data.config || [])) {
      edits[row.key] = String(row.value_cents);
    }
    setEditingConfig(edits);
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    if (!authed) return;
    if (tab === "orders") loadOrders(orderStatus);
    else loadConfig();
  }, [authed, tab, orderStatus, loadOrders, loadConfig]);

  const updateOrderStatus = async (id: string, status: string) => {
    setSaving(id);
    await fetch("/api/admin/shot-glasses", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ table: "shot_glass_orders", id, updates: { status } }),
    });
    setSaving(null);
    loadOrders(orderStatus);
  };

  const saveConfigRow = async (key: string) => {
    const newVal = parseInt(editingConfig[key]);
    if (isNaN(newVal) || newVal < 0) return;
    setSaving(key);
    await fetch("/api/admin/shot-glasses", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ table: "shot_glass_config", id: key, updates: { value_cents: newVal } }),
    });
    setSaving(null);
    loadConfig();
  };

  const saveTierRow = async (id: number, field: string, value: string) => {
    const val = parseInt(value);
    if (isNaN(val)) return;
    setSaving(String(id));
    await fetch("/api/admin/shot-glasses", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ table: "shot_glass_bulk_tiers", id, updates: { [field]: val } }),
    });
    setSaving(null);
    loadConfig();
  };

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="login-box">
          <h1 className="login-title">Shot Glass Admin</h1>
          <input
            className="login-input"
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
          />
          {authError && <p className="auth-error">{authError}</p>}
          <button className="btn-gold" onClick={login}>Sign In</button>
        </div>
        <style jsx>{`
          .login-wrap { min-height:100vh;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif; }
          .login-box { background:#111;border:1px solid #1e1e1e;border-radius:12px;padding:2rem;width:320px;display:flex;flex-direction:column;gap:0.8rem; }
          .login-title { font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:0.04em;margin:0;color:#f0ede8; }
          .login-input { background:#161616;border:1px solid #2a2a2a;color:#f0ede8;font-family:inherit;font-size:0.9rem;padding:0.65rem 0.9rem;border-radius:7px;outline:none;width:100%;box-sizing:border-box; }
          .login-input:focus { border-color:#e8c97e55; }
          .auth-error { color:#e57373;font-size:0.78rem;margin:0; }
          .btn-gold { background:#e8c97e;color:#0a0a0a;font-weight:700;font-family:inherit;font-size:0.9rem;padding:0.65rem;border:none;border-radius:7px;cursor:pointer; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="admin-header">
        <h1 className="admin-title">Shot Glass Admin</h1>
        <div className="tab-row">
          <button className={`tab${tab === "orders" ? " active" : ""}`} onClick={() => setTab("orders")}>Orders</button>
          <button className={`tab${tab === "config" ? " active" : ""}`} onClick={() => setTab("config")}>Pricing</button>
        </div>
      </header>

      <main className="admin-main">
        {tab === "orders" && (
          <div>
            <div className="filter-row">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  className={`filter-btn${orderStatus === s ? " active" : ""}`}
                  onClick={() => { setOrderStatus(s); loadOrders(s); }}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="loading">Loading…</div>
            ) : orders.length === 0 ? (
              <div className="empty">No {orderStatus} orders.</div>
            ) : (
              <div className="orders-list">
                {orders.map(o => (
                  <div key={o.id} className="order-card">
                    <div className="order-top" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                      <div className="order-info">
                        <span className="order-name">{o.customer_name}</span>
                        <span className="order-meta">{o.quantity}× {o.glass_size} {o.glass_decorated ? "decorated" : "blank"} · {o.occasion_slug || "—"}</span>
                        <span className="order-meta">{o.customer_email}</span>
                      </div>
                      <div className="order-right">
                        <span className="order-total">{formatCents(o.total_cents)}</span>
                        <span className="order-date">{fmt(o.created_at)}</span>
                        <select
                          className="status-select"
                          value={o.status}
                          disabled={saving === o.id}
                          onChange={e => updateOrderStatus(o.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {expandedOrder === o.id && (
                      <div className="order-detail">
                        <div className="detail-grid">
                          <div><span className="dl">Design</span><span>{o.design_name || "—"}</span></div>
                          <div><span className="dl">Customization</span><span>{o.customization_type}</span></div>
                          <div><span className="dl">Packaging</span><span>{o.packaging}</span></div>
                          <div><span className="dl">Ribbon</span><span>{o.ribbon ? `Yes (${o.ribbon_color || "?"})` : "No"}</span></div>
                          <div><span className="dl">Crinkle</span><span>{o.crinkle_color || "—"}</span></div>
                          <div><span className="dl">Phone</span><span>{o.customer_phone || "—"}</span></div>
                          {o.personalization && Object.keys(o.personalization).length > 0 && (
                            <div className="detail-full">
                              <span className="dl">Personalization</span>
                              <span>{JSON.stringify(o.personalization)}</span>
                            </div>
                          )}
                          {o.notes && (
                            <div className="detail-full">
                              <span className="dl">Notes</span>
                              <span>{o.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "config" && (
          <div>
            <section className="config-section">
              <h2 className="config-section-title">Base Prices (cents)</h2>
              <div className="config-grid">
                {config.map(row => (
                  <div key={row.key} className="config-row">
                    <label className="config-label">{row.label}</label>
                    <div className="config-input-row">
                      <input
                        className="config-input"
                        type="number"
                        min={0}
                        value={editingConfig[row.key] ?? ""}
                        onChange={e => setEditingConfig(prev => ({ ...prev, [row.key]: e.target.value }))}
                      />
                      <span className="config-display">{formatCents(parseInt(editingConfig[row.key]) || 0)}</span>
                      <button
                        className="btn-save"
                        disabled={saving === row.key}
                        onClick={() => saveConfigRow(row.key)}
                      >
                        {saving === row.key ? "…" : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="config-section">
              <h2 className="config-section-title">Bulk Tier Prices (cents per glass)</h2>
              <table className="tier-table">
                <thead>
                  <tr>
                    <th>Glass Type</th>
                    <th>Min Qty</th>
                    <th>Max Qty</th>
                    <th>Price (¢)</th>
                    <th>Display</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map(t => (
                    <TierRow key={t.id} row={t} saving={saving === String(t.id)} onSave={saveTierRow} />
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </main>

      <style jsx>{`
        .page { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; }
        .admin-header { border-bottom: 1px solid #1a1a1a; padding: 1rem 2rem; display: flex; align-items: center; gap: 2rem; }
        .admin-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.04em; margin: 0; }
        .tab-row { display: flex; gap: 0.4rem; }
        .tab { background: none; border: 1px solid #2a2a2a; color: #666; font-size: 0.8rem; padding: 0.3rem 0.9rem; border-radius: 20px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .tab.active { border-color: #e8c97e; color: #e8c97e; }
        .admin-main { max-width: 900px; margin: 0 auto; padding: 1.5rem 2rem 4rem; }

        .filter-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
        .filter-btn { background: none; border: 1px solid #2a2a2a; color: #555; font-size: 0.75rem; padding: 0.3rem 0.7rem; border-radius: 20px; cursor: pointer; font-family: inherit; transition: all 0.15s; text-transform: capitalize; }
        .filter-btn.active { border-color: #e8c97e; color: #e8c97e; }

        .orders-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .order-card { background: #111; border: 1px solid #1e1e1e; border-radius: 9px; overflow: hidden; }
        .order-top { display: flex; align-items: center; gap: 1rem; padding: 0.9rem 1rem; cursor: pointer; }
        .order-top:hover { background: #161616; }
        .order-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .order-name { font-size: 0.88rem; font-weight: 600; }
        .order-meta { font-size: 0.72rem; color: #666; }
        .order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
        .order-total { font-size: 0.9rem; font-weight: 600; color: #e8c97e; }
        .order-date { font-size: 0.7rem; color: #555; }
        .status-select { background: #1e1e1e; border: 1px solid #2a2a2a; color: #888; font-size: 0.72rem; padding: 0.25rem 0.5rem; border-radius: 5px; font-family: inherit; cursor: pointer; text-transform: capitalize; }
        .status-select:focus { outline: none; border-color: #e8c97e55; }

        .order-detail { padding: 0.75rem 1rem 1rem; border-top: 1px solid #1a1a1a; background: #0d0d0d; }
        .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; }
        .detail-grid > div { display: flex; flex-direction: column; gap: 0.15rem; }
        .detail-full { grid-column: 1 / -1; }
        .dl { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
        .detail-grid span:last-child { font-size: 0.8rem; color: #ccc; }

        .loading { padding: 2rem; text-align: center; color: #555; font-size: 0.9rem; }
        .empty { padding: 2rem; text-align: center; color: #555; font-size: 0.9rem; }

        .config-section { margin-bottom: 2rem; }
        .config-section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 0.04em; margin: 0 0 1rem; }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
        .config-row { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 0.75rem 0.9rem; }
        .config-label { font-size: 0.72rem; color: #888; display: block; margin-bottom: 0.4rem; }
        .config-input-row { display: flex; align-items: center; gap: 0.5rem; }
        .config-input { background: #161616; border: 1px solid #2a2a2a; color: #f0ede8; font-family: inherit; font-size: 0.85rem; padding: 0.4rem 0.6rem; border-radius: 5px; width: 80px; outline: none; }
        .config-input:focus { border-color: #e8c97e55; }
        .config-display { font-size: 0.8rem; color: #e8c97e; min-width: 50px; }
        .btn-save { background: #1e1e1e; border: 1px solid #2a2a2a; color: #888; font-size: 0.72rem; padding: 0.3rem 0.6rem; border-radius: 5px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-save:hover:not(:disabled) { border-color: #e8c97e55; color: #e8c97e; }
        .btn-save:disabled { opacity: 0.4; }

        .tier-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .tier-table th { text-align: left; padding: 0.5rem 0.6rem; color: #555; font-size: 0.65rem; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #1e1e1e; }
        .tier-table td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #161616; color: #ccc; }
        .tier-table input { background: #161616; border: 1px solid #2a2a2a; color: #f0ede8; font-family: inherit; font-size: 0.8rem; padding: 0.3rem 0.5rem; border-radius: 5px; width: 70px; outline: none; }
        .tier-table input:focus { border-color: #e8c97e55; }

        .btn-gold { background: #e8c97e; color: #0a0a0a; font-weight: 700; font-family: inherit; font-size: 0.85rem; padding: 0.65rem 1.25rem; border: none; border-radius: 7px; cursor: pointer; }

        @media (max-width: 768px) {
          .admin-header { flex-direction: column; align-items: flex-start; padding: 1rem; }
          .admin-main { padding: 1rem 1rem 3rem; }
          .order-top { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}

function TierRow({ row, saving, onSave }: {
  row: TierRow;
  saving: boolean;
  onSave: (id: number, field: string, value: string) => void;
}) {
  const [price, setPrice] = useState(String(row.price_cents));

  return (
    <tr>
      <td style={{ color: "#888", textTransform: "capitalize" }}>{row.glass_type.replace(/_/g, " ")}</td>
      <td>{row.min_qty}</td>
      <td>{row.max_qty ?? "∞"}</td>
      <td>
        <input
          type="number"
          min={0}
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
      </td>
      <td style={{ color: "#e8c97e" }}>{`$${(parseInt(price) / 100).toFixed(2)}`}</td>
      <td>
        <button
          style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#888", fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "5px", cursor: "pointer" }}
          disabled={saving}
          onClick={() => onSave(row.id, "price_cents", price)}
        >
          {saving ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
