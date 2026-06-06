"use client";
import { useState } from "react";

interface Props {
  product: any;
  onClose: () => void;
}

export default function InquiryModal({ product, onClose }: Props) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    barter_offer: "Barter Bucks",
    message: "",
    quantity: "1",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_email) {
      setError("Please fill in your name and email.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style_id:    product.style_id,
          brand_name:  product.brand_name,
          style_name:  product.style_name || product.title,
          quantity:    parseInt(form.quantity) || 1,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {success ? (
          <div className="success-state">
            <span className="success-icon">✦</span>
            <h3>Order Request Sent!</h3>
            <p>We'll confirm your order and get back to you at {form.customer_email}.</p>
            <button className="btn-primary" onClick={onClose}>Continue Browsing</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div>
                <p className="modal-brand">{product.brand_name}</p>
                <h2 className="modal-title">{product.title || product.style_name}</h2>
                <p className="modal-price">
                  From ${product.min_price?.toFixed(2)} · {product.color_count} colors
                </p>
              </div>
              {(product.sample_image || product.style_image) && (
                <img
                  src={product.sample_image || product.style_image}
                  alt={product.style_name}
                  className="modal-thumb"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>

            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => update("customer_name", e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="field">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => update("customer_email", e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) => update("customer_phone", e.target.value)}
                    placeholder="(405) 555-0100"
                  />
                </div>
                <div className="field">
                  <label>Quantity Wanted</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => update("quantity", e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>Notes (optional)</label>
                <textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  rows={3}
                  placeholder="Specific colors or sizes, delivery questions…"
                />
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Place Order with Barter Bucks →"}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .modal {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          width: 100%; max-width: 600px;
          max-height: 90vh; overflow-y: auto;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          color: #f0ede8;
        }
        .modal-close {
          position: absolute; top: 1rem; right: 1rem;
          background: #1e1e1e; border: none;
          color: #888; font-size: 0.85rem;
          width: 28px; height: 28px; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .modal-close:hover { color: #f0ede8; }

        .modal-header {
          padding: 1.75rem 1.75rem 1.25rem;
          border-bottom: 1px solid #1e1e1e;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
        }
        .modal-brand { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: #e8c97e; margin: 0 0 0.3rem; }
        .modal-title { font-size: 1.3rem; font-weight: 600; margin: 0 0 0.4rem; }
        .modal-price { font-size: 0.85rem; color: #888; margin: 0; }
        .modal-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #222; flex-shrink: 0; }

        .modal-body { padding: 1.5rem 1.75rem 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.4rem; }
        .field label { font-size: 0.78rem; color: #888; letter-spacing: 0.04em; }
        .field input, .field textarea {
          background: #0a0a0a; border: 1px solid #2a2a2a;
          border-radius: 6px; padding: 0.65rem 0.85rem;
          color: #f0ede8; font-size: 0.88rem; font-family: inherit;
          outline: none; transition: border-color 0.2s; resize: vertical;
        }
        .field input:focus, .field textarea:focus { border-color: #e8c97e44; }
        .field input::placeholder, .field textarea::placeholder { color: #444; }

        .btn-primary {
          background: #e8c97e; color: #0a0a0a;
          border: none; border-radius: 6px;
          padding: 0.85rem 1.5rem; font-size: 0.9rem;
          font-weight: 700; cursor: pointer; font-family: inherit;
          letter-spacing: 0.04em; transition: background 0.2s; margin-top: 0.5rem;
        }
        .btn-primary:hover:not(:disabled) { background: #f0d99a; }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }

        .error-msg { color: #c87e7e; font-size: 0.82rem; }

        .success-state {
          padding: 3rem 2rem;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }
        .success-icon { font-size: 2rem; color: #e8c97e; }
        .success-state h3 { font-size: 1.4rem; margin: 0; }
        .success-state p { color: #888; font-size: 0.9rem; margin: 0; }

        @media (max-width: 480px) {
          .field-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
