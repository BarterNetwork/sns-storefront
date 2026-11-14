"use client";

import { useRef } from "react";
import { DEFAULT_SLEEVE_SPOT, Placement, Spot, imageSrc } from "@/lib/collections";

export type MockupLayer = "main" | "left" | "right";

interface Props {
  garmentImage: string | null;
  designUrl: string;
  placement: Placement;
  /** Sleeve art to draw on the photo (only the sleeves being printed). */
  sleeves?: { side: "left" | "right"; url: string }[];
  alt?: string;
  /** When set, the layer named by `editLayer` can be dragged (placement editor). */
  onPlacementChange?: (p: Placement) => void;
  editLayer?: MockupLayer;
  className?: string;
}

/** The spot a layer uses (sleeves fall back to a default spot until placed). */
export function layerSpot(p: Placement, layer: MockupLayer): Spot {
  if (layer === "main") return p;
  return p[layer] ?? DEFAULT_SLEEVE_SPOT[layer];
}

/** Return a placement with one layer's spot replaced. */
export function withLayerSpot(p: Placement, layer: MockupLayer, spot: Spot): Placement {
  if (layer === "main") return { ...p, x: spot.x, y: spot.y, w: spot.w, r: spot.r };
  return { ...p, [layer]: spot };
}

/**
 * A garment photo with the design (and any sleeve art) laid on top. Spots are stored as
 * fractions of the photo, so the same numbers line up on every color of the style.
 */
export default function DesignMockup({ garmentImage, designUrl, placement, sleeves, alt, onPlacementChange, editLayer = "main", className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const src = imageSrc(garmentImage);
  const editable = !!onPlacementChange;

  const layers: { key: MockupLayer; url: string; spot: Spot }[] = [
    { key: "main", url: designUrl, spot: placement },
    ...(sleeves || []).map(s => ({ key: s.side as MockupLayer, url: s.url, spot: layerSpot(placement, s.side) })),
  ];

  const startDrag = (e: React.PointerEvent, layer: MockupLayer) => {
    if (!editable || layer !== editLayer || !wrapRef.current) return;
    e.preventDefault();
    const rect = wrapRef.current.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const origin = { ...layerSpot(placement, layer) };
    const move = (ev: PointerEvent) => {
      const x = Math.min(1, Math.max(0, origin.x + (ev.clientX - startX) / rect.width));
      const y = Math.min(1, Math.max(0, origin.y + (ev.clientY - startY) / rect.height));
      onPlacementChange!(withLayerSpot(placement, layer, { ...origin, x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div ref={wrapRef} className={`mockup ${className || ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || ""} className="garment" draggable={false} />
      ) : (
        <div className="garment-placeholder" />
      )}
      {layers.map(l => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={l.key}
          src={l.url}
          alt=""
          draggable={false}
          className={`design ${editable && l.key === editLayer ? "editable" : ""} ${editable && l.key !== editLayer ? "dim" : ""}`}
          style={{
            left: `${l.spot.x * 100}%`,
            top: `${l.spot.y * 100}%`,
            width: `${l.spot.w * 100}%`,
            transform: `translate(-50%, -50%) rotate(${l.spot.r ?? 0}deg)`,
          }}
          onPointerDown={e => startDrag(e, l.key)}
        />
      ))}
      <style jsx>{`
        .mockup { position: relative; width: 100%; background: #f4f2ee; border-radius: 10px; overflow: hidden; touch-action: none; }
        .garment { display: block; width: 100%; height: auto; user-select: none; }
        .garment-placeholder { width: 100%; aspect-ratio: 1; background: #e6e3dd; }
        .design { position: absolute; height: auto; pointer-events: none; user-select: none; }
        .design.editable { pointer-events: auto; cursor: move; outline: 1px dashed rgba(232, 201, 126, 0.95); outline-offset: 2px; z-index: 2; }
        .design.dim { opacity: 0.55; }
      `}</style>
    </div>
  );
}
