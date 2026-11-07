import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const supabase = createClient(
  "https://kekrowafchdsijdolbuj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("shot_glass_designs")
  .select("id, name, shot_glass_occasions(slug, name)")
  .order("name");

if (error) { console.error(error); process.exit(1); }

const rows = ["id,occasion_slug,occasion_name,design_name"];
for (const d of data) {
  const occ = d.shot_glass_occasions;
  rows.push(`"${d.id}","${occ?.slug ?? ""}","${occ?.name ?? ""}","${d.name}"`);
}

writeFileSync("designs-export.csv", rows.join("\n"));
console.log(`Exported ${data.length} designs to designs-export.csv`);
