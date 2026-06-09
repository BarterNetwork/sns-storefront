"use client";
import { useState } from "react";
import Link from "next/link";

interface Props {
  product: {
    style_id: number;
    brand_name: string;
    style_name: string;
    title: string;
    description: string | null;
    base_category: string;
    style_image: string | null;
    brand_image: string | null;
    sustainable: boolean;
    new_style: boolean;
    min_price: number;
    max_price: number;
    total_qty: number;
    color_count: number;
    size_count: number;
    sample_image: string | null;
  };
  onInquire: () => void;
}

export default function ProductCard({ product, onInquire }: Props) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const displayImage = !imgError
    ? (product.sample_image || product.style_image || null)
    : null;

  const priceLabel =
    product.min_price === product.max_price
      ? `$${product.min_price.toFixed(2)}`
      : `$${product.min_price.toFixed(2)} – $${product.max_price.toFixed(2)}`;

  return (
    <div
      className={`product-card ${hovered ? "hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="card-img-wrap">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.style_name}
            className="card-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="card-img-placeholder">
            <span>{product.brand_name[0]}</span>
          </div>
        )}

        {/* Badges */}
        <div className="card-badges">
          {product.new_style && <span className="badge badge-new">New</span>}
          {product.sustainable && <span className="badge badge-eco">♻ Eco</span>}
          {product.total_qty < 50 && product.total_qty > 0 && (
            <span className="badge badge-low">Low Stock</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="card-overlay">
          <Link href={`/product/${product.style_id}`} className="btn-view-link">
            View Product →
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="card-info">
        <p className="card-brand">{product.brand_name}</p>
        <Link href={`/product/${product.style_id}`} className="card-name-link">
        <h3 className="card-name">{product.title || product.style_name}</h3>
        </Link>
        <div className="card-meta">
          <span>{product.color_count} colors</span>
          <span className="dot">·</span>
          <span>{product.size_count} sizes</span>
        </div>
        <div className="card-footer">
          <span className="card-price">{priceLabel}</span>
          <span className="card-category">{product.base_category.replace("T-Shirts - ", "")}</span>
        </div>
        <Link href={`/product/${product.style_id}`} className="btn-inquire-link">
          Buy with Barter Bucks
        </Link>
      </div>

      <style jsx>{`
        .product-card {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
          cursor: pointer;
        }
        .product-card.hovered {
          border-color: #333;
          transform: translateY(-2px);
        }
        .card-img-wrap {
          position: relative;
          aspect-ratio: 1;
          background: #161616;
          overflow: hidden;
          display: block;
          text-decoration: none;
        }
        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .product-card.hovered .card-img { transform: scale(1.04); }

        .card-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3rem;
          color: #333;
          background: #141414;
        }

        .card-badges {
          position: absolute;
          top: 0.6rem;
          left: 0.6rem;
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .badge {
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.2rem 0.45rem;
          border-radius: 3px;
        }
        .badge-new  { background: #e8c97e; color: #0a0a0a; }
        .badge-eco  { background: #2d4a2d; color: #7ec87e; }
        .badge-low  { background: #4a2d2d; color: #c87e7e; }

        .card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 1.25rem;
          opacity: 0;
          transition: opacity 0.25s;
        }
        .product-card.hovered .card-overlay { opacity: 1; }

        .btn-view {
          background: #e8c97e;
          color: #0a0a0a;
          padding: 0.65rem 1.4rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 4px;
        }
        .card-name-link { text-decoration: none; color: inherit; display: block; }
        .card-name-link:hover .card-name { color: #e8c97e; }
        .btn-view-link {
          background: #e8c97e;
          color: #0a0a0a;
          padding: 0.65rem 1.4rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 4px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn-view-link:hover { background: #f0d99a; }

        .card-info { padding: 0.9rem 1rem 1rem; }
        .card-brand {
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #e8c97e;
          margin: 0 0 0.25rem;
        }
        .card-name {
          font-size: 0.92rem;
          font-weight: 500;
          color: #f0ede8;
          margin: 0 0 0.4rem;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-meta {
          font-size: 0.75rem;
          color: #666;
          display: flex;
          gap: 0.3rem;
          margin-bottom: 0.6rem;
        }
        .dot { color: #444; }
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-price {
          font-size: 0.9rem;
          font-weight: 600;
          color: #f0ede8;
        }
        .card-category {
          font-size: 0.65rem;
          color: #555;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}
