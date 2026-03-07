import * as simpleIcons from "simple-icons";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "carriers");

fs.mkdirSync(outDir, { recursive: true });

// Map carrier key → simple-icons slug (camelCase: "si" + TitleCase slug)
const carriers = [
  { key: "dhl",          siKey: "siDhl" },
  { key: "laposte",      siKey: "siLaposte" },
  { key: "deutschepost", siKey: "siDeutschepost" },
  { key: "royalmail",    siKey: "siRoyalmail" },
  { key: "postnl",       siKey: "siPostnl" },
  { key: "postch",       siKey: "siSwisspost" },
  { key: "bpost",        siKey: "siBpost" },
  { key: "indiapost",    siKey: "siIndiapost" },
  { key: "austrianpost", siKey: "siPost" },
];

for (const { key, siKey } of carriers) {
  const icon = simpleIcons[siKey];
  if (!icon) {
    console.warn(`  MISSING in simple-icons: ${siKey} (${key})`);
    continue;
  }

  const hex = icon.hex; // brand colour without #
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${hex}">${icon.path}</svg>`;

  const dest = path.join(outDir, `${key}.svg`);
  fs.writeFileSync(dest, svgContent, "utf8");
  console.log(`  OK  ${key}  →  #${hex}  (${icon.title})`);
}

console.log("\nDone.");
