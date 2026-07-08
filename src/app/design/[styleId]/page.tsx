"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Size {
  sku: string;
  sizeName: string;
  piecePrice: number;
  qtyTotal: number;
}

interface Color {
  colorName: string;
  colorHex: string | null;
  swatchImage: string | null;
  frontImage: string | null;
  backImage: string | null;
  sizes: Size[];
}

interface Style {
  styleID: number;
  brandName: string;
  styleName: string;
  title: string;
  description: string | null;
  baseCategory: string | null;
}

interface TemplateObject {
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  left: number;
  top: number;
  fontWeight?: string;
  fontStyle?: string;
  charSpacing?: number;
}

interface Template {
  id: string;
  name: string;
  objects: TemplateObject[];
}

type View = "front" | "back";
type LeftTab = "gallery" | "text" | "images";

const FONTS = [
  // Display / Bold
  { family: "Bebas Neue",        label: "Bebas Neue",        category: "Display" },
  { family: "Anton",             label: "Anton",             category: "Display" },
  { family: "Oswald",            label: "Oswald",            category: "Display" },
  { family: "Black Ops One",     label: "Black Ops One",     category: "Display" },
  { family: "Russo One",         label: "Russo One",         category: "Display" },
  { family: "Teko",              label: "Teko",              category: "Display" },
  { family: "Righteous",         label: "Righteous",         category: "Display" },
  { family: "Abril Fatface",     label: "Abril Fatface",     category: "Display" },
  { family: "Alfa Slab One",     label: "Alfa Slab One",     category: "Display" },
  // Script / Handwriting
  { family: "Pacifico",          label: "Pacifico",          category: "Script" },
  { family: "Dancing Script",    label: "Dancing Script",    category: "Script" },
  { family: "Great Vibes",       label: "Great Vibes",       category: "Script" },
  { family: "Lobster",           label: "Lobster",           category: "Script" },
  { family: "Satisfy",           label: "Satisfy",           category: "Script" },
  // Grunge / Street
  { family: "Permanent Marker",  label: "Permanent Marker",  category: "Street" },
  { family: "Rock Salt",         label: "Rock Salt",         category: "Street" },
  { family: "Creepster",         label: "Creepster",         category: "Street" },
  { family: "Boogaloo",          label: "Boogaloo",          category: "Street" },
  { family: "Fredericka the Great", label: "Fredericka",     category: "Street" },
  // Clean / Modern
  { family: "Montserrat",        label: "Montserrat",        category: "Modern" },
  { family: "Raleway",           label: "Raleway",           category: "Modern" },
  { family: "Poppins",           label: "Poppins",           category: "Modern" },
  { family: "Playfair Display",  label: "Playfair Display",  category: "Modern" },
  { family: "Orbitron",          label: "Orbitron",          category: "Modern" },
  // Classics
  { family: "Impact",            label: "Impact",            category: "Classic" },
  { family: "Georgia",           label: "Georgia",           category: "Classic" },
  { family: "Arial",             label: "Arial",             category: "Classic" },
];

const FONT_CATEGORIES = ["All", "Display", "Script", "Street", "Modern", "Classic"];

const TEMPLATES: Record<string, Template[]> = {
  Sports: [
    {
      id: "sport-1", name: "Classic Team",
      objects: [
        { text: "TEAM NAME", fontSize: 72, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 150, charSpacing: 80 },
        { text: "EST. 2024", fontSize: 26, fontFamily: "Oswald", fill: "#e8c97e", left: 250, top: 215, fontWeight: "600" },
        { text: "UNDEFEATED", fontSize: 20, fontFamily: "Oswald", fill: "#666666", left: 250, top: 250 },
      ],
    },
    {
      id: "sport-2", name: "Number & Name",
      objects: [
        { text: "00", fontSize: 130, fontFamily: "Anton", fill: "#ffffff", left: 250, top: 155 },
        { text: "PLAYER NAME", fontSize: 32, fontFamily: "Bebas Neue", fill: "#e8c97e", left: 250, top: 250, charSpacing: 60 },
      ],
    },
    {
      id: "sport-3", name: "Champions",
      objects: [
        { text: "CHAMPIONS", fontSize: 58, fontFamily: "Black Ops One", fill: "#ffffff", left: 250, top: 140 },
        { text: "2024", fontSize: 90, fontFamily: "Russo One", fill: "#e8c97e", left: 250, top: 205 },
      ],
    },
    {
      id: "sport-4", name: "Hustle Hard",
      objects: [
        { text: "HUSTLE", fontSize: 80, fontFamily: "Teko", fill: "#ffffff", left: 250, top: 140, charSpacing: 100 },
        { text: "HARD", fontSize: 80, fontFamily: "Teko", fill: "#e8c97e", left: 250, top: 205, charSpacing: 100 },
      ],
    },
  ],
  Birthday: [
    {
      id: "bday-1", name: "Birthday Girl",
      objects: [
        { text: "Birthday", fontSize: 58, fontFamily: "Pacifico", fill: "#ff69b4", left: 250, top: 140 },
        { text: "GIRL", fontSize: 88, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 205 },
        { text: "2024", fontSize: 26, fontFamily: "Montserrat", fill: "#888", left: 250, top: 270 },
      ],
    },
    {
      id: "bday-2", name: "Birthday Squad",
      objects: [
        { text: "The Birthday", fontSize: 34, fontFamily: "Dancing Script", fill: "#e8c97e", left: 250, top: 135 },
        { text: "SQUAD", fontSize: 90, fontFamily: "Anton", fill: "#ffffff", left: 250, top: 200 },
      ],
    },
    {
      id: "bday-3", name: "Turning Up",
      objects: [
        { text: "Turning", fontSize: 44, fontFamily: "Great Vibes", fill: "#ffffff", left: 250, top: 135 },
        { text: "30", fontSize: 130, fontFamily: "Abril Fatface", fill: "#e8c97e", left: 250, top: 200 },
        { text: "& Fabulous", fontSize: 30, fontFamily: "Satisfy", fill: "#aaa", left: 250, top: 275 },
      ],
    },
    {
      id: "bday-4", name: "Celebration",
      objects: [
        { text: "LET'S", fontSize: 42, fontFamily: "Oswald", fill: "#888", left: 250, top: 130, fontWeight: "600" },
        { text: "CELEBRATE", fontSize: 64, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 175, charSpacing: 60 },
        { text: "🎉", fontSize: 40, fontFamily: "Arial", fill: "#e8c97e", left: 250, top: 245 },
      ],
    },
  ],
  Business: [
    {
      id: "biz-1", name: "Company Name",
      objects: [
        { text: "COMPANY", fontSize: 54, fontFamily: "Montserrat", fill: "#ffffff", left: 250, top: 145, fontWeight: "700" },
        { text: "NAME", fontSize: 54, fontFamily: "Montserrat", fill: "#e8c97e", left: 250, top: 205, fontWeight: "700" },
        { text: "est. 2024  •  your tagline here", fontSize: 15, fontFamily: "Raleway", fill: "#555", left: 250, top: 262 },
      ],
    },
    {
      id: "biz-2", name: "Staff",
      objects: [
        { text: "STAFF", fontSize: 100, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 170, charSpacing: 80 },
        { text: "YOUR BUSINESS NAME", fontSize: 22, fontFamily: "Oswald", fill: "#e8c97e", left: 250, top: 245, fontWeight: "600" },
      ],
    },
    {
      id: "biz-3", name: "Volunteer",
      objects: [
        { text: "VOLUNTEER", fontSize: 58, fontFamily: "Russo One", fill: "#ffffff", left: 250, top: 155 },
        { text: "making a difference", fontSize: 20, fontFamily: "Poppins", fill: "#e8c97e", left: 250, top: 215 },
      ],
    },
  ],
  Events: [
    {
      id: "event-1", name: "Family Reunion",
      objects: [
        { text: "Family", fontSize: 60, fontFamily: "Pacifico", fill: "#e8c97e", left: 250, top: 135 },
        { text: "REUNION", fontSize: 76, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 200, charSpacing: 80 },
        { text: "2024", fontSize: 30, fontFamily: "Oswald", fill: "#666", left: 250, top: 262 },
      ],
    },
    {
      id: "event-2", name: "Class Reunion",
      objects: [
        { text: "CLASS OF", fontSize: 36, fontFamily: "Oswald", fill: "#888", left: 250, top: 130, fontWeight: "600" },
        { text: "'99", fontSize: 110, fontFamily: "Abril Fatface", fill: "#ffffff", left: 250, top: 195 },
        { text: "REUNION TOUR", fontSize: 24, fontFamily: "Bebas Neue", fill: "#e8c97e", left: 250, top: 270 },
      ],
    },
    {
      id: "event-3", name: "Girls Trip",
      objects: [
        { text: "Girls Trip", fontSize: 64, fontFamily: "Dancing Script", fill: "#ffffff", left: 250, top: 155 },
        { text: "2024", fontSize: 36, fontFamily: "Montserrat", fill: "#e8c97e", left: 250, top: 225, fontWeight: "700" },
      ],
    },
    {
      id: "event-4", name: "Walk/Run",
      objects: [
        { text: "RUN FOR", fontSize: 38, fontFamily: "Oswald", fill: "#888", left: 250, top: 130, fontWeight: "600" },
        { text: "A CAUSE", fontSize: 72, fontFamily: "Black Ops One", fill: "#ffffff", left: 250, top: 185 },
        { text: "2024", fontSize: 24, fontFamily: "Raleway", fill: "#e8c97e", left: 250, top: 255 },
      ],
    },
  ],
  Faith: [
    {
      id: "faith-1", name: "Blessed",
      objects: [
        { text: "Blessed", fontSize: 88, fontFamily: "Great Vibes", fill: "#ffffff", left: 250, top: 185 },
      ],
    },
    {
      id: "faith-2", name: "Faith Over Fear",
      objects: [
        { text: "FAITH", fontSize: 88, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 140, charSpacing: 80 },
        { text: "over", fontSize: 30, fontFamily: "Dancing Script", fill: "#e8c97e", left: 250, top: 210 },
        { text: "FEAR", fontSize: 88, fontFamily: "Bebas Neue", fill: "#333333", left: 250, top: 250, charSpacing: 80 },
      ],
    },
    {
      id: "faith-3", name: "Grateful",
      objects: [
        { text: "Grateful", fontSize: 56, fontFamily: "Satisfy", fill: "#e8c97e", left: 250, top: 145 },
        { text: "Thankful", fontSize: 56, fontFamily: "Satisfy", fill: "#ffffff", left: 250, top: 205 },
        { text: "Blessed", fontSize: 56, fontFamily: "Satisfy", fill: "#888", left: 250, top: 265 },
      ],
    },
    {
      id: "faith-4", name: "His Grace",
      objects: [
        { text: "HIS", fontSize: 38, fontFamily: "Oswald", fill: "#888", left: 250, top: 130, fontWeight: "600" },
        { text: "GRACE", fontSize: 86, fontFamily: "Fredericka the Great", fill: "#ffffff", left: 250, top: 185 },
        { text: "is sufficient", fontSize: 26, fontFamily: "Dancing Script", fill: "#e8c97e", left: 250, top: 260 },
      ],
    },
  ],
  Humor: [
    {
      id: "humor-1", name: "But First Coffee",
      objects: [
        { text: "but first,", fontSize: 34, fontFamily: "Permanent Marker", fill: "#888", left: 250, top: 140 },
        { text: "COFFEE", fontSize: 82, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 200, charSpacing: 80 },
      ],
    },
    {
      id: "humor-2", name: "Adulting",
      objects: [
        { text: "I Survived", fontSize: 34, fontFamily: "Permanent Marker", fill: "#888", left: 250, top: 130 },
        { text: "ADULTING", fontSize: 66, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 185, charSpacing: 40 },
        { text: "(barely)", fontSize: 28, fontFamily: "Permanent Marker", fill: "#e8c97e", left: 250, top: 250 },
      ],
    },
    {
      id: "humor-3", name: "Dog Mom",
      objects: [
        { text: "Crazy", fontSize: 44, fontFamily: "Boogaloo", fill: "#e8c97e", left: 250, top: 140 },
        { text: "DOG MOM", fontSize: 74, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 190, charSpacing: 60 },
        { text: "and proud of it", fontSize: 22, fontFamily: "Boogaloo", fill: "#888", left: 250, top: 255 },
      ],
    },
    {
      id: "humor-4", name: "Nap Queen",
      objects: [
        { text: "NAP", fontSize: 88, fontFamily: "Anton", fill: "#ffffff", left: 250, top: 150 },
        { text: "queen", fontSize: 52, fontFamily: "Lobster", fill: "#e8c97e", left: 250, top: 225 },
      ],
    },
  ],
  Patriotic: [
    {
      id: "pat-1", name: "American Made",
      objects: [
        { text: "AMERICAN", fontSize: 56, fontFamily: "Black Ops One", fill: "#ffffff", left: 250, top: 140 },
        { text: "MADE", fontSize: 88, fontFamily: "Black Ops One", fill: "#e8c97e", left: 250, top: 200 },
      ],
    },
    {
      id: "pat-2", name: "Land of the Free",
      objects: [
        { text: "LAND OF THE FREE", fontSize: 38, fontFamily: "Bebas Neue", fill: "#888", left: 250, top: 130, charSpacing: 40 },
        { text: "HOME OF THE", fontSize: 32, fontFamily: "Oswald", fill: "#ffffff", left: 250, top: 175, fontWeight: "600" },
        { text: "BRAVE", fontSize: 90, fontFamily: "Anton", fill: "#e8c97e", left: 250, top: 218 },
      ],
    },
  ],
  Name: [
    {
      id: "name-1", name: "First & Last",
      objects: [
        { text: "FIRST NAME", fontSize: 66, fontFamily: "Bebas Neue", fill: "#ffffff", left: 250, top: 155, charSpacing: 60 },
        { text: "LAST NAME", fontSize: 30, fontFamily: "Oswald", fill: "#e8c97e", left: 250, top: 225, fontWeight: "600" },
      ],
    },
    {
      id: "name-2", name: "Script Name",
      objects: [
        { text: "Your Name", fontSize: 72, fontFamily: "Dancing Script", fill: "#ffffff", left: 250, top: 185 },
      ],
    },
    {
      id: "name-3", name: "Monogram",
      objects: [
        { text: "ABC", fontSize: 110, fontFamily: "Playfair Display", fill: "#ffffff", left: 250, top: 175, fontWeight: "700" },
        { text: "your full name", fontSize: 20, fontFamily: "Raleway", fill: "#888", left: 250, top: 262 },
      ],
    },
  ],
};

const TEMPLATE_CATEGORIES = Object.keys(TEMPLATES);

export default function DesignPage() {
  const params = useParams();
  const router = useRouter();
  const styleId = params.styleId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [style, setStyle] = useState<Style | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [activeSize, setActiveSize] = useState<Size | null>(null);
  const [view, setView] = useState<View>("front");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Left panel tab
  const [leftTab, setLeftTab] = useState<LeftTab>("gallery");
  const [galleryCategory, setGalleryCategory] = useState(TEMPLATE_CATEGORIES[0]);

  // Font picker
  const [fontCategory, setFontCategory] = useState("All");
  const [textInput, setTextInput] = useState("");
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState("Bebas Neue");
  const [textColor, setTextColor] = useState("#ffffff");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  // Print zones
  const [printFront, setPrintFront] = useState(true);
  const [printBack, setPrintBack] = useState(false);
  const [printLeftSleeve, setPrintLeftSleeve] = useState(false);
  const [printRightSleeve, setPrintRightSleeve] = useState(false);

  // Pricing
  const PRINT_FRONT = 15;
  const PRINT_BACK = 5;
  const PRINT_SLEEVE = 3;
  const REBATE_THRESHOLD = 200;
  const REBATE_AMOUNT = 50;

  // UI state
  const [removingBg, setRemovingBg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Load product
  useEffect(() => {
    fetch(`/api/products/${styleId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setStyle(data.style);
        setColors(data.colors || []);
        if (data.colors?.length > 0) setActiveColor(data.colors[0]);
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [styleId]);

  // Init Fabric after loading is done and canvas is in DOM
  useEffect(() => {
    if (loading || !canvasRef.current || fabricRef.current) return;
    import("fabric").then(({ fabric }) => {
      const canvas = new fabric.Canvas(canvasRef.current!, {
        width: 500,
        height: 500,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;
      canvas.on("selection:created", (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      canvas.on("selection:updated", (e: any) => setSelectedObj(e.selected?.[0] ?? null));
      canvas.on("selection:cleared", () => setSelectedObj(null));
      setCanvasReady(true);
    });
    return () => {
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }
    };
  }, [loading]);

  // Update background when color/view changes
  useEffect(() => {
    if (!fabricRef.current || !canvasReady) return;
    const canvas = fabricRef.current;
    const imgUrl = view === "back" ? activeColor?.backImage : activeColor?.frontImage;
    if (!imgUrl) { canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas)); return; }
    import("fabric").then(({ fabric }) => {
      fabric.Image.fromURL(
        `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`,
        (img: any) => {
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            scaleX: 500 / (img.width || 500),
            scaleY: 500 / (img.height || 500),
            originX: "left",
            originY: "top",
          });
        },
        { crossOrigin: "anonymous" }
      );
    });
  }, [activeColor, view, canvasReady]);

  const loadTemplate = useCallback((template: Template) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.getObjects().forEach((obj: any) => canvas.remove(obj));
    import("fabric").then(({ fabric }) => {
      template.objects.forEach(def => {
        const text = new fabric.IText(def.text, {
          left: def.left,
          top: def.top,
          fontSize: def.fontSize,
          fontFamily: def.fontFamily,
          fill: def.fill,
          fontWeight: def.fontWeight || "normal",
          fontStyle: def.fontStyle || "normal",
          charSpacing: def.charSpacing || 0,
          originX: "center",
          originY: "center",
          editable: true,
        });
        canvas.add(text);
      });
      canvas.renderAll();
      setSelectedObj(null);
    });
  }, []);

  const addText = useCallback(() => {
    if (!fabricRef.current || !textInput.trim()) return;
    import("fabric").then(({ fabric }) => {
      const text = new fabric.IText(textInput, {
        left: 250, top: 200, originX: "center", originY: "center",
        fontSize, fontFamily, fill: textColor,
        fontWeight: bold ? "bold" : "normal",
        fontStyle: italic ? "italic" : "normal",
        editable: true,
      });
      fabricRef.current.add(text);
      fabricRef.current.setActiveObject(text);
      fabricRef.current.renderAll();
      setTextInput("");
    });
  }, [textInput, fontSize, fontFamily, textColor, bold, italic]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(dataUrl, (img: any) => {
          const max = 200;
          if ((img.width || 0) > max) img.scaleToWidth(max);
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

  const removeBg = async () => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || obj.type !== "image") return;
    setRemovingBg(true);
    try {
      const dataUrl = obj.toDataURL({ format: "png" });
      const res = await fetch("/api/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(data.image, (newImg: any) => {
          newImg.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY });
          fabricRef.current.remove(obj);
          fabricRef.current.add(newImg);
          fabricRef.current.setActiveObject(newImg);
          fabricRef.current.renderAll();
        });
      });
    } finally {
      setRemovingBg(false);
    }
  };

  const deleteSelected = () => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    fabricRef.current.remove(obj);
    fabricRef.current.renderAll();
    setSelectedObj(null);
  };

  const undo = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects();
    if (objs.length > 0) { canvas.remove(objs[objs.length - 1]); canvas.renderAll(); }
  };

  const handleSubmitOrder = async () => {
    if (!activeSize) { setSubmitError("Please select a size."); return; }
    if (!style || !activeColor) return;
    setSubmitting(true); setSubmitError("");
    try {
      const mockupDataUrl = fabricRef.current?.toDataURL({ format: "png", multiplier: 2 }) ?? null;
      const printZones = [
        printFront && "Front",
        printBack && "Back",
        printLeftSleeve && "Left Sleeve",
        printRightSleeve && "Right Sleeve",
      ].filter(Boolean).join(", ");

      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style_id: style.styleID, brand_name: style.brandName,
          style_name: style.styleName, title: style.title,
          color: activeColor.colorName, size: activeSize.sizeName,
          sku: activeSize.sku, qty,
          garment_price: garmentPrice, print_fee: printFee,
          price_per: pricePerPiece, order_total: orderTotal,
          barter_bucks_rebate: rebatesEarned,
          print_zones: printZones, design_mockup: mockupDataUrl,
          note: `Custom design order — Print: ${printZones}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit order");
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sizes = activeColor?.sizes ?? ([] as Size[]);
  const garmentPrice = activeSize?.piecePrice ?? sizes[0]?.piecePrice ?? null;
  const printFee = (printFront ? PRINT_FRONT : 0) + (printBack ? PRINT_BACK : 0) +
    (printLeftSleeve ? PRINT_SLEEVE : 0) + (printRightSleeve ? PRINT_SLEEVE : 0);
  const pricePerPiece = garmentPrice != null ? garmentPrice + printFee : null;
  const orderTotal = pricePerPiece != null ? pricePerPiece * qty : null;
  const rebatesEarned = orderTotal != null ? Math.floor(orderTotal / REBATE_THRESHOLD) * REBATE_AMOUNT : 0;

  const filteredFonts = fontCategory === "All" ? FONTS : FONTS.filter(f => f.category === fontCategory);

  if (loading) return <div className="loading">Loading product…</div>;
  if (error || !style) return <div className="loading error">{error || "Product not found"}</div>;

  if (submitted) {
    return (
      <div className="loading" style={{ flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "3rem" }}>✅</div>
        <h2 style={{ color: "#e8c97e", margin: 0 }}>Order submitted!</h2>
        <p style={{ color: "#888", textAlign: "center", maxWidth: 320 }}>
          We received your custom design for the {style.title}. We'll be in touch to confirm your order.
        </p>
        <button className="btn-gold" onClick={() => router.push(`/product/${styleId}`)}>Back to product</button>
      </div>
    );
  }

  return (
    <div className="designer">
      {/* Header */}
      <div className="header">
        <a href={`/product/${styleId}`} className="back-link">← Back</a>
        <div className="header-title">
          <span className="brand-tag">{style.brandName}</span>
          <h1>{(style.title || style.styleName).replace(/[\x80-\x9F]/g, "").replace(/ {2,}/g, " ").trim()}</h1>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={undo}>↩ Undo</button>
          {selectedObj && (
            <>
              <button className="btn-ghost" onClick={() => { fabricRef.current?.bringForward(selectedObj); fabricRef.current?.renderAll(); }}>↑ Fwd</button>
              <button className="btn-ghost" onClick={() => { fabricRef.current?.sendBackwards(selectedObj); fabricRef.current?.renderAll(); }}>↓ Back</button>
              <button className="btn-danger" onClick={deleteSelected}>✕ Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="workspace">
        {/* ── Left panel ── */}
        <div className="panel">
          <div className="tab-row top-tabs">
            <button className={`tab ${leftTab === "gallery" ? "active" : ""}`} onClick={() => setLeftTab("gallery")}>Gallery</button>
            <button className={`tab ${leftTab === "text" ? "active" : ""}`} onClick={() => setLeftTab("text")}>Text</button>
            <button className={`tab ${leftTab === "images" ? "active" : ""}`} onClick={() => setLeftTab("images")}>Images</button>
          </div>

          {/* Gallery tab */}
          {leftTab === "gallery" && (
            <>
              <div className="cat-scroll">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setGalleryCategory(cat)}
                    className={`cat-pill ${galleryCategory === cat ? "active" : ""}`}>{cat}</button>
                ))}
              </div>
              <div className="template-grid">
                {(TEMPLATES[galleryCategory] || []).map(tpl => (
                  <button key={tpl.id} className="template-card" onClick={() => loadTemplate(tpl)}>
                    <div className="template-preview">
                      {tpl.objects.slice(0, 2).map((o, i) => (
                        <span key={i} style={{ fontFamily: o.fontFamily, color: o.fill, fontSize: Math.max(8, o.fontSize * 0.13) + "px", display: "block", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {o.text}
                        </span>
                      ))}
                    </div>
                    <p className="template-name">{tpl.name}</p>
                  </button>
                ))}
              </div>
              <p className="hint">Click a template to load it. Double-click text on canvas to edit.</p>
            </>
          )}

          {/* Text tab */}
          {leftTab === "text" && (
            <>
              <section className="tool-section">
                <p className="tool-label">Your Text</p>
                <input
                  className="text-input"
                  placeholder="Type something…"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addText()}
                />
                <div className="row">
                  <input type="number" className="size-input" value={fontSize} min={10} max={150}
                    onChange={e => setFontSize(Number(e.target.value))} />
                  <button className={`fmt-btn ${bold ? "active" : ""}`} onClick={() => setBold(b => !b)}><b>B</b></button>
                  <button className={`fmt-btn ${italic ? "active" : ""}`} onClick={() => setItalic(i => !i)}><i>I</i></button>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="color-picker" title="Text color" />
                </div>
                <button className="btn-gold" onClick={addText} disabled={!textInput.trim()}>Add to canvas</button>
              </section>

              <section className="tool-section">
                <p className="tool-label">Font</p>
                <div className="font-cat-row">
                  {FONT_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setFontCategory(c)}
                      className={`cat-pill ${fontCategory === c ? "active" : ""}`}>{c}</button>
                  ))}
                </div>
                <div className="font-list">
                  {filteredFonts.map(f => (
                    <button key={f.family} onClick={() => setFontFamily(f.family)}
                      className={`font-option ${fontFamily === f.family ? "active" : ""}`}
                      style={{ fontFamily: f.family }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Images tab */}
          {leftTab === "images" && (
            <section className="tool-section">
              <p className="tool-label">Upload Image</p>
              <p className="hint" style={{ marginBottom: "0.75rem" }}>Upload a logo, photo, or graphic and place it on the shirt.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>📁 Choose file</button>
              {selectedObj?.type === "image" && (
                <button className="btn-outline" onClick={removeBg} disabled={removingBg} style={{ marginTop: "0.5rem" }}>
                  {removingBg ? "Removing…" : "✂ Remove background"}
                </button>
              )}
              <p className="hint" style={{ marginTop: "1rem" }}>Tip: PNG files with transparent backgrounds work best.</p>
            </section>
          )}
        </div>

        {/* ── Canvas ── */}
        <div className="canvas-wrap">
          <div className="view-toggle">
            <button className={`view-btn ${view === "front" ? "active" : ""}`} onClick={() => setView("front")}>Front</button>
            {activeColor?.backImage && (
              <button className={`view-btn ${view === "back" ? "active" : ""}`} onClick={() => setView("back")}>Back</button>
            )}
          </div>
          <canvas ref={canvasRef} />
          {!canvasReady && <div className="canvas-loading">Loading canvas…</div>}
        </div>

        {/* ── Right panel ── */}
        <div className="panel right-panel">
          <section className="tool-section">
            <p className="tool-label">Color — <span className="selected-val">{activeColor?.colorName}</span></p>
            <div className="swatch-grid">
              {colors.map(c => (
                <button key={c.colorName} title={c.colorName} onClick={() => setActiveColor(c)}
                  className={`swatch ${activeColor?.colorName === c.colorName ? "active" : ""}`}>
                  {c.swatchImage
                    ? <img src={c.swatchImage} alt={c.colorName} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : null}
                  {(!c.swatchImage || true) && <span style={{ background: c.colorHex || "#555" }} />}
                </button>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Print Locations</p>
            <div className="zone-list">
              {[
                { label: "Front", price: PRINT_FRONT, val: printFront, set: setPrintFront },
                { label: "Back", price: PRINT_BACK, val: printBack, set: setPrintBack },
                { label: "Left Sleeve", price: PRINT_SLEEVE, val: printLeftSleeve, set: setPrintLeftSleeve },
                { label: "Right Sleeve", price: PRINT_SLEEVE, val: printRightSleeve, set: setPrintRightSleeve },
              ].map(z => (
                <label key={z.label} className="zone-row">
                  <input type="checkbox" checked={z.val} onChange={e => z.set(e.target.checked)} />
                  <span>{z.label}</span>
                  <span className="zone-price">+${z.price}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Size</p>
            <div className="size-grid">
              {sizes.map(s => (
                <button key={s.sku} disabled={s.qtyTotal === 0} onClick={() => setActiveSize(s)}
                  className={`size-btn ${activeSize?.sku === s.sku ? "active" : ""} ${s.qtyTotal === 0 ? "oos" : ""}`}>
                  {s.sizeName}
                </button>
              ))}
            </div>
          </section>

          <section className="tool-section">
            <p className="tool-label">Quantity</p>
            <div className="qty-row">
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span className="qty-val">{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
          </section>

          {pricePerPiece != null && (
            <section className="tool-section">
              <p className="tool-label">Price Breakdown</p>
              <div className="breakdown">
                <div className="breakdown-row"><span>Garment</span><span>${garmentPrice?.toFixed(2)}</span></div>
                {printFront && <div className="breakdown-row"><span>Front print</span><span>+${PRINT_FRONT}.00</span></div>}
                {printBack && <div className="breakdown-row"><span>Back print</span><span>+${PRINT_BACK}.00</span></div>}
                {printLeftSleeve && <div className="breakdown-row"><span>Left sleeve</span><span>+${PRINT_SLEEVE}.00</span></div>}
                {printRightSleeve && <div className="breakdown-row"><span>Right sleeve</span><span>+${PRINT_SLEEVE}.00</span></div>}
                <div className="breakdown-row total"><span>Per piece</span><span>${pricePerPiece.toFixed(2)}</span></div>
                {qty > 1 && <div className="breakdown-row total"><span>Total ({qty} pcs)</span><span>${orderTotal?.toFixed(2)}</span></div>}
              </div>
              {rebatesEarned > 0 && (
                <div className="rebate-badge">🎉 Earn <strong>{rebatesEarned} BB</strong> on this order!</div>
              )}
            </section>
          )}

          <section className="tool-section">
            <button className="btn-gold full" onClick={handleSubmitOrder} disabled={submitting || !activeSize}>
              {submitting ? "Submitting…" : "Submit Design Order →"}
            </button>
            {!activeSize && <p className="hint">Select a size to continue</p>}
            {submitError && <p className="err">{submitError}</p>}
            <p className="hint">We'll review your design and contact you to confirm.</p>
          </section>
        </div>
      </div>

      <style jsx>{`
        .designer { min-height: 100vh; background: #0a0a0a; color: #f0ede8; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
        .loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: #888; flex-direction: column; gap: 0.5rem; }
        .error { color: #c87e7e; }

        .header { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; border-bottom: 1px solid #1a1a1a; background: #0d0d0d; flex-wrap: wrap; }
        .back-link { font-size: 0.8rem; color: #666; text-decoration: none; white-space: nowrap; }
        .back-link:hover { color: #e8c97e; }
        .header-title { flex: 1; min-width: 0; }
        .header-title h1 { font-size: 0.95rem; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .brand-tag { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: #e8c97e; display: block; }
        .header-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }

        .workspace { display: grid; grid-template-columns: 280px 1fr 240px; flex: 1; min-height: 0; height: calc(100vh - 57px); }

        .panel { background: #0d0d0d; border-right: 1px solid #1a1a1a; overflow-y: auto; display: flex; flex-direction: column; }
        .right-panel { border-right: none; border-left: 1px solid #1a1a1a; padding: 0.75rem; gap: 0; }

        .top-tabs { border-bottom: 1px solid #1a1a1a; padding: 0.6rem 0.75rem; gap: 0.4rem; display: flex; }
        .tab-row { display: flex; gap: 0.4rem; }
        .tab { flex: 1; padding: 0.4rem 0.5rem; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 0.75rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .tab:hover { border-color: #e8c97e; color: #e8c97e; }
        .tab.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }

        .cat-scroll { display: flex; gap: 0.35rem; flex-wrap: wrap; padding: 0.6rem 0.75rem; border-bottom: 1px solid #1a1a1a; }
        .font-cat-row { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
        .cat-pill { padding: 0.25rem 0.6rem; border: 1px solid #2a2a2a; background: transparent; color: #666; font-size: 0.7rem; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .cat-pill:hover { border-color: #e8c97e; color: #e8c97e; }
        .cat-pill.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }

        .template-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.75rem; }
        .template-card { background: #111; border: 1px solid #222; border-radius: 8px; padding: 0.5rem; cursor: pointer; text-align: left; transition: all 0.15s; }
        .template-card:hover { border-color: #e8c97e55; background: #151515; }
        .template-preview { background: #1a1a1a; border-radius: 5px; height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 0.25rem; margin-bottom: 0.35rem; }
        .template-name { font-size: 0.65rem; color: #888; margin: 0; text-align: center; }

        .tool-section { padding: 0.75rem; border-bottom: 1px solid #1a1a1a; }
        .tool-section:last-child { border-bottom: none; }
        .tool-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #555; margin: 0 0 0.5rem; }
        .selected-val { color: #ccc; font-weight: 400; text-transform: none; letter-spacing: 0; }

        .font-list { display: flex; flex-direction: column; gap: 0.3rem; max-height: 260px; overflow-y: auto; }
        .font-option { padding: 0.45rem 0.6rem; border: 1px solid transparent; background: transparent; color: #ccc; font-size: 1rem; text-align: left; cursor: pointer; border-radius: 6px; transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .font-option:hover { background: #1a1a1a; border-color: #2a2a2a; }
        .font-option.active { border-color: #e8c97e55; background: #e8c97e12; color: #e8c97e; }

        .text-input { width: 100%; padding: 0.5rem 0.6rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.85rem; font-family: inherit; margin-bottom: 0.5rem; box-sizing: border-box; }
        .text-input:focus { outline: none; border-color: #e8c97e55; }
        .row { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; align-items: center; }
        .size-input { width: 56px; padding: 0.4rem 0.5rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0ede8; font-size: 0.78rem; text-align: center; }
        .fmt-btn { width: 32px; height: 32px; border: 1px solid #2a2a2a; background: transparent; color: #888; border-radius: 5px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
        .fmt-btn:hover, .fmt-btn.active { border-color: #e8c97e; color: #e8c97e; background: #e8c97e18; }
        .color-picker { width: 32px; height: 32px; border: 1px solid #2a2a2a; border-radius: 5px; padding: 2px; background: transparent; cursor: pointer; }
        .hidden { display: none; }

        .canvas-wrap { background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .view-toggle { display: flex; gap: 0.4rem; position: absolute; top: 0.75rem; left: 50%; transform: translateX(-50%); z-index: 10; }
        .view-btn { padding: 0.3rem 0.9rem; border: 1px solid #2a2a2a; background: #0d0d0d; color: #666; font-size: 0.72rem; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .view-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .view-btn.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }
        .canvas-loading { position: absolute; color: #555; font-size: 0.85rem; }

        .swatch-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; }
        .swatch { width: 26px; height: 26px; border-radius: 4px; border: 2px solid transparent; overflow: hidden; cursor: pointer; padding: 0; background: #1a1a1a; transition: all 0.15s; position: relative; }
        .swatch:hover { border-color: #888; transform: scale(1.1); }
        .swatch.active { border-color: #e8c97e; }
        .swatch img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .swatch span { display: block; width: 100%; height: 100%; }

        .zone-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .zone-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #ccc; cursor: pointer; }
        .zone-row input { accent-color: #e8c97e; cursor: pointer; }
        .zone-row span:nth-child(2) { flex: 1; }
        .zone-price { color: #666; font-size: 0.72rem; }

        .size-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .size-btn { padding: 0.35rem 0.6rem; border: 1px solid #2a2a2a; background: transparent; color: #ccc; font-size: 0.75rem; border-radius: 5px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .size-btn:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .size-btn.active { border-color: #e8c97e; background: #e8c97e18; color: #e8c97e; }
        .size-btn.oos { color: #333; border-color: #1e1e1e; cursor: default; }

        .qty-row { display: flex; align-items: center; border: 1px solid #2a2a2a; border-radius: 7px; overflow: hidden; width: fit-content; }
        .qty-btn { width: 32px; height: 32px; background: transparent; border: none; color: #ccc; font-size: 1rem; cursor: pointer; transition: color 0.15s; }
        .qty-btn:hover { color: #e8c97e; }
        .qty-val { min-width: 32px; text-align: center; font-size: 0.85rem; font-weight: 600; }

        .breakdown { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.6rem; }
        .breakdown-row { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; }
        .breakdown-row.total { color: #f0ede8; font-weight: 700; border-top: 1px solid #2a2a2a; padding-top: 0.25rem; margin-top: 0.15rem; }

        .rebate-badge { background: #e8c97e12; border: 1px solid #e8c97e33; border-radius: 7px; padding: 0.5rem 0.6rem; font-size: 0.75rem; color: #e8c97e; text-align: center; margin-bottom: 0.5rem; }
        .rebate-badge strong { font-weight: 700; }

        .btn-gold { background: #e8c97e; color: #0a0a0a; border: none; border-radius: 7px; padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .btn-gold:hover:not(:disabled) { background: #f0d99a; }
        .btn-gold:disabled { opacity: 0.5; cursor: default; }
        .btn-gold.full { width: 100%; padding: 0.7rem; font-size: 0.88rem; }
        .btn-outline { width: 100%; padding: 0.5rem; border: 1px solid #2a2a2a; background: transparent; color: #ccc; border-radius: 7px; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.15s; display: block; }
        .btn-outline:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .btn-outline:disabled { opacity: 0.5; cursor: default; }
        .btn-ghost { padding: 0.3rem 0.6rem; border: 1px solid #2a2a2a; background: transparent; color: #888; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #888; color: #ccc; }
        .btn-danger { padding: 0.3rem 0.6rem; border: 1px solid #c87e7e44; background: transparent; color: #c87e7e; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-danger:hover { background: #c87e7e18; }

        .hint { font-size: 0.7rem; color: #555; margin: 0.35rem 0 0; padding: 0 0.75rem; }
        .err { font-size: 0.72rem; color: #c87e7e; margin: 0.35rem 0 0; }

        @media (max-width: 960px) {
          .workspace { grid-template-columns: 1fr; height: auto; }
          .panel { border-right: none; border-bottom: 1px solid #1a1a1a; }
          .right-panel { border-left: none; border-top: 1px solid #1a1a1a; }
          .canvas-wrap { min-height: 420px; }
        }
      `}</style>
    </div>
  );
}
