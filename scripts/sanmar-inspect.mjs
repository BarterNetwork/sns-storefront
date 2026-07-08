/**
 * SanMar EPDD inspection script
 * Connects to SanMar SFTP, downloads the EPDD file, and reports:
 * - Column names
 * - Available brands (and counts)
 * - Total row count
 *
 * Run: node scripts/sanmar-inspect.mjs
 */

import { createRequire } from "module";
import { parse } from "csv-parse";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const SftpClient = require("ssh2-sftp-client");
const AdmZip = require("adm-zip");

// Load env from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");
const envVars = fs.readFileSync(envPath, "utf8").split("\n").reduce((acc, line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) acc[k.trim()] = v.join("=").trim();
  return acc;
}, {});

const HOST = envVars.SANMAR_FTP_HOST;
const PORT = parseInt(envVars.SANMAR_FTP_PORT || "2200");
const USER = envVars.SANMAR_FTP_USER;
const PASS = envVars.SANMAR_FTP_PASS;

if (!HOST || !USER || !PASS) {
  console.error("Missing SANMAR_FTP_* credentials in .env.local");
  process.exit(1);
}

async function main() {
  const sftp = new SftpClient();

  console.log(`Connecting to ${HOST}:${PORT} as ${USER}...`);
  await sftp.connect({ host: HOST, port: PORT, username: USER, password: PASS });
  console.log("Connected.");

  // List root to find correct folder
  const root = await sftp.list("/");
  console.log("\nRoot directory contents:");
  root.forEach(f => console.log(`  ${f.type === "d" ? "[DIR]" : "[FILE]"} ${f.name}`));

  // Find the PDD folder
  const pddDir = root.find(f => f.type === "d" && f.name.toLowerCase().includes("pdd"));
  const folderName = pddDir ? `/${pddDir.name}` : "/";
  console.log(`\nUsing folder: ${folderName}`);

  // List files in that folder
  const files = await sftp.list(folderName);
  console.log(`\nFiles in ${folderName}:`);
  files.forEach(f => console.log(`  ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`));

  // Prefer the small EPDD zip over the large CSV
  const epddFile = files.find(f => f.name === "SanMar_EPDD_csv.zip")
    || files.find(f => f.name.includes("EPDD") && f.name.endsWith(".zip") && f.size < 100 * 1024 * 1024)
    || files.find(f => f.name.includes("EPDD"));
  if (!epddFile) {
    console.error("\nNo EPDD file found. Listing all files above.");
    await sftp.end();
    return;
  }

  console.log(`\nDownloading ${epddFile.name}...`);
  const buffer = await sftp.get(`${folderName}/${epddFile.name}`);
  await sftp.end();
  console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  // Extract if zip
  let csvBuffer = buffer;
  if (epddFile.name.endsWith(".zip")) {
    console.log("Extracting zip...");
    const zip = new AdmZip(buffer);
    const entry = zip.getEntries().find(e => e.entryName.endsWith(".csv"));
    if (!entry) { console.error("No CSV inside zip."); return; }
    csvBuffer = zip.readFile(entry);
    console.log(`Extracted ${entry.entryName} (${(csvBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  // Parse CSV
  console.log("\nParsing...");
  const records = await new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(csvBuffer.toString("utf8"));
    stream.pipe(
      parse({ columns: true, skip_empty_lines: true, trim: true })
        .on("data", row => results.push(row))
        .on("end", () => resolve(results))
        .on("error", reject)
    );
  });

  console.log(`\nTotal rows: ${records.length}`);

  if (records.length === 0) {
    console.log("No data found.");
    return;
  }

  // Show columns
  console.log("\nColumns:");
  Object.keys(records[0]).forEach(col => console.log(`  ${col}`));

  // Show sample row
  console.log("\nSample row:");
  console.log(JSON.stringify(records[0], null, 2));

  // Brand counts by MILL
  const millCounts = {};
  const styleNums = new Set();
  for (const r of records) {
    const b = r["MILL"] || "Unknown";
    millCounts[b] = (millCounts[b] || 0) + 1;
    styleNums.add(r["STYLE#"]);
  }
  const sorted = Object.entries(millCounts).sort((a, b) => b[1] - a[1]);
  console.log(`\nBrands (MILL) found (${sorted.length} total):`);
  sorted.forEach(([brand, count]) => console.log(`  ${brand}: ${count}`));

  // Show sample STYLE# values
  const styleSample = [...styleNums].slice(0, 20);
  console.log(`\nSample STYLE# values: ${styleSample.join(", ")}`);
  console.log(`Total unique styles: ${styleNums.size}`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
