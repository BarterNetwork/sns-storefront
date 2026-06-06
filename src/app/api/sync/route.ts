import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStyles, getProducts, getInventory } from "@/lib/sns-api";

const IMG = "https://www.ssactivewear.com/";
const img = (path: string | null | undefined) =>
  path ? `${IMG}${path}` : null;

/**
 * POST /api/sync
 * Authorization: Bearer <SYNC_SECRET>
 *
 * ?mode=bootstrap   First-ever load — all styles + all SKUs + inventory
 * ?mode=full        Weekly — refresh styles + inventory
 * ?mode=inventory   Daily  — qty + price update only (default)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.SYNC_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") || "inventory";
  const db = supabaseAdmin();
  const t0 = Date.now();
  const log: string[] = [];

  try {

    // ── Helpers ──────────────────────────────────────────────────────────
    async function upsertStyles(styles: any[]) {
      const rows = styles.map((s: any) => ({
        styleID:      s.styleID,
        brandName:    s.brandName,
        styleName:    s.styleName,
        title:        s.title || s.uniqueStyleName || s.styleName,
        description:  s.description || null,
        baseCategory: s.baseCategory || null,
        categories:   Array.isArray(s.categories)
                        ? s.categories.join(",")
                        : (s.categories || null),
        styleImage:   img(s.styleImage),
        brandImage:   img(s.brandImage),
        sustainable:  s.sustainableStyle === true,
        newStyle:     s.newStyle === true,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db
          .from("styles")
          .upsert(rows.slice(i, i + 500), { onConflict: "styleID" });
        if (error) throw new Error(`Style upsert: ${error.message}`);
      }
      log.push(`Upserted ${rows.length} styles`);
    }

    async function upsertInventory(inventory: any[]) {
      const rows = inventory.map((item: any) => {
        const wh: Record<string, number> = {};
        (item.warehouses || []).forEach((w: any) => {
          wh[w.warehouseAbbr] = w.qty || 0;
        });
        const total =
          (wh.IL || 0) + (wh.FL || 0) + (wh.KS || 0) + (wh.TX || 0) +
          (wh.GA || 0) + (wh.NV || 0) + (wh.OH || 0) + (wh.PA || 0);

        return {
          sku:            item.sku,
          qtyTotal:       item.qty ?? total,
          qtyIl:          wh.IL || 0,
          qtyFl:          wh.FL || 0,
          qtyKs:          wh.KS || 0,
          qtyTx:          wh.TX || 0,
          qtyGa:          wh.GA || 0,
          qtyNv:          wh.NV || 0,
          qtyOh:          wh.OH || 0,
          qtyPa:          wh.PA || 0,
          piecePrice:     item.piecePrice ?? null,
          salePrice:      item.salePrice ?? null,
          saleExpireDate: item.saleExpireDate || null,
          updatedAt:      new Date().toISOString(),
        };
      });

      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db
          .from("products")
          .upsert(rows.slice(i, i + 500), { onConflict: "sku" });
        if (error) throw new Error(`Inventory upsert: ${error.message}`);
      }
      log.push(`Updated inventory for ${rows.length} SKUs`);

      // Deactivate SKUs no longer returned by the API
      const activeSKUs = inventory.map((i: any) => i.sku);
      if (activeSKUs.length > 0) {
        await db
          .from("products")
          .update({ active: false, updatedAt: new Date().toISOString() })
          .not("sku", "in", `(${activeSKUs.slice(0, 5000).map((s: string) => `"${s}"`).join(",")})`)
          .eq("active", true);
      }
    }

    // ── BOOTSTRAP ────────────────────────────────────────────────────────
    if (mode === "bootstrap") {
      log.push("Fetching all styles...");
      const allStyles = await getStyles();
      log.push(`Got ${allStyles.length} styles`);
      await upsertStyles(allStyles);

      log.push("Fetching all products (SKUs)...");
      const allProducts = await getProducts();
      log.push(`Got ${allProducts.length} SKUs`);

      const productRows = allProducts.map((p: any) => {
        const wh: Record<string, any> = {};
        (p.warehouses || []).forEach((w: any) => { wh[w.warehouseAbbr] = w; });
        const total =
          (wh.IL?.qty || 0) + (wh.FL?.qty || 0) + (wh.KS?.qty || 0) +
          (wh.TX?.qty || 0) + (wh.GA?.qty || 0) + (wh.NV?.qty || 0) +
          (wh.OH?.qty || 0) + (wh.PA?.qty || 0);

        return {
          sku:                  p.sku,
          gtin:                 p.gtin || null,
          styleId:              p.styleID,
          brandName:            p.brandName,
          styleName:            p.styleName,
          colorName:            p.colorName || null,
          colorCode:            p.colorCode || null,
          colorHex:             p.color1 || null,
          colorGroup:           p.colorGroupName || p.colorGroup || null,
          colorFamily:          p.colorFamily || null,
          sizeName:             p.sizeName || null,
          sizeCode:             p.sizeCode || null,
          sizeOrder:            p.sizeOrder || null,
          piecePrice:           p.piecePrice ?? null,
          dozenPrice:           p.dozenPrice ?? null,
          casePrice:            p.casePrice ?? null,
          salePrice:            p.salePrice ?? null,
          retailPrice:          p.retailPrice ?? null,
          mapPrice:             p.mapPrice ?? null,
          saleExpireDate:       p.saleExpireDate || null,
          qtyTotal:             p.qty ?? total,
          qtyIl:                wh.IL?.qty || 0,
          qtyFl:                wh.FL?.qty || 0,
          qtyKs:                wh.KS?.qty || 0,
          qtyTx:                wh.TX?.qty || 0,
          qtyGa:                wh.GA?.qty || 0,
          qtyNv:                wh.NV?.qty || 0,
          qtyOh:                wh.OH?.qty || 0,
          qtyPa:                wh.PA?.qty || 0,
          colorFrontImage:      img(p.colorFrontImage),
          colorBackImage:       img(p.colorBackImage),
          colorSideImage:       img(p.colorSideImage),
          colorSwatchImage:     img(p.colorSwatchImage),
          colorOnModelFrontImage: img(p.colorOnModelFrontImage),
          imageFront:           img(p.colorFrontImage),
          imageBack:            img(p.colorBackImage),
          imageSide:            img(p.colorSideImage),
          imageSwatch:          img(p.colorSwatchImage),
          imageOnModel:         img(p.colorOnModelFrontImage),
          active:               true,
          closeout:             wh.KS?.closeout || false,
          returnable:           wh.KS?.returnable !== false,
          dropShipOnly:         wh.DS?.dropship || false,
          caseQty:              p.caseQty ?? null,
          unitWeight:           p.unitWeight ?? null,
          updatedAt:            new Date().toISOString(),
        };
      });

      for (let i = 0; i < productRows.length; i += 500) {
        const { error } = await db
          .from("products")
          .upsert(productRows.slice(i, i + 500), { onConflict: "sku" });
        if (error) throw new Error(`Product upsert at batch ${i}: ${error.message}`);
        log.push(`  ${Math.min(i + 500, productRows.length)}/${productRows.length} SKUs upserted`);
      }
      log.push("Bootstrap complete");
    }

    // ── FULL (weekly) ────────────────────────────────────────────────────
    else if (mode === "full") {
      log.push("Fetching all styles...");
      const styles = await getStyles();
      log.push(`Got ${styles.length} styles`);
      await upsertStyles(styles);

      log.push("Fetching inventory...");
      const inventory = await getInventory();
      await upsertInventory(inventory);
    }

    // ── INVENTORY (daily) ────────────────────────────────────────────────
    else {
      log.push("Fetching inventory...");
      const inventory = await getInventory();
      await upsertInventory(inventory);
    }

    await db.from("sync_log").insert({
      mode,
      status: "success",
      duration_ms: Date.now() - t0,
      message: log.join(" | "),
    }).then(() => {});

    return NextResponse.json({ success: true, mode, duration_ms: Date.now() - t0, log });

  } catch (err: any) {
    console.error("Sync error:", err);
    await db.from("sync_log").insert({
      mode, status: "error",
      duration_ms: Date.now() - t0,
      message: err.message,
    }).then(() => {});
    return NextResponse.json({ success: false, error: err.message, log }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
