"use client";

import { useRef } from "react";
import { Placement, imageSrc } from "@/lib/collections";

interface Props {
  garmentImage: string | null;
  designUrl: string;
  placement: Placement;
  alt?: string;
  /** When set, the design can be dragged to a new spot (admin placement editor). */
  onPlacementChange?: (p: Placement) => void;
  className?: string;
}

/**
 * A garment photo with the design laid on top. Placement is stored as fractions of
 * the photo, so the same numbers line up on every color of the style.
 */
export default function DesignMockup({ garmentImage, designUrl, placement, alt, onPlacementChange, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const src = imageSrc(garmentImage);
  const editable = !!onPlacementChange;

  const startDrag = (e: React.PointerEvent) => {
    if (!editable || !wrapRef.current) return;
    e.preventDefault();
    const rect = wrapRef.current.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const origin = { ...placement };
    const move = (ev: PointerEvent) => {
      const x = Math.min(1, Math.max(0, origin.x + (ev.clientX - startX) / rect.width));
      const y = Math.min(1, Math.max(0, origin.y + (ev.clientY - startY) / rect.height));
      onPlacementChange!({ ...origin, x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={designUrl}
        alt=""
        draggable={false}
        className={`design ${editable ? "editable" : ""}`}
        style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.w * 100}%` }}
        onPointerDown={startDrag}
      />
      <style jsx>{`
        .mockup { position: relative; width: 100%; background: #f4f2ee; border-radius: 10px; overflow: hidden; touch-action: none; }
        .garment { display: block; width: 100%; height: auto; user-select: none; }
        .garment-placeholder { width: 100%; aspect-ratio: 1; background: #e6e3dd; }
        .design { position: absolute; transform: translate(-50%, -50%); height: auto; pointer-events: none; user-select: none; }
        .design.editable { pointer-events: auto; cursor: move; outline: 1px dashed rgba(232, 201, 126, 0.9); outline-offset: 2px; }
      `}</style>
    </div>
  );
}
