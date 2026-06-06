#!/usr/bin/env python3
import os, sys, math
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(".env.local")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing env vars"); sys.exit(1)
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DATA_DIR = "./data"
BATCH_SIZE = 500
IMAGE_BASE = "https://www.ssactivewear.com/"
TSHIRT_ONLY = True
TSHIRT_CATEGORIES = {"T-Shirts - Premium","T-Shirts - Core","T-Shirts - Long Sleeve","Polos","Bottoms","Fleece - Premium - Hood","Fleece - Premium - Crew"}

def img_url(p):
    if not p or pd.isna(p): return None
    p = str(p).strip()
    return p if p.startswith("http") else IMAGE_BASE + p

def safe_int(v):
    try: return None if pd.isna(v) else int(v)
    except: return None

def safe_float(v):
    try:
        if pd.isna(v): return None
        f = float(v)
        return None if math.isnan(f) else round(f,2)
    except: return None

def safe_bool(v):
    if pd.isna(v): return False
    if isinstance(v,bool): return v
    return str(v).strip().upper() in ("TRUE","1","YES")

def safe_str(v):
    if pd.isna(v): return None
    s = str(v).strip()
    return s if s else None

def upsert_batch(table, rows, col):
    try: supabase.table(table).upsert(rows, on_conflict=col).execute(); return len(rows)
    except Exception as e: print(f"  error: {e}"); return 0

def in_batches(table, rows, col, label):
    total = len(rows); done = 0
    for i in range(0, total, BATCH_SIZE):
        done += upsert_batch(table, rows[i:i+BATCH_SIZE], col)
        print(f"  {label}: {done}/{total}", end="\r")
    print(f"  {label}: done {done}")
    return done

def import_categories():
    print("\n[1/3] Categories...")
    df = pd.read_excel(f"{DATA_DIR}/Categories.xlsx")
    rows = [{"category_id":safe_int(r["categoryID"]),"name":safe_str(r["name"]),"url":safe_str(r["url"]),"image":img_url(r["image"])} for _,r in df.iterrows()]
    rows = [r for r in rows if r["category_id"]]
    in_batches("categories", rows, "category_id", "Categories")

def import_styles():
    print("\n[2/3] Styles...")
    df = pd.read_excel(f"{DATA_DIR}/Styles.xlsx")
    if TSHIRT_ONLY:
        df = df[df["baseCategory"].isin(TSHIRT_CATEGORIES)]
    rows = []
    for _,row in df.iterrows():
        rows.append({"style_id":safe_int(row["styleID"]),"brand_name":safe_str(row["brandName"]),"style_name":safe_str(row["styleName"]),"title":safe_str(row.get("title")) or safe_str(row.get("uniqueStyleName")),"description":safe_str(row.get("description")),"base_category":safe_str(row.get("baseCategory")),"categories":safe_str(row.get("categories")),"style_image":img_url(row.get("styleImage")),"brand_image":img_url(row.get("brandImage")),"sustainable":safe_bool(row.get("SustainableStyle",False)),"new_style":bool(safe_int(row.get("newStyle",0)))})
    rows = [r for r in rows if r["style_id"]]
    in_batches("styles", rows, "style_id", "Styles")
    return set(r["style_id"] for r in rows)

def import_products(ids):
    print("\n[3/3] Products...")
    total = 0
    df = pd.read_excel(f"{DATA_DIR}/Products.xlsx")
    chunks = [df[i:i+10000] for i in range(0, len(df), 10000)]
    for n, chunk in enumerate(chunks, 1):
        if TSHIRT_ONLY and ids:
            chunk = chunk[chunk["styleID"].isin(ids)]
        rows = []
        for _,row in chunk.iterrows():
            wh = ["qty_IL","qty_FL","qty_KS","qty_TX","qty_GA","qty_NV","qty_OH","qty_PA"]
            qty = sum(safe_int(row.get(c,0)) or 0 for c in wh)
            rows.append({"sku":safe_str(row["sku"]),"style_id":safe_int(row["styleID"]),"brand_name":safe_str(row["brandName"]),"style_name":safe_str(row["styleName"]),"color_name":safe_str(row["colorName"]),"color_code":safe_str(row.get("colorCode")),"color_hex":safe_str(row.get("color1")),"size_name":safe_str(row["sizeName"]),"piece_price":safe_float(row.get("piecePrice")),"sale_price":safe_float(row.get("salePrice")),"retail_price":safe_float(row.get("RetailPrice")),"qty_total":qty,"image_front":img_url(row.get("colorFrontImage")),"image_back":img_url(row.get("colorBackImage")),"image_swatch":img_url(row.get("colorSwatchImage")),"active":True,"updated_at":datetime.utcnow().isoformat()})
        rows = [r for r in rows if r["sku"]]
        if rows:
            in_batches("products", rows, "sku", f"Chunk {n}")
            total += len(rows)
    print(f"\n  Total: {total}")

if __name__ == "__main__":
    start = datetime.now()
    import_categories()
    ids = import_styles()
    import_products(ids)
    print(f"\nDone in {(datetime.now()-start).seconds}s")
