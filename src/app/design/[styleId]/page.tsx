"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

interface Size { sku: string; sizeName: string; piecePrice: number; qtyTotal: number; }
interface Color { colorName: string; colorHex: string | null; swatchImage: string | null; frontImage: string | null; backImage: string | null; sizes: Size[]; }
interface Style { styleID: number; brandName: string; styleName: string; title: string; description: string | null; baseCategory: string | null; styleImage: string | null; }
interface TemplateObject { text: string; fontSize: number; fontFamily: string; fill: string; left: number; top: number; fontWeight?: string; fontStyle?: string; charSpacing?: number; }
interface Template { id: string; name: string; objects: TemplateObject[]; }
type View = "front" | "back";
type LeftTab = "gallery" | "text" | "images";

// ── Static data ───────────────────────────────────────────────────────────────

const FONTS = [
  { family: "Bebas Neue",          category: "Display" },
  { family: "Anton",               category: "Display" },
  { family: "Oswald",              category: "Display" },
  { family: "Black Ops One",       category: "Display" },
  { family: "Russo One",           category: "Display" },
  { family: "Teko",                category: "Display" },
  { family: "Righteous",           category: "Display" },
  { family: "Abril Fatface",       category: "Display" },
  { family: "Alfa Slab One",       category: "Display" },
  { family: "Pacifico",            category: "Script"  },
  { family: "Dancing Script",      category: "Script"  },
  { family: "Great Vibes",         category: "Script"  },
  { family: "Lobster",             category: "Script"  },
  { family: "Satisfy",             category: "Script"  },
  { family: "Permanent Marker",    category: "Street"  },
  { family: "Rock Salt",           category: "Street"  },
  { family: "Creepster",           category: "Street"  },
  { family: "Boogaloo",            category: "Street"  },
  { family: "Fredericka the Great",category: "Street"  },
  { family: "Montserrat",          category: "Modern"  },
  { family: "Raleway",             category: "Modern"  },
  { family: "Poppins",             category: "Modern"  },
  { family: "Playfair Display",    category: "Modern"  },
  { family: "Orbitron",            category: "Modern"  },
  { family: "Impact",              category: "Classic" },
  { family: "Georgia",             category: "Classic" },
  { family: "Arial",               category: "Classic" },
];

const FONT_CATEGORIES = ["All", "Display", "Script", "Street", "Modern", "Classic"];

const TEMPLATES: Record<string, Template[]> = {
  Sports: [
    { id: "sport-1", name: "Classic Team", objects: [
      { text: "TEAM NAME",   fontSize: 72, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 150, charSpacing: 80 },
      { text: "EST. 2024",   fontSize: 26, fontFamily: "Oswald",     fill: "#e8c97e", left: 250, top: 215, fontWeight: "600" },
      { text: "UNDEFEATED",  fontSize: 20, fontFamily: "Oswald",     fill: "#666666", left: 250, top: 250 },
    ]},
    { id: "sport-2", name: "Number & Name", objects: [
      { text: "00",          fontSize: 130, fontFamily: "Anton",      fill: "#ffffff", left: 250, top: 155 },
      { text: "PLAYER NAME", fontSize: 32,  fontFamily: "Bebas Neue", fill: "#e8c97e", left: 250, top: 250, charSpacing: 60 },
    ]},
    { id: "sport-3", name: "Champions", objects: [
      { text: "CHAMPIONS",   fontSize: 58, fontFamily: "Black Ops One", fill: "#ffffff", left: 250, top: 140 },
      { text: "2024",        fontSize: 90, fontFamily: "Russo One",     fill: "#e8c97e", left: 250, top: 205 },
    ]},
    { id: "sport-4", name: "Hustle Hard", objects: [
      { text: "HUSTLE", fontSize: 80, fontFamily: "Teko", fill: "#ffffff", left: 250, top: 140, charSpacing: 100 },
      { text: "HARD",   fontSize: 80, fontFamily: "Teko", fill: "#e8c97e", left: 250, top: 205, charSpacing: 100 },
    ]},
  ],
  Birthday: [
    { id: "bday-1", name: "Birthday Girl", objects: [
      { text: "Birthday", fontSize: 58, fontFamily: "Pacifico",   fill: "#ff69b4", left: 250, top: 140 },
      { text: "GIRL",     fontSize: 88, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 205 },
      { text: "2024",     fontSize: 26, fontFamily: "Montserrat", fill: "#888",    left: 250, top: 270 },
    ]},
    { id: "bday-2", name: "Birthday Squad", objects: [
      { text: "The Birthday", fontSize: 34, fontFamily: "Dancing Script", fill: "#e8c97e", left: 250, top: 135 },
      { text: "SQUAD",        fontSize: 90, fontFamily: "Anton",           fill: "#ffffff", left: 250, top: 200 },
    ]},
    { id: "bday-3", name: "Turning Up", objects: [
      { text: "Turning",    fontSize: 44, fontFamily: "Great Vibes",   fill: "#ffffff", left: 250, top: 135 },
      { text: "30",         fontSize: 130,fontFamily: "Abril Fatface",  fill: "#e8c97e", left: 250, top: 200 },
      { text: "& Fabulous", fontSize: 30, fontFamily: "Satisfy",        fill: "#aaa",    left: 250, top: 275 },
    ]},
    { id: "bday-4", name: "Celebration", objects: [
      { text: "LET'S",     fontSize: 42, fontFamily: "Oswald",     fill: "#888",    left: 250, top: 130, fontWeight: "600" },
      { text: "CELEBRATE", fontSize: 64, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 175, charSpacing: 60 },
    ]},
  ],
  Business: [
    { id: "biz-1", name: "Company Name", objects: [
      { text: "COMPANY", fontSize: 54, fontFamily: "Montserrat", fill: "#ffffff", left: 250, top: 145, fontWeight: "700" },
      { text: "NAME",    fontSize: 54, fontFamily: "Montserrat", fill: "#e8c97e", left: 250, top: 205, fontWeight: "700" },
      { text: "est. 2024  •  your tagline", fontSize: 15, fontFamily: "Raleway", fill: "#555", left: 250, top: 262 },
    ]},
    { id: "biz-2", name: "Staff", objects: [
      { text: "STAFF",              fontSize: 100, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 170, charSpacing: 80 },
      { text: "YOUR BUSINESS NAME", fontSize: 22,  fontFamily: "Oswald",     fill: "#e8c97e", left: 250, top: 245, fontWeight: "600" },
    ]},
    { id: "biz-3", name: "Volunteer", objects: [
      { text: "VOLUNTEER",         fontSize: 58, fontFamily: "Russo One", fill: "#ffffff", left: 250, top: 155 },
      { text: "making a difference",fontSize: 20, fontFamily: "Poppins",  fill: "#e8c97e", left: 250, top: 215 },
    ]},
  ],
  Events: [
    { id: "event-1", name: "Family Reunion", objects: [
      { text: "Family",  fontSize: 60, fontFamily: "Pacifico",   fill: "#e8c97e", left: 250, top: 135 },
      { text: "REUNION", fontSize: 76, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 200, charSpacing: 80 },
      { text: "2024",    fontSize: 30, fontFamily: "Oswald",     fill: "#666",    left: 250, top: 262 },
    ]},
    { id: "event-2", name: "Class Reunion", objects: [
      { text: "CLASS OF",     fontSize: 36,  fontFamily: "Oswald",       fill: "#888",    left: 250, top: 130, fontWeight: "600" },
      { text: "'99",          fontSize: 110, fontFamily: "Abril Fatface", fill: "#ffffff", left: 250, top: 195 },
      { text: "REUNION TOUR", fontSize: 24,  fontFamily: "Bebas Neue",   fill: "#e8c97e", left: 250, top: 270 },
    ]},
    { id: "event-3", name: "Girls Trip", objects: [
      { text: "Girls Trip", fontSize: 64, fontFamily: "Dancing Script", fill: "#ffffff", left: 250, top: 155 },
      { text: "2024",       fontSize: 36, fontFamily: "Montserrat",     fill: "#e8c97e", left: 250, top: 225, fontWeight: "700" },
    ]},
    { id: "event-4", name: "Walk/Run", objects: [
      { text: "RUN FOR", fontSize: 38, fontFamily: "Oswald",       fill: "#888",    left: 250, top: 130, fontWeight: "600" },
      { text: "A CAUSE", fontSize: 72, fontFamily: "Black Ops One",fill: "#ffffff", left: 250, top: 185 },
    ]},
  ],
  Faith: [
    { id: "faith-1", name: "Blessed", objects: [
      { text: "Blessed", fontSize: 88, fontFamily: "Great Vibes", fill: "#ffffff", left: 250, top: 185 },
    ]},
    { id: "faith-2", name: "Faith Over Fear", objects: [
      { text: "FAITH", fontSize: 88, fontFamily: "Bebas Neue",    fill: "#ffffff", left: 250, top: 140, charSpacing: 80 },
      { text: "over",  fontSize: 30, fontFamily: "Dancing Script", fill: "#e8c97e",left: 250, top: 210 },
      { text: "FEAR",  fontSize: 88, fontFamily: "Bebas Neue",    fill: "#333333", left: 250, top: 250, charSpacing: 80 },
    ]},
    { id: "faith-3", name: "Grateful", objects: [
      { text: "Grateful", fontSize: 56, fontFamily: "Satisfy", fill: "#e8c97e", left: 250, top: 145 },
      { text: "Thankful", fontSize: 56, fontFamily: "Satisfy", fill: "#ffffff", left: 250, top: 205 },
      { text: "Blessed",  fontSize: 56, fontFamily: "Satisfy", fill: "#888",    left: 250, top: 265 },
    ]},
    { id: "faith-4", name: "His Grace", objects: [
      { text: "HIS",          fontSize: 38, fontFamily: "Oswald",              fill: "#888",    left: 250, top: 130, fontWeight: "600" },
      { text: "GRACE",        fontSize: 86, fontFamily: "Fredericka the Great", fill: "#ffffff", left: 250, top: 185 },
      { text: "is sufficient", fontSize: 26, fontFamily: "Dancing Script",       fill: "#e8c97e", left: 250, top: 260 },
    ]},
  ],
  Humor: [
    { id: "humor-1", name: "But First Coffee", objects: [
      { text: "but first,", fontSize: 34, fontFamily: "Permanent Marker", fill: "#888",    left: 250, top: 140 },
      { text: "COFFEE",     fontSize: 82, fontFamily: "Bebas Neue",       fill: "#ffffff", left: 250, top: 200, charSpacing: 80 },
    ]},
    { id: "humor-2", name: "Adulting", objects: [
      { text: "I Survived", fontSize: 34, fontFamily: "Permanent Marker", fill: "#888",    left: 250, top: 130 },
      { text: "ADULTING",   fontSize: 66, fontFamily: "Bebas Neue",       fill: "#ffffff", left: 250, top: 185, charSpacing: 40 },
      { text: "(barely)",   fontSize: 28, fontFamily: "Permanent Marker", fill: "#e8c97e", left: 250, top: 250 },
    ]},
    { id: "humor-3", name: "Dog Mom", objects: [
      { text: "Crazy",           fontSize: 44, fontFamily: "Boogaloo",   fill: "#e8c97e", left: 250, top: 140 },
      { text: "DOG MOM",         fontSize: 74, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 190, charSpacing: 60 },
      { text: "and proud of it", fontSize: 22, fontFamily: "Boogaloo",   fill: "#888",    left: 250, top: 255 },
    ]},
    { id: "humor-4", name: "Nap Queen", objects: [
      { text: "NAP",   fontSize: 88, fontFamily: "Anton",   fill: "#ffffff", left: 250, top: 150 },
      { text: "queen", fontSize: 52, fontFamily: "Lobster", fill: "#e8c97e", left: 250, top: 225 },
    ]},
  ],
  Patriotic: [
    { id: "pat-1", name: "American Made", objects: [
      { text: "AMERICAN", fontSize: 56, fontFamily: "Black Ops One", fill: "#ffffff", left: 250, top: 140 },
      { text: "MADE",      fontSize: 88, fontFamily: "Black Ops One", fill: "#e8c97e", left: 250, top: 200 },
    ]},
    { id: "pat-2", name: "Land of the Free", objects: [
      { text: "LAND OF THE FREE", fontSize: 38, fontFamily: "Bebas Neue", fill: "#888",    left: 250, top: 130, charSpacing: 40 },
      { text: "HOME OF THE",      fontSize: 32, fontFamily: "Oswald",     fill: "#ffffff", left: 250, top: 175, fontWeight: "600" },
      { text: "BRAVE",            fontSize: 90, fontFamily: "Anton",      fill: "#e8c97e", left: 250, top: 218 },
    ]},
  ],
  Name: [
    { id: "name-1", name: "First & Last", objects: [
      { text: "FIRST NAME", fontSize: 66, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 155, charSpacing: 60 },
      { text: "LAST NAME",  fontSize: 30, fontFamily: "Oswald",     fill: "#e8c97e", left: 250, top: 225, fontWeight: "600" },
    ]},
    { id: "name-2", name: "Script Name", objects: [
      { text: "Your Name", fontSize: 72, fontFamily: "Dancing Script", fill: "#ffffff", left: 250, top: 185 },
    ]},
    { id: "name-3", name: "Monogram", objects: [
      { text: "ABC",           fontSize: 110, fontFamily: "Playfair Display", fill: "#ffffff", left: 250, top: 175, fontWeight: "700" },
      { text: "your full name", fontSize: 20,  fontFamily: "Raleway",          fill: "#888",    left: 250, top: 262 },
    ]},
  ],
};

const TEMPLATE_CATEGORIES = Object.keys(TEMPLATES);

const PRINT_PRICES = { Front: 15, Back: 5, "Left Sleeve": 3, "Right Sleeve": 3 };

// ── Component ─────────────────────────────────────────────────────────────────

export default function DesignPage() {
  const params  = useParams();
  const router  = useRouter();
  const styleId = params.styleId as string;

  // ── Product state ──
  const [style,       setStyle]       = useState<Style | null>(null);
  const [colors,      setColors]      = useState<Color[]>([]);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [sizeQtys,    setSizeQtys]    = useState<Record<string, number>>({});
  const [view,        setView]        = useState<View>("front");
  const canvasStates = useRef<Record<string, string>>({ front: "", back: "" });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  // ── UI state ──
  const [leftTab,          setLeftTab]          = useState<LeftTab>("gallery");
  const [galleryCategory,  setGalleryCategory]  = useState("All");
  const [fontCategory,     setFontCategory]     = useState("All");
  const [mobileTab,        setMobileTab]        = useState<"gallery"|"text"|"colors"|"order">("gallery");

  // ── DB designs ──
  const [dbDesigns,        setDbDesigns]        = useState<Record<string, Record<string, { id: string; name: string; url: string }[]>>>({});
  const [dbCategories,     setDbCategories]     = useState<string[]>([]);
  const [dbLoading,        setDbLoading]        = useState(true);
  const [gallerySubcat,    setGallerySubcat]    = useState<string>("All");
  const [featuredCats,     setFeaturedCats]     = useState<string[]>([]);
  const loadedCats         = useRef<Set<string>>(new Set());
  const [textInput,        setTextInput]        = useState("");
  const [fontSize,         setFontSize]         = useState(48);
  const [fontFamily,       setFontFamily]       = useState("Bebas Neue");
  const [textColor,        setTextColor]        = useState("#ffffff");
  const [bold,             setBold]             = useState(false);
  const [italic,           setItalic]           = useState(false);
  const [selectedObj,      setSelectedObj]      = useState<any>(null);
  const [canvasReady,      setCanvasReady]      = useState(false);
  const [removingBg,       setRemovingBg]       = useState(false);
  const [checkoutError,    setCheckoutError]    = useState("");
  const [printLocations,   setPrintLocations]   = useState({ Front: true, Back: false, "Left Sleeve": false, "Right Sleeve": false });


  // ── DOM refs ──
  // mountRef: React renders an empty div here — canvas is created imperatively
  // inside it so Fabric's DOM rewrites never conflict with React's reconciler.
  // bgRef: always mounted, src updated imperatively when view/color changes.
  const mountRef   = useRef<HTMLDivElement>(null);
  const bgRef      = useRef<HTMLImageElement>(null);
  const fabricRef  = useRef<any>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const initedRef  = useRef(false); // guard against StrictMode double-invocation

  // ── Load gallery — featured on mount, per-category on demand ──
  useEffect(() => {
    fetch("/api/gallery")
      .then(r => r.json())
      .then(d => {
        setDbCategories(d.categories || []);
        setFeaturedCats(d.featured || []);
        if (d.grouped) {
          setDbDesigns(d.grouped);
          Object.keys(d.grouped).forEach(c => loadedCats.current.add(c));
        }
      })
      .catch(() => {})
      .finally(() => setDbLoading(false));
  }, []);

  const loadCategory = (cat: string) => {
    if (loadedCats.current.has(cat)) return;
    loadedCats.current.add(cat);
    setDbLoading(true);
    fetch(`/api/gallery?category=${encodeURIComponent(cat)}`)
      .then(r => r.json())
      .then(d => {
        if (d.grouped) setDbDesigns(prev => ({ ...prev, ...d.grouped }));
      })
      .catch(() => {})
      .finally(() => setDbLoading(false));
  };

  // ── Load product ──
  useEffect(() => {
    fetch(`/api/products/${styleId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setStyle(d.style);
        setColors(d.colors || []);
        if (d.colors?.length) setActiveColor(d.colors[0]);
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [styleId]);

  // ── Init Fabric ──
  useEffect(() => {
    if (loading || !mountRef.current || initedRef.current) return;
    initedRef.current = true;

    const mount = mountRef.current;
    const canvasEl = document.createElement("canvas");
    mount.appendChild(canvasEl);

    import("fabric").then(({ fabric }) => {
      const fc = new fabric.Canvas(canvasEl, {
        width: 500, height: 500,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
      });
      fabricRef.current = fc;
      fc.on("selection:created", (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      fc.on("selection:updated", (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      fc.on("selection:cleared",  ()      => setSelectedObj(null));
      setCanvasReady(true);
    });

    return () => {
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
      mount.innerHTML = "";
      initedRef.current = false;
    };
  }, [loading]);

  // ── Update background image ──
  useEffect(() => {
    const img = bgRef.current;
    if (!img) return;
    const colorImg = view === "back" ? activeColor?.backImage : activeColor?.frontImage;
    const raw = colorImg || style?.styleImage || null;
    if (raw) {
      const src = raw.includes("ssactivewear.com")
        ? `/api/proxy-image?url=${encodeURIComponent(raw)}`
        : raw;
      img.src = src;
      img.style.opacity = "1";
    } else {
      img.src = "";
      img.style.opacity = "0";
    }
  }, [view, activeColor]);

  // ── Fabric helpers ──
  const loadTemplate = useCallback((tpl: Template) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.getObjects().forEach((o: any) => fc.remove(o));
    import("fabric").then(({ fabric }) => {
      tpl.objects.forEach(def => {
        fc.add(new fabric.IText(def.text, {
          left: def.left, top: def.top, originX: "center", originY: "center",
          fontSize: def.fontSize, fontFamily: def.fontFamily, fill: def.fill,
          fontWeight: def.fontWeight || "normal",
          fontStyle:  def.fontStyle  || "normal",
          charSpacing: def.charSpacing || 0,
          editable: true,
        }));
      });
      fc.renderAll();
      setSelectedObj(null);
    });
  }, []);

  const addText = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !textInput.trim()) return;
    import("fabric").then(({ fabric }) => {
      const t = new fabric.IText(textInput, {
        left: 250, top: 200, originX: "center", originY: "center",
        fontSize, fontFamily, fill: textColor,
        fontWeight: bold   ? "bold"   : "normal",
        fontStyle:  italic ? "italic" : "normal",
        editable: true,
      });
      fc.add(t); fc.setActiveObject(t); fc.renderAll();
      setTextInput("");
    });
  }, [textInput, fontSize, fontFamily, textColor, bold, italic]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(url, (img: any) => {
          if ((img.width || 0) > 200) img.scaleToWidth(200);
          img.set({ left: 250, top: 200, originX: "center", originY: "center" });
          fabricRef.current.add(img);
          fabricRef.current.setActiveObject(img);
          fabricRef.current.renderAll();
        });
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const placeDesignImage = (url: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    import("fabric").then(({ fabric }) => {
      // Supabase storage is public — load directly. Other CDNs go through proxy.
      const src = url.includes("supabase.co") ? url : `/api/proxy-image?url=${encodeURIComponent(url)}`;
      fabric.Image.fromURL(
        src,
        (img: any) => {
          const canvasW = fc.getWidth();
          const canvasH = fc.getHeight();
          // Scale to fill most of the canvas print area
          const targetW = canvasW * 0.25;
          const targetH = canvasH * 0.25;
          const imgW = img.width || 1;
          const imgH = img.height || 1;
          const scale = Math.min(targetW / imgW, targetH / imgH);
          img.scale(scale);
          img.set({ left: canvasW / 2, top: canvasH / 2, originX: "center", originY: "center" });
          fc.add(img);
          fc.setActiveObject(img);
          fc.renderAll();
        },
        { crossOrigin: "anonymous" }
      );
    });
  };

  const removeBg = async () => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || obj.type !== "image") return;
    setRemovingBg(true);
    try {
      const res  = await fetch("/api/remove-bg", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: obj.toDataURL({ format: "png" }) }) });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(data.image, (ni: any) => {
          ni.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY });
          fabricRef.current.remove(obj);
          fabricRef.current.add(ni);
          fabricRef.current.setActiveObject(ni);
          fabricRef.current.renderAll();
        });
      });
    } finally { setRemovingBg(false); }
  };

  const switchView = (newView: View) => {
    const fc = fabricRef.current;
    if (!fc || newView === view) return;
    // Save current view's canvas state
    canvasStates.current[view] = JSON.stringify(fc.toJSON());
    // Clear canvas and restore new view's state
    fc.clear();
    const saved = canvasStates.current[newView];
    if (saved) {
      import("fabric").then(({ fabric }) => {
        fc.loadFromJSON(saved, () => { fc.renderAll(); });
      });
    }
    setView(newView);
    setSelectedObj(null);
  };

  const deleteSelected = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) { fc.remove(obj); fc.renderAll(); setSelectedObj(null); }
  };

  const undo = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc.getObjects();
    if (objs.length) { fc.remove(objs[objs.length - 1]); fc.renderAll(); }
  };

  const handleCheckout = () => {
    if (!style || !activeColor) return;
    if (totalQty === 0) { setCheckoutError("Please enter a quantity for at least one size."); return; }
    setCheckoutError("");

    // Build a compact size summary for the title, e.g. "S×2, M×3, L×1"
    const sizeSummary = sizes
      .filter(s => (sizeQtys[s.sku] ?? 0) > 0)
      .map(s => `${s.sizeName}×${sizeQtys[s.sku]}`)
      .join(", ");

    const zones = (Object.keys(printLocations) as (keyof typeof printLocations)[])
      .filter(k => printLocations[k]).join(", ");

    const base = process.env.NEXT_PUBLIC_BARTER_NETWORK_URL || "https://barternetworkokc.com";
    const params = new URLSearchParams({
      title:       `${style.title || style.styleName} — Custom Design`,
      brand:       style.brandName,
      color:       activeColor.colorName,
      size:        sizeSummary,
      sku:         sizes.find(s => (sizeQtys[s.sku] ?? 0) > 0)?.sku || "",
      price_cents: String(Math.round(orderTotal * 100)),
      style_id:    String(style.styleID),
      image:       activeColor.frontImage || style.styleImage || "",
      notes:       `Print: ${zones} | Sizes: ${sizeSummary}`,
    });

    window.location.href = `${base}/checkout/apparel?${params}`;
  };

  // ── Derived pricing ──
  const sizes         = activeColor?.sizes ?? [];
  const printFee      = (Object.keys(printLocations) as (keyof typeof printLocations)[]).reduce((sum, k) => sum + (printLocations[k] ? PRINT_PRICES[k] : 0), 0);
  const garmentPrice  = sizes[0]?.piecePrice ?? null;
  const pricePerPiece = garmentPrice != null ? garmentPrice + printFee : null;
  const totalQty      = sizes.reduce((sum, s) => sum + (sizeQtys[s.sku] ?? 0), 0);
  const orderTotal    = sizes.reduce((sum, s) => { const q = sizeQtys[s.sku] ?? 0; return q > 0 ? sum + (s.piecePrice + printFee) * q : sum; }, 0);
  const rebate        = orderTotal > 0 ? Math.floor(orderTotal / 200) * 50 : 0;
  const filteredFonts = fontCategory === "All" ? FONTS : FONTS.filter(f => f.category === fontCategory);

  // Sanmar CDN swatch URLs return a placeholder with HTTP 200 — skip them.
  const validSwatch = (url: string | null) =>
    url?.includes("ssactivewear.com") ? url : null;

  const colorNameToHex = (name: string): string => {
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
    return "#666";
  };

  // ── Early returns ──
  if (loading) return <div className="page-center">Loading product…</div>;
  if (error || !style) return <div className="page-center err">{error || "Product not found"}</div>;

  // ── Render ──
  return (
    <div className="designer">

      {/* Header */}
      <div className="header">
        <a href={`/product/${styleId}`} className="back-link">← Back</a>
        <div className="header-center">
          <span className="brand-tag">{style.brandName}</span>
          <h1 className="header-title">{(style.title || style.styleName).replace(/[\x80-\x9F]/g, "").replace(/ {2,}/g, " ").trim()}</h1>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={undo}>↩ Undo</button>
          {selectedObj && <>
            <button className="btn-ghost" onClick={() => { fabricRef.current?.bringForward(selectedObj); fabricRef.current?.renderAll(); }}>↑ Fwd</button>
            <button className="btn-ghost" onClick={() => { fabricRef.current?.sendBackwards(selectedObj); fabricRef.current?.renderAll(); }}>↓ Back</button>
            <button className="btn-danger" onClick={deleteSelected}>✕ Delete</button>
          </>}
        </div>
      </div>

      {/* Workspace */}
      <div className="workspace">

        {/* Left panel */}
        <div className="panel left-panel">
          <div className="tab-row">
            {(["gallery", "text", "images"] as LeftTab[]).map(t => (
              <button key={t} className={`tab ${leftTab === t ? "active" : ""}`} onClick={() => setLeftTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {leftTab === "gallery" && (() => {
            const isTemplate = galleryCategory.startsWith("tpl-");
            const catSubcats = !isTemplate && galleryCategory !== "All" && galleryCategory !== ""
              ? Object.keys(dbDesigns[galleryCategory] || {}).sort()
              : [];
            const hasSubcats = catSubcats.filter(s => s !== "").length > 0;

            const visibleDesigns: { id: string; name: string; url: string }[] = (() => {
              if (isTemplate) return [];
              if (galleryCategory === "All" || galleryCategory === "") {
                return Object.values(dbDesigns).flatMap(subs => Object.values(subs).flat());
              }
              const catData = dbDesigns[galleryCategory] || {};
              if (!hasSubcats || gallerySubcat === "All") {
                return Object.values(catData).flat();
              }
              return catData[gallerySubcat] || catData[""] || [];
            })();

            return <>
              <div className="gallery-select-wrap">
                <select
                  className="gallery-select"
                  value={galleryCategory}
                  onChange={e => { const v = e.target.value; setGalleryCategory(v); setGallerySubcat("All"); if (v && !v.startsWith("tpl-") && v !== "All") loadCategory(v); }}
                >
                  <option value="All">— Choose a Category —</option>
                  {dbCategories.length > 0 && <optgroup label="My Designs">
                    {dbCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>}
                  <optgroup label="Text Templates">
                    {TEMPLATE_CATEGORIES.map(c => (
                      <option key={`tpl-${c}`} value={`tpl-${c}`}>{c}</option>
                    ))}
                  </optgroup>
                </select>

                {hasSubcats && (
                  <select
                    className="gallery-select"
                    style={{ marginTop: "0.4rem" }}
                    value={gallerySubcat}
                    onChange={e => setGallerySubcat(e.target.value)}
                  >
                    <option value="All">— Choose a Category —</option>
                    {catSubcats.filter(s => s !== "").map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* DB design images */}
              {!isTemplate && (
                dbLoading ? (
                  <p className="hint">Loading designs…</p>
                ) : visibleDesigns.length === 0 ? (
                  <p className="hint">No designs in this category yet.</p>
                ) : (
                  <div className="design-img-grid">
                    {visibleDesigns.map(d => (
                      <button key={d.id} className="design-img-card" title={d.name} onClick={() => placeDesignImage(d.url)}>
                        <img src={d.url} alt={d.name} loading="lazy" />
                        <p className="design-img-name">{d.name}</p>
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* Text templates */}
              {isTemplate && (
                <>
                  <div className="template-grid">
                    {(TEMPLATES[galleryCategory.replace("tpl-", "")] || []).map(tpl => (
                      <button key={tpl.id} className="tpl-card" onClick={() => loadTemplate(tpl)}>
                        <div className="tpl-preview">
                          {tpl.objects.slice(0, 2).map((o, i) => (
                            <span key={i} style={{ fontFamily: o.fontFamily, color: o.fill, fontSize: Math.max(8, o.fontSize * 0.13) + "px", display: "block", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.text}</span>
                          ))}
                        </div>
                        <p className="tpl-name">{tpl.name}</p>
                      </button>
                    ))}
                  </div>
                  <p className="hint">Click a template to load it. Double-click text on canvas to edit.</p>
                </>
              )}
            </>;
          })()}

          {leftTab === "text" && <>
            <div className="tool-section">
              <p className="tool-label">Your Text</p>
              <input className="text-input" placeholder="Type something…" value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addText()} />
              <div className="row">
                <input type="number" className="size-input" value={fontSize} min={10} max={150} onChange={e => setFontSize(Number(e.target.value))} />
                <button className={`fmt-btn ${bold   ? "active" : ""}`} onClick={() => setBold(b => !b)}><b>B</b></button>
                <button className={`fmt-btn ${italic ? "active" : ""}`} onClick={() => setItalic(i => !i)}><i>I</i></button>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="color-picker" title="Text color" />
              </div>
              <button className="btn-gold w-full" onClick={addText} disabled={!textInput.trim()}>Add to canvas</button>
            </div>
            <div className="tool-section">
              <p className="tool-label">Font</p>
              <div className="pill-row">
                {FONT_CATEGORIES.map(c => (
                  <button key={c} className={`pill ${fontCategory === c ? "active" : ""}`} onClick={() => setFontCategory(c)}>{c}</button>
                ))}
              </div>
              <div className="font-list">
                {filteredFonts.map(f => (
                  <button key={f.family} className={`font-opt ${fontFamily === f.family ? "active" : ""}`} style={{ fontFamily: f.family }} onClick={() => setFontFamily(f.family)}>{f.family}</button>
                ))}
              </div>
            </div>
          </>}

          {leftTab === "images" && (
            <div className="tool-section">
              <p className="tool-label">Upload Image</p>
              <p className="hint" style={{ marginBottom: "0.75rem" }}>Upload a logo, photo, or graphic to place on the shirt.</p>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
              <button className="btn-outline" onClick={() => fileRef.current?.click()}>📁 Choose file</button>
              {selectedObj?.type === "image" && (
                <button className="btn-outline" onClick={removeBg} disabled={removingBg} style={{ marginTop: "0.5rem" }}>
                  {removingBg ? "Removing…" : "✂ Remove background"}
                </button>
              )}
              <p className="hint" style={{ marginTop: "1rem" }}>Tip: PNG files with transparent backgrounds work best.</p>
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div className="canvas-wrap">
          <div className="view-toggle">
            <button className={`view-btn ${view === "front" ? "active" : ""}`} onClick={() => switchView("front")}>Front</button>
            <button className={`view-btn ${view === "back"  ? "active" : ""}`} onClick={() => switchView("back")}>Back</button>
          </div>

          {/* Stage: bg img always mounted, Fabric mount always mounted — no conditionals here */}
          <div className="canvas-stage">
            <img ref={bgRef} alt="" className="canvas-bg" src="" style={{ opacity: 0 }} />
            <div ref={mountRef} className="canvas-mount" />
          </div>

          {!canvasReady && <div className="canvas-spinner">Loading canvas…</div>}
        </div>

        {/* Right panel */}
        <div className="panel right-panel">

          <div className="tool-section">
            <p className="tool-label">Color — <span className="val">{activeColor?.colorName}</span></p>
            <div className="swatch-grid">
              {colors.map(c => (
                <button key={c.colorName} title={c.colorName}
                  className={`swatch ${activeColor?.colorName === c.colorName ? "active" : ""}`}
                  onClick={() => { setActiveColor(c); setSizeQtys({}); }}>
                  {/* dot always visible; img overlays it and hides itself on error */}
                  <span className="swatch-dot" style={{ background: c.colorHex || colorNameToHex(c.colorName) }} />
                  {validSwatch(c.swatchImage) && (
                    <img
                      src={validSwatch(c.swatchImage)!}
                      alt={c.colorName} className="swatch-img"
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-section">
            <p className="tool-label">Print Locations</p>
            {(Object.keys(PRINT_PRICES) as (keyof typeof PRINT_PRICES)[]).map(loc => (
              <label key={loc} className="zone-row">
                <input type="checkbox" checked={printLocations[loc]}
                  onChange={e => setPrintLocations(p => ({ ...p, [loc]: e.target.checked }))} />
                <span>{loc}</span>
                <span className="zone-price">+${PRINT_PRICES[loc]}</span>
              </label>
            ))}
          </div>

          <div className="tool-section">
            <p className="tool-label">Sizes &amp; Quantities</p>
            <div className="size-qty-table">
              {sizes.map(s => {
                const oos = s.qtyTotal === 0;
                return (
                  <div key={s.sku} className={`sqrow ${oos ? "sqoos" : ""}`}>
                    <span className="sq-name">{s.sizeName}</span>
                    <span className="sq-price">${(s.piecePrice + printFee).toFixed(2)}</span>
                    <input type="number" min={0} max={oos ? 0 : 999} disabled={oos}
                      value={sizeQtys[s.sku] ?? 0}
                      onChange={e => setSizeQtys(p => ({ ...p, [s.sku]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="sq-input" />
                  </div>
                );
              })}
            </div>
          </div>


          {totalQty > 0 && pricePerPiece != null && (
            <div className="tool-section">
              <p className="tool-label">Price Breakdown</p>
              <div className="breakdown">
                <div className="brow"><span>Garment</span><span>${garmentPrice?.toFixed(2)}</span></div>
                {(Object.keys(PRINT_PRICES) as (keyof typeof PRINT_PRICES)[]).filter(k => printLocations[k]).map(k => (
                  <div key={k} className="brow"><span>{k} print</span><span>+${PRINT_PRICES[k]}.00</span></div>
                ))}
                <div className="brow total"><span>Per piece</span><span>${pricePerPiece.toFixed(2)}</span></div>
                <div className="brow total"><span>Total ({totalQty} pcs)</span><span>${orderTotal.toFixed(2)}</span></div>
              </div>
              {rebate > 0 && <div className="rebate-badge">🎉 Earn <strong>{rebate} BB</strong> on this order!</div>}
            </div>
          )}

          <div className="tool-section">
            <button className="btn-gold w-full" onClick={handleCheckout}>
              Checkout →
            </button>
            {checkoutError && <p className="err">{checkoutError}</p>}
          </div>

        </div>
      </div>

      {/* ── Mobile panel + tab bar ── */}
      <div className="mobile-panel">
        {mobileTab === "gallery" && (() => {
          const isTemplate = galleryCategory.startsWith("tpl-");
          const catSubcats = !isTemplate && galleryCategory !== "All" && galleryCategory !== ""
            ? Object.keys(dbDesigns[galleryCategory] || {}).sort() : [];
          const hasSubcats = catSubcats.filter(s => s !== "").length > 0;
          const visibleDesigns: { id: string; name: string; url: string }[] = (() => {
            if (isTemplate) return [];
            if (galleryCategory === "All" || galleryCategory === "") return Object.values(dbDesigns).flatMap(subs => Object.values(subs).flat());
            const catData = dbDesigns[galleryCategory] || {};
            if (!hasSubcats || gallerySubcat === "All") return Object.values(catData).flat();
            return catData[gallerySubcat] || catData[""] || [];
          })();
          return <>
            <div className="m-selects">
              <select className="m-select" value={galleryCategory} onChange={e => { const v = e.target.value; setGalleryCategory(v); setGallerySubcat("All"); if (v && !v.startsWith("tpl-") && v !== "All") loadCategory(v); }}>
                <option value="All">— Choose a Category —</option>
                {dbCategories.length > 0 && <optgroup label="My Designs">{dbCategories.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>}
                <optgroup label="Text Templates">{TEMPLATE_CATEGORIES.map(c => <option key={`tpl-${c}`} value={`tpl-${c}`}>{c}</option>)}</optgroup>
              </select>
              {hasSubcats && <select className="m-select" value={gallerySubcat} onChange={e => setGallerySubcat(e.target.value)}>
                <option value="All">— All {galleryCategory} —</option>
                {catSubcats.filter(s => s !== "").map(s => <option key={s} value={s}>{s}</option>)}
              </select>}
            </div>
            {!isTemplate && (dbLoading ? <p className="m-hint">Loading…</p> : visibleDesigns.length === 0 ? <p className="m-hint">No designs yet.</p> : (
              <div className="m-design-grid">
                {visibleDesigns.map(d => (
                  <button key={d.id} className="m-design-card" title={d.name} onClick={() => placeDesignImage(d.url)}>
                    <img src={d.url} alt={d.name} loading="lazy" />
                    <p className="m-design-name">{d.name}</p>
                  </button>
                ))}
              </div>
            ))}
            {isTemplate && (
              <div className="m-design-grid">
                {(TEMPLATES[galleryCategory.replace("tpl-", "")] || []).map(tpl => (
                  <button key={tpl.id} className="m-design-card" onClick={() => loadTemplate(tpl)}>
                    <div className="m-tpl-preview">{tpl.objects.slice(0,2).map((o,i) => <span key={i} style={{ fontFamily: o.fontFamily, color: o.fill, fontSize: Math.max(8, o.fontSize * 0.13)+"px", display:"block", lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.text}</span>)}</div>
                    <p className="m-design-name">{tpl.name}</p>
                  </button>
                ))}
              </div>
            )}
          </>;
        })()}

        {mobileTab === "text" && (
          <div className="m-text-panel">
            <textarea className="m-text-input" placeholder="Type your text…" value={textInput} onChange={e => setTextInput(e.target.value)} rows={2} />
            <div className="m-row">
              <input type="number" className="m-size-input" value={fontSize} min={8} max={200} onChange={e => setFontSize(+e.target.value)} />
              <button className={`fmt-btn ${bold ? "active" : ""}`} onClick={() => setBold(b => !b)}><b>B</b></button>
              <button className={`fmt-btn ${italic ? "active" : ""}`} onClick={() => setItalic(i => !i)}><i>I</i></button>
              <input type="color" className="color-picker" value={textColor} onChange={e => setTextColor(e.target.value)} />
              <button className="btn-gold" onClick={addText} disabled={!textInput.trim()}>Add</button>
            </div>
            <div className="m-font-pills">
              {FONT_CATEGORIES.map(fc => <button key={fc} className={`pill ${fontCategory === fc ? "active" : ""}`} onClick={() => setFontCategory(fc)}>{fc}</button>)}
            </div>
            <div className="m-font-list">
              {FONTS.filter(f => fontCategory === "All" || f.category === fontCategory).map(f => (
                <button key={f.family} className={`font-opt ${fontFamily === f.family ? "active" : ""}`} style={{ fontFamily: f.family }} onClick={() => setFontFamily(f.family)}>{f.family}</button>
              ))}
            </div>
          </div>
        )}

        {mobileTab === "colors" && (
          <div className="m-colors-panel">
            <p className="tool-label" style={{padding:"0.75rem 0.75rem 0.25rem"}}>Color — <span className="val">{activeColor?.colorName}</span></p>
            <div className="m-swatch-grid">
              {colors.map(c => (
                <button key={c.colorName} title={c.colorName}
                  className={`swatch ${activeColor?.colorName === c.colorName ? "active" : ""}`}
                  onClick={() => { setActiveColor(c); setSizeQtys({}); }}>
                  <span className="swatch-dot" style={{ background: c.colorHex || colorNameToHex(c.colorName) }} />
                  {validSwatch(c.swatchImage) && <img src={validSwatch(c.swatchImage)!} alt={c.colorName} className="swatch-img" onError={e => { e.currentTarget.style.display = "none"; }} />}
                </button>
              ))}
            </div>
            <p className="tool-label" style={{padding:"0.75rem 0.75rem 0.25rem"}}>Print Locations</p>
            <div style={{padding:"0 0.75rem"}}>
              {(Object.keys(PRINT_PRICES) as (keyof typeof PRINT_PRICES)[]).map(loc => (
                <label key={loc} className="zone-row">
                  <input type="checkbox" checked={printLocations[loc]} onChange={e => setPrintLocations(p => ({ ...p, [loc]: e.target.checked }))} />
                  <span>{loc}</span><span className="zone-price">+${PRINT_PRICES[loc]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {mobileTab === "order" && (
          <div className="m-order-panel">
            <p className="tool-label" style={{padding:"0.75rem 0.75rem 0.25rem"}}>Sizes &amp; Quantities</p>
            <div className="size-qty-table" style={{margin:"0 0.75rem 0.75rem"}}>
              {sizes.map(s => {
                const oos = s.qtyTotal === 0;
                return (
                  <div key={s.sku} className={`sqrow ${oos ? "sqoos" : ""}`}>
                    <span className="sq-name">{s.sizeName}</span>
                    <span className="sq-price">${(s.piecePrice + printFee).toFixed(2)}</span>
                    <input type="number" min={0} max={oos ? 0 : 999} disabled={oos}
                      value={sizeQtys[s.sku] ?? 0}
                      onChange={e => setSizeQtys(p => ({ ...p, [s.sku]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="sq-input" />
                  </div>
                );
              })}
            </div>


            {totalQty > 0 && pricePerPiece != null && (
              <div style={{padding:"0 0.75rem",marginBottom:"0.75rem"}}>
                <div className="breakdown">
                  <div className="brow"><span>Garment</span><span>${garmentPrice?.toFixed(2)}</span></div>
                  {(Object.keys(PRINT_PRICES) as (keyof typeof PRINT_PRICES)[]).filter(k => printLocations[k]).map(k => (
                    <div key={k} className="brow"><span>{k} print</span><span>+${PRINT_PRICES[k]}.00</span></div>
                  ))}
                  <div className="brow total"><span>Per piece</span><span>${pricePerPiece.toFixed(2)}</span></div>
                  <div className="brow total"><span>Total ({totalQty} pcs)</span><span>${orderTotal.toFixed(2)}</span></div>
                </div>
                {rebate > 0 && <div className="rebate-badge">🎉 Earn <strong>{rebate} BB</strong> on this order!</div>}
              </div>
            )}

            <div style={{padding:"0 0.75rem"}}>
              <button className="btn-gold w-full" onClick={handleCheckout}>
                Checkout →
              </button>
              {checkoutError && <p className="err">{checkoutError}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mobile-tabbar">
        {([
          { id: "gallery", label: "Gallery", icon: "🖼" },
          { id: "text",    label: "Text",    icon: "T" },
          { id: "colors",  label: "Colors",  icon: "●" },
          { id: "order",   label: "Order",   icon: "✓" },
        ] as const).map(t => (
          <button key={t.id} className={`m-tab ${mobileTab === t.id ? "active" : ""}`} onClick={() => setMobileTab(t.id)}>
            <span className="m-tab-icon">{t.icon}</span>
            <span className="m-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .designer { height: 100vh; overflow: hidden; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
        .page-center { display: flex; align-items: center; justify-content: center; height: 100vh; color: #888; }
        .err { color: #c87e7e; }

        /* Header */
        .header { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; border-bottom: 1px solid #1a1a1a; background: #0d0d0d; }
        .back-link { font-size: 0.8rem; color: #666; text-decoration: none; white-space: nowrap; }
        .back-link:hover { color: #e8c97e; }
        .header-center { flex: 1; min-width: 0; }
        .brand-tag { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: #e8c97e; display: block; }
        .header-title { font-size: 0.95rem; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .header-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }

        /* Layout */
        .workspace { display: grid; grid-template-columns: 280px 1fr 240px; flex: 1; min-height: 0; overflow: hidden; }

        /* Panels */
        .panel { background: #0d0d0d; overflow-y: auto; display: flex; flex-direction: column; }
        .left-panel { border-right: 1px solid #1a1a1a; }
        .right-panel { border-left: 1px solid #1a1a1a; padding: 0.75rem; }

        /* Tabs */
        .tab-row { display: flex; gap: 0.4rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid #1a1a1a; }
        .tab { flex: 1; padding: 0.4rem; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 0.75rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .tab:hover { border-color: #e8c97e; color: #e8c97e; }
        .tab.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }

        /* Gallery category dropdown */
        .gallery-select-wrap { padding: 0.6rem 0.75rem; border-bottom: 1px solid #1a1a1a; }
        .gallery-select { width: 100%; padding: 0.45rem 0.6rem; background: #111; border: 1px solid #2a2a2a; border-radius: 7px; color: #f0ede8; font-size: 0.78rem; font-family: inherit; outline: none; cursor: pointer; }
        .gallery-select:focus { border-color: #e8c97e55; }

        /* Pills (font category) */
        .pill-row { display: flex; gap: 0.35rem; flex-wrap: wrap; padding: 0.6rem 0.75rem; border-bottom: 1px solid #1a1a1a; }
        .pill { padding: 0.25rem 0.6rem; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 0.7rem; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .pill:hover { border-color: #e8c97e; color: #e8c97e; }
        .pill.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }

        /* Templates */
        .template-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.75rem; }
        .tpl-card { background: #111; border: 1px solid #222; border-radius: 8px; padding: 0.5rem; cursor: pointer; text-align: left; transition: all 0.15s; }
        .tpl-card:hover { border-color: #e8c97e55; background: #151515; }
        .tpl-preview { background: #1a1a1a; border-radius: 5px; height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 0.25rem; margin-bottom: 0.35rem; }
        .tpl-name { font-size: 0.65rem; color: #888; margin: 0; text-align: center; }

        /* DB design images */
        .design-img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; padding: 0.6rem; }
        .design-img-card { background: #111; border: 1px solid #222; border-radius: 8px; padding: 0.3rem; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; align-items: center; }
        .design-img-card:hover { border-color: #e8c97e55; background: #151515; }
        .design-img-card img { width: 100%; height: 80px; object-fit: contain; border-radius: 5px; background: #1a1a1a; }
        .design-img-name { font-size: 0.6rem; color: #888; margin: 0.25rem 0 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }

        /* Tool sections */
        .tool-section { padding: 0.75rem; border-bottom: 1px solid #1a1a1a; }
        .tool-section:last-child { border-bottom: none; }
        .tool-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #555; margin: 0 0 0.5rem; }
        .val { color: #ccc; font-weight: 400; text-transform: none; letter-spacing: 0; }

        /* Text tool */
        .text-input { width: 100%; padding: 0.5rem 0.6rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.85rem; font-family: inherit; margin-bottom: 0.5rem; box-sizing: border-box; }
        .text-input:focus { outline: none; border-color: #e8c97e55; }
        .row { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; align-items: center; }
        .size-input { width: 56px; padding: 0.4rem 0.5rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.78rem; text-align: center; }
        .fmt-btn { width: 32px; height: 32px; border: 1px solid #2a2a2a; background: transparent; color: #888; border-radius: 5px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
        .fmt-btn:hover, .fmt-btn.active { border-color: #e8c97e; color: #e8c97e; background: #e8c97e18; }
        .color-picker { width: 32px; height: 32px; border: 1px solid #2a2a2a; border-radius: 5px; padding: 2px; background: transparent; cursor: pointer; }
        .font-list { display: flex; flex-direction: column; gap: 0.3rem; max-height: 260px; overflow-y: auto; margin-top: 0.5rem; }
        .font-opt { padding: 0.45rem 0.6rem; border: 1px solid transparent; background: transparent; color: #ccc; font-size: 1rem; text-align: left; cursor: pointer; border-radius: 6px; transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .font-opt:hover { background: #1a1a1a; border-color: #2a2a2a; }
        .font-opt.active { border-color: #e8c97e55; background: #e8c97e12; color: #e8c97e; }

        /* Canvas */
        .canvas-wrap { background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .view-toggle { display: flex; gap: 0.4rem; position: absolute; top: 0.75rem; z-index: 10; }
        .view-btn { padding: 0.3rem 0.9rem; border: 1px solid #2a2a2a; background: #0d0d0d; color: #666; font-size: 0.72rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .view-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .view-btn.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }
        .canvas-stage { position: relative; width: 500px; height: 500px; }
        .canvas-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; transition: opacity 0.2s; }
        .canvas-mount { position: absolute; inset: 0; }
        .canvas-spinner { position: absolute; bottom: 1rem; color: #555; font-size: 0.8rem; }

        /* Right panel */
        .swatch-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; }
        .swatch { width: 26px; height: 26px; border-radius: 4px; border: 2px solid transparent; overflow: hidden; cursor: pointer; padding: 0; background: #1a1a1a; transition: all 0.15s; position: relative; }
        .swatch:hover { border-color: #888; transform: scale(1.1); }
        .swatch.active { border-color: #e8c97e; }
        .swatch-dot { display: block; width: 100%; height: 100%; }
        .swatch-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

        .zone-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #ccc; cursor: pointer; margin-bottom: 0.35rem; }
        .zone-row input { accent-color: #e8c97e; cursor: pointer; }
        .zone-row span:nth-child(2) { flex: 1; }
        .zone-price { color: #666; font-size: 0.72rem; }

        .size-qty-table { display: flex; flex-direction: column; gap: 0.25rem; }
        .sqrow { display: grid; grid-template-columns: 3rem 1fr 4.5rem; align-items: center; gap: 0.4rem; padding: 0.3rem 0.4rem; border-radius: 6px; border: 1px solid #1e1e1e; background: #111; }
        .sqrow.sqoos { opacity: 0.35; }
        .sq-name { font-size: 0.78rem; font-weight: 700; color: #ccc; }
        .sq-price { font-size: 0.72rem; color: #666; }
        .sq-input { width: 100%; padding: 0.3rem 0.4rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 5px; color: #f0ede8; font-size: 0.82rem; text-align: center; font-family: inherit; box-sizing: border-box; }
        .sq-input:focus { outline: none; border-color: #e8c97e55; }
        .sq-input:disabled { color: #333; cursor: default; }


        /* Extra product sections */
        .extra-product-section { border-top: 1px solid #1a1a1a; }
        .extra-product-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .extra-product-name { font-size: 0.75rem; font-weight: 600; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .ep-remove { background: transparent; border: none; color: #555; cursor: pointer; font-size: 0.85rem; padding: 0.15rem 0.3rem; flex-shrink: 0; transition: color 0.15s; }
        .ep-remove:hover { color: #e8c97e; }


        .breakdown { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.6rem; }
        .brow { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; }
        .brow.total { color: #f0ede8; font-weight: 700; border-top: 1px solid #2a2a2a; padding-top: 0.25rem; margin-top: 0.15rem; }
        .rebate-badge { background: #e8c97e12; border: 1px solid #e8c97e33; border-radius: 7px; padding: 0.5rem 0.6rem; font-size: 0.75rem; color: #e8c97e; text-align: center; margin-bottom: 0.5rem; }

        /* Buttons */
        .btn-gold { background: #e8c97e; color: #0a0a0a; border: none; border-radius: 7px; padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .btn-gold:hover:not(:disabled) { background: #f0d99a; }
        .btn-gold:disabled { opacity: 0.5; cursor: default; }
        .btn-gold.w-full { width: 100%; padding: 0.7rem; font-size: 0.88rem; margin-bottom: 0.5rem; }
        .btn-outline { width: 100%; padding: 0.5rem; border: 1px solid #2a2a2a; background: transparent; color: #ccc; border-radius: 7px; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.15s; display: block; }
        .btn-outline:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .btn-outline:disabled { opacity: 0.5; cursor: default; }
        .btn-ghost { padding: 0.3rem 0.6rem; border: 1px solid #2a2a2a; background: transparent; color: #888; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #888; color: #ccc; }
        .btn-danger { padding: 0.3rem 0.6rem; border: 1px solid #c87e7e44; background: transparent; color: #c87e7e; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-danger:hover { background: #c87e7e18; }

        .hint { font-size: 0.7rem; color: #555; margin: 0.35rem 0 0; }
        .err  { font-size: 0.72rem; color: #c87e7e; margin: 0.35rem 0 0; }

        /* Mobile elements hidden on desktop */
        .mobile-panel { display: none; }
        .mobile-tabbar { display: none; }

        @media (max-width: 960px) {
          /* Full-height app shell */
          .designer { height: 100dvh; overflow: hidden; }
          /* Workspace = canvas only */
          .workspace { display: block; flex-shrink: 0; }
          .left-panel { display: none; }
          .right-panel { display: none; }
          .canvas-wrap { height: 42vh; min-height: 0; }
          .canvas-stage { width: 100% !important; height: 100% !important; }
          .header { padding: 0.5rem 1rem; }
          .header-actions { display: none; }
          .header-title { font-size: 0.85rem; }

          /* Mobile panel — scrollable content area */
          .mobile-panel { display: flex; flex-direction: column; flex: 1; overflow-y: auto; overflow-x: hidden; background: #0d0d0d; border-top: 1px solid #1a1a1a; min-height: 0; }

          /* Mobile tab bar — sticky at bottom */
          .mobile-tabbar { display: flex; flex-shrink: 0; height: 56px; background: #0d0d0d; border-top: 1px solid #1a1a1a; }
          .m-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.15rem; background: transparent; border: none; cursor: pointer; color: #555; transition: color 0.15s; font-family: inherit; padding: 0; }
          .m-tab.active { color: #e8c97e; }
          .m-tab-icon { font-size: 1.1rem; line-height: 1; }
          .m-tab-label { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.03em; }

          /* Mobile gallery */
          .m-selects { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.5rem 0.4rem; border-bottom: 1px solid #1a1a1a; }
          .m-select { width: 100%; padding: 0.5rem 0.6rem; background: #111; border: 1px solid #2a2a2a; border-radius: 7px; color: #f0ede8; font-size: 0.82rem; font-family: inherit; outline: none; }
          .m-design-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem; padding: 0.4rem; }
          .m-design-card { background: #111; border: 1px solid #222; border-radius: 8px; padding: 0.25rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; }
          .m-design-card img { width: 100%; height: 110px; object-fit: contain; border-radius: 5px; background: #1a1a1a; }
          .m-tpl-preview { width: 100%; height: 90px; background: #1a1a1a; border-radius: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.25rem; overflow: hidden; }
          .m-design-name { font-size: 0.58rem; color: #888; margin: 0.2rem 0 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
          .m-hint { color: #555; font-size: 0.8rem; padding: 1rem 0.75rem; }

          /* Mobile text panel */
          .m-text-panel { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
          .m-text-input { width: 100%; padding: 0.5rem 0.6rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.9rem; font-family: inherit; resize: none; box-sizing: border-box; }
          .m-row { display: flex; gap: 0.4rem; align-items: center; }
          .m-size-input { width: 52px; padding: 0.4rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.8rem; text-align: center; }
          .m-font-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }
          .m-font-list { display: flex; flex-direction: column; gap: 0.25rem; }

          /* Mobile colors panel */
          .m-swatch-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0 0.75rem 0.75rem; }
          .m-swatch-grid .swatch { width: 34px; height: 34px; }

          /* Mobile order panel */
          .m-order-panel { padding-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
}
