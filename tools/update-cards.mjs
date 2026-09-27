// Regenerates cards.json from Scryfall's Oracle Cards bulk data.
//
// Usage:  node tools/update-cards.mjs
//
// Ships a snapshot of every card's name and EDHREC play-rank alongside
// index.html, since the published page can't call the Scryfall API live
// (only same-origin requests are allowed once this runs somewhere with a
// restrictive CSP; on plain GitHub Pages it isn't required, but keeping the
// data bundled means the app also works if you ever host it that way).
//
// Run this occasionally to pick up new sets and updated EDHREC ranks.

import zlib from "zlib";
import fs from "fs";
import readline from "readline";
import https from "https";

const UA = "MilkScoreBuilder/1.0";

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": UA } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, destPath).then(resolve, reject);
      }
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on("finish", () => out.close(resolve));
    }).on("error", reject);
  });
}

async function main() {
  console.log("Fetching Scryfall bulk-data index...");
  const meta = await getJson("https://api.scryfall.com/bulk-data/oracle-cards");
  const gzPath = "oracle-cards.jsonl.gz";
  console.log("Downloading", meta.jsonl_download_uri, `(${(meta.compressed_size / 1e6).toFixed(1)} MB)...`);
  await download(meta.jsonl_download_uri, gzPath);

  const skipLayouts = new Set(["art_series"]);
  const out = [];
  let maxRank = 0;

  const gunzip = zlib.createGunzip();
  fs.createReadStream(gzPath).pipe(gunzip);
  const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

  for await (const line of rl) {
    const t = line.trim();
    if (!t || t === "[" || t === "]") continue;
    const s = t.endsWith(",") ? t.slice(0, -1) : t;
    let c;
    try { c = JSON.parse(s); } catch { continue; }
    if (skipLayouts.has(c.layout)) continue;
    const rank = typeof c.edhrec_rank === "number" ? c.edhrec_rank : 0;
    if (rank > maxRank) maxRank = rank;
    out.push([c.name, rank]);
  }

  out.sort((a, b) => a[0].localeCompare(b[0]));
  fs.unlinkSync(gzPath);

  const payload = { asOf: new Date().toISOString().slice(0, 10), maxRank, cards: out };
  fs.writeFileSync("cards.json", JSON.stringify(payload));
  console.log(`Wrote cards.json: ${out.length} cards, maxRank ${maxRank}, ${fs.statSync("cards.json").size} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
