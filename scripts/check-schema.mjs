import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  "https://kekrowafchdsijdolbuj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. All occasions
const { data: occasions } = await admin
  .from("shot_glass_occasions")
  .select("id, slug, name")
  .order("name");
console.log("\n=== OCCASIONS ===");
for (const o of occasions) console.log(`  ${o.id}  ${o.slug}  "${o.name}"`);

// 2. Existing "Celebration Shot Glass Tag Collection" records
const { data: celeb, error: celebErr } = await admin
  .from("shot_glass_designs")
  .select("id, name, occasion_id, shot_glass_occasions(slug), image_urls")
  .ilike("name", "%Celebration Shot Glass Tag Collection%")
  .order("occasion_id");
if (celebErr) console.error("celeb error:", celebErr);
console.log("\n=== EXISTING CELEBRATION RECORDS ===");
for (const d of (celeb ?? [])) {
  console.log(`  occasion_id=${d.occasion_id}  slug=${d.shot_glass_occasions?.slug}  images=${d.image_urls?.length ?? 0}  id=${d.id}`);
}

// 3. Birthday luxury designs (to check if we need to append images to them)
const targetDesignIds = [
  "83fb8cf5-e7c6-4905-88d9-56f0cbe00b93", // Luxury Birthday Shot Glass Tag Collection
  "18f5732b-eaa9-41a3-89d4-659e9e9eef6a", // Luxury Shot Glass Gift Tag Collection
  "d52c83c7-776f-4407-a031-0c06e13449a5", // Elegant Shot Glass Birthday Tag Collection
];
const { data: bdayDesigns } = await admin
  .from("shot_glass_designs")
  .select("id, name, occasion_id, shot_glass_occasions(slug), image_urls")
  .in("id", targetDesignIds);
console.log("\n=== BIRTHDAY LUXURY/ELEGANT DESIGNS (for append check) ===");
for (const d of (bdayDesigns ?? [])) {
  console.log(`  ${d.id}  "${d.name}"  occ=${d.shot_glass_occasions?.slug}  images=${d.image_urls?.length ?? 0}`);
  for (const u of (d.image_urls ?? [])) console.log(`    ${u.split("/recut/")[1] ?? u.split("/").pop()}`);
}
