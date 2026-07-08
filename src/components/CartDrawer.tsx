"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { cartTotal } from "@/lib/cart";

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQty, removeItem, clearCart } = useCart();
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");

  const total = cartTotal(items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) { setErr("Name and email are required."); return; }
    setErr("");
    setChecking(true);

    const itemLines = items.map(i =>
      `• ${i.brandName} ${i.styleName} — ${i.colorName}, ${i.sizeName} × ${i.qty} @ $${i.price.toFixed(2)}`
    ).join("\n");

    const body = {
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      message: `ORDER REQUEST:\n${itemLines}\n\nTotal: $${total.toFixed(2)} BB\n\nNotes: ${message}`,
      style_id: items[0]?.styleId,
      brand_name: items.map(i => i.brandName).join(", "),
      style_name: items.map(i => i.styleName).join(", "),
      color_name: items.map(i => i.colorName).join(", "),
      size_name: items.map(i => i.sizeName).join(", "),
      quantity: items.reduce((s, i) => s + i.qty, 0),
      sku: items[0]?.sku,
      barter_offer: `$${total.toFixed(2)} Barter Bucks`,
    };

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(true);
      clearCart();
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="backdrop" onClick={closeCart} />}

      <aside className={`drawer ${isOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h2 className="drawer-title">Your Cart {items.length > 0 && <span className="badge">{items.reduce((s,i)=>s+i.qty,0)}</span>}</h2>
          <button className="close-btn" onClick={closeCart}>✕</button>
        </div>

        {success ? (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h3>Order Request Submitted!</h3>
            <p>We&apos;ll contact you at {email} to confirm your Barter Bucks order.</p>
            <button className="continue-btn" onClick={() => { setSuccess(false); closeCart(); }}>
              Continue Shopping
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <p>Your cart is empty.</p>
            <button className="continue-btn" onClick={closeCart}>Browse Products</button>
          </div>
        ) : (
          <>
            <div className="items">
              {items.map(item => (
                <div key={item.sku} className="cart-item">
                  <div className="item-img-wrap">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="item-img" />
                    ) : (
                      <div className="item-img-placeholder">{item.brandName[0]}</div>
                    )}
                  </div>
                  <div className="item-info">
                    <p className="item-brand">{item.brandName}</p>
                    <p className="item-title">{item.title}</p>
                    <p className="item-variant">{item.colorName} · {item.sizeName}</p>
                    <p className="item-price">${item.price.toFixed(2)} / piece</p>
                    <div className="qty-row">
                      <button className="qty-btn" onClick={() => updateQty(item.sku, item.qty - 1)}>−</button>
                      <span className="qty-val">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.sku, item.qty + 1)}>+</button>
                      <span className="item-subtotal">${(item.price * item.qty).toFixed(2)}</span>
                      <button className="remove-btn" onClick={() => removeItem(item.sku)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="total-row">
              <span>Total</span>
              <span className="total-amount">${total.toFixed(2)} BB</span>
            </div>

            <form className="checkout-form" onSubmit={handleSubmit}>
              <p className="form-label">Request your order with Barter Bucks:</p>
              <input className="input" placeholder="Your name *" value={name} onChange={e => setName(e.target.value)} />
              <input className="input" placeholder="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="input" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
              <textarea className="input textarea" placeholder="Any notes about your order…" value={message} onChange={e => setMessage(e.target.value)} rows={2} />
              {err && <p className="err">{err}</p>}
              <button className="submit-btn" type="submit" disabled={checking}>
                {checking ? "Submitting…" : `Submit Order · $${total.toFixed(2)} BB`}
              </button>
            </form>
          </>
        )}
      </aside>

      <style jsx>{`
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; }
        .drawer {
          position: fixed; top: 0; right: 0; height: 100dvh; width: 420px; max-width: 100vw;
          background: #111; border-left: 1px solid #1e1e1e;
          display: flex; flex-direction: column;
          transform: translateX(100%); transition: transform 0.3s ease;
          z-index: 201; overflow: hidden;
        }
        .drawer.open { transform: translateX(0); }

        .drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #1e1e1e; flex-shrink: 0;
        }
        .drawer-title { font-size: 1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .badge { background: #e8c97e; color: #0a0a0a; font-size: 0.7rem; font-weight: 700; border-radius: 999px; padding: 0.1rem 0.45rem; }
        .close-btn { background: none; border: none; color: #888; font-size: 1rem; cursor: pointer; padding: 0.25rem; }
        .close-btn:hover { color: #f0ede8; }

        .empty-state, .success-state {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 0.75rem; color: #555; padding: 2rem;
        }
        .empty-icon { font-size: 2rem; }
        .success-icon { font-size: 2.5rem; color: #7ec87e; }
        .success-state h3 { color: #f0ede8; margin: 0; }
        .success-state p { font-size: 0.85rem; text-align: center; color: #888; margin: 0; }
        .continue-btn {
          margin-top: 0.5rem; padding: 0.6rem 1.5rem;
          background: none; border: 1px solid #333; color: #888;
          border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.82rem;
        }
        .continue-btn:hover { border-color: #e8c97e; color: #e8c97e; }

        .items { flex: 1; overflow-y: auto; padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .cart-item { display: flex; gap: 0.85rem; padding-bottom: 1rem; border-bottom: 1px solid #1a1a1a; }
        .item-img-wrap { width: 72px; height: 72px; flex-shrink: 0; background: #161616; border-radius: 6px; overflow: hidden; border: 1px solid #1e1e1e; }
        .item-img { width: 100%; height: 100%; object-fit: contain; padding: 4px; box-sizing: border-box; }
        .item-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #333; font-family: 'Bebas Neue', sans-serif; }

        .item-info { flex: 1; min-width: 0; }
        .item-brand { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: #e8c97e; margin: 0 0 0.15rem; }
        .item-title { font-size: 0.85rem; font-weight: 500; color: #f0ede8; margin: 0 0 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-variant { font-size: 0.75rem; color: #666; margin: 0 0 0.15rem; }
        .item-price { font-size: 0.75rem; color: #888; margin: 0 0 0.4rem; }
        .qty-row { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
        .qty-btn { width: 26px; height: 26px; border: 1px solid #2a2a2a; background: transparent; color: #ccc; border-radius: 4px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0; }
        .qty-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .qty-val { font-size: 0.85rem; font-weight: 600; min-width: 20px; text-align: center; color: #f0ede8; }
        .item-subtotal { font-size: 0.82rem; font-weight: 600; color: #f0ede8; margin-left: auto; }
        .remove-btn { background: none; border: none; color: #444; font-size: 0.7rem; cursor: pointer; padding: 0; }
        .remove-btn:hover { color: #c87e7e; }

        .total-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.5rem; border-top: 1px solid #1e1e1e; flex-shrink: 0;
        }
        .total-row > span:first-child { font-size: 0.8rem; color: #888; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
        .total-amount { font-size: 1.1rem; font-weight: 700; color: #e8c97e; }

        .checkout-form { padding: 0 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 0.6rem; flex-shrink: 0; }
        .form-label { font-size: 0.75rem; color: #666; margin: 0 0 0.2rem; }
        .input {
          background: #161616; border: 1px solid #2a2a2a; border-radius: 6px;
          color: #f0ede8; font-size: 0.85rem; padding: 0.6rem 0.75rem;
          font-family: inherit; outline: none; width: 100%; box-sizing: border-box;
        }
        .input:focus { border-color: #e8c97e44; }
        .textarea { resize: none; }
        .err { font-size: 0.75rem; color: #c87e7e; margin: 0; }
        .submit-btn {
          padding: 0.85rem; background: #e8c97e; color: #0a0a0a;
          border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; font-family: inherit; letter-spacing: 0.03em;
          transition: background 0.2s;
        }
        .submit-btn:hover:not(:disabled) { background: #f0d99a; }
        .submit-btn:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </>
  );
}
