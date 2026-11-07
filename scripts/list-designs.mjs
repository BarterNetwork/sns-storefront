import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://kekrowafchdsijdolbuj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("shot_glass_designs")
  .select("id, name, image_urls, shot_glass_occasions(slug, name)")
  .order("name");

if (error) { console.error(error); process.exit(1); }

for (const d of data) {
  console.log(`${d.id}\t${d.shot_glass_occasions?.slug}\t${d.name}`);
}
console.log(`\nTotal: ${data.length}`);
