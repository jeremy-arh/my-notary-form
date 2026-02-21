/**
 * Flattens nested translation object to flat keys.
 * e.g. { form: { steps: { chooseOption: { title: "X" } } } } -> { "form.steps.chooseOption.title": "X" }
 */
function flatten(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && typeof value !== "function") {
      Object.assign(result, flatten(value, fullKey));
    } else if (typeof value === "string") {
      result[fullKey] = value;
    }
  }
  return result;
}

// Alias keys: translations.ts uses some shorthand keys that map to nested paths
const KEY_ALIASES = {
  "form.back": "form.navigation.back",
  "form.next": "form.navigation.continue",
  "form.steps.chooseOption.selectOne": "form.validation.selectServices",
};

function resolveKey(flatLang, key, enFallback) {
  const val = flatLang[key];
  if (val != null && val !== "") return val;
  const alias = KEY_ALIASES[key];
  if (alias) {
    const aliasVal = flatLang[alias];
    if (aliasVal != null && aliasVal !== "") return aliasVal;
  }
  return enFallback;
}

// Run with: node scripts/flatten-translations.mjs
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load nested translations via dynamic import
const nestedPath = path.join(__dirname, "../../client-dashboard/src/i18n/translations.js");
const nestedModule = await import(pathToFileURL(nestedPath).href);
const nested = nestedModule.translations;

// Canonical keys: union of flattened nested en keys + alias keys
const canonicalKeys = [...new Set([
  ...Object.keys(flatten(nested.en)),
  ...Object.keys(KEY_ALIASES),
])];

// Flatten nested for each language
const flatByLang = {};
for (const [lang, obj] of Object.entries(nested)) {
  flatByLang[lang] = flatten(obj);
}

// Build output: en, fr from flattened nested; es, de, it, pt from nested with en fallback
const en = {};
const fr = {};
const es = {};
const de = {};
const it = {};
const pt = {};

for (const key of canonicalKeys) {
  en[key] = resolveKey(flatByLang.en, key, "");
  fr[key] = resolveKey(flatByLang.fr, key, en[key]);
  es[key] = resolveKey(flatByLang.es, key, en[key]);
  de[key] = resolveKey(flatByLang.de, key, en[key]);
  it[key] = resolveKey(flatByLang.it, key, en[key]);
  pt[key] = resolveKey(flatByLang.pt, key, en[key]);
}

// Generate TypeScript output
function escapeStr(s) {
  if (s == null || typeof s !== "string") return "";
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function formatLang(langKey, entries) {
  const lines = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `    "${k}": "${escapeStr(v)}"`)
    .join(",\n");
  return `  ${langKey}: {\n${lines}\n  }`;
}

const output = `// Traductions complètes depuis l'ancienne version (client-dashboard)
// + alias form.back, form.next, form.steps.chooseOption.selectOne
// es, de, it, pt: flattened from nested translations.js with English fallback for missing keys
export const translations: Record<string, Record<string, string>> = {
${formatLang("en", en)},
${formatLang("fr", fr)},
${formatLang("es", es)},
${formatLang("de", de)},
${formatLang("it", it)},
${formatLang("pt", pt)},
};
`;

fs.writeFileSync(path.join(__dirname, "../lib/translations.ts"), output, "utf8");
console.log("Generated lib/translations.ts with en, fr, es, de, it, pt");
