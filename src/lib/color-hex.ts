// Many SanMar-sourced styles (Port Authority, Port & Co, District, Sport-Tek…) have no
// colorHex in the catalog, and SanMar's swatch images are placeholders. Guess a display
// color from the color name so swatches never render blank.
export function colorNameToHex(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("white") || n.includes("ivory")) return "#f0ede8";
  if (n.includes("cream") || n.includes("creme") || n.includes("natural")) return "#e8dfc8";
  if (n === "black") return "#111";
  if (n.includes("black")) return "#2a2a2a";
  if (n.includes("charcoal")) return "#3c3c3c";
  if (n.includes("coal")) return "#484848";
  if (n.includes("dark grey") || n.includes("dark gray")) return "#555";
  if (n.includes("tundra") || n.includes("stonewash") || n.includes("chambray")) return "#7a9ab5";
  if (n.includes("silver") || n.includes("ash") || n.includes("grey") || n.includes("gray")) return "#888";
  if (n.includes("navy")) return "#1a2848";
  if (n.includes("royal")) return "#1a3fa0";
  if (n.includes("cobalt")) return "#1a5fd0";
  if (n.includes("carolina")) return "#4a8cc8";
  if (n.includes("sky") || n.includes("powder") || n.includes("ice blue")) return "#8ab8d8";
  if (n.includes("neptune") || n.includes("peacock")) return "#2a7a8a";
  if (n.includes("teal") || n.includes("turquoise")) return "#1a8a8a";
  if (n.includes("blue")) return "#2a5a9a";
  if (n.includes("forest") || n.includes("hunter")) return "#1a4a1a";
  if (n.includes("olive") || n.includes("drab")) return "#5a5a2a";
  if (n.includes("sage") || n.includes("laurel") || n.includes("clover")) return "#6a8a6a";
  if (n.includes("lime") || n.includes("safety green") || n.includes("neon green")) return "#5aaa20";
  if (n.includes("green") || n.includes("kelly")) return "#2a7a2a";
  if (n.includes("lemon") || n.includes("yellow")) return "#d4c040";
  if (n.includes("gold") || n.includes("zinnia") || n.includes("sunflower")) return "#c8a000";
  if (n.includes("orange") || n.includes("burnt")) return "#d45820";
  if (n.includes("coral") || n.includes("salmon")) return "#e08070";
  if (n.includes("peach") || n.includes("melon")) return "#dda888";
  if (n.includes("hot pink") || n.includes("neon pink") || n.includes("safety pink")) return "#f020a0";
  if (n.includes("pink") || n.includes("rose") || n.includes("flamingo") || n.includes("blossom")) return "#d88098";
  if (n.includes("red") || n.includes("cherry") || n.includes("cardinal") || n.includes("sangria")) return "#b02020";
  if (n.includes("maroon") || n.includes("garnet") || n.includes("burgundy") || n.includes("wine")) return "#6a1a1a";
  if (n.includes("lavender") || n.includes("lilac")) return "#9a7ab5";
  if (n.includes("purple") || n.includes("violet") || n.includes("iris")) return "#6a3a8a";
  if (n.includes("plum") || n.includes("eggplant")) return "#4a1a5a";
  if (n.includes("espresso") || n.includes("chocolate") || n.includes("brown")) return "#4a2a1a";
  if (n.includes("tan") || n.includes("khaki") || n.includes("sand") || n.includes("adobe")) return "#b89a6a";
  if (n.includes("oxford") || n.includes("heather") || n.includes("melange") || n.includes("smoke")) return "#8a8a8a";
  return "#666";
}

/** CSS color for a swatch: the catalog hex when present, else a guess from the name. */
export function swatchColor(c: { colorHex: string | null; colorName: string }): string {
  if (c.colorHex) return c.colorHex.startsWith("#") ? c.colorHex : `#${c.colorHex}`;
  return colorNameToHex(c.colorName || "");
}
