// ============================================================
// 🌍 EDGE FUNCTION: TRANSLATE BLOG
// ============================================================
// Traduit un article de blog vers UNE langue à la fois
// Sauvegarde PROGRESSIVEMENT chaque champ dans Supabase
// Deploy: supabase functions deploy translate-blog --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// Langues supportées (toutes les langues, source et cibles)
const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
};

interface FaqItem {
  question: string;
  answer: string;
}

interface TranslationRequest {
  // Identifiants pour la sauvegarde Supabase
  articleId: string;
  tableName?: string; // Par défaut "blog_posts"
  
  // Contenu à traduire
  title?: string;
  excerpt?: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  category?: string;
  cta?: string;
  faq?: FaqItem[];
  targetLanguage: string;
  sourceLanguage?: string;
}

interface ProgressUpdate {
  field: string;
  status: "translating" | "saved" | "error";
  chars?: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// ============================================================
// 📝 LOGGING FUNCTIONS
// ============================================================

function logHeader(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`🔷 ${title}`);
  console.log("=".repeat(60));
}

function logStep(step: string, details?: string) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[${timestamp}] ➡️  ${step}${details ? ` | ${details}` : ""}`);
}

function logSuccess(message: string, details?: string) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[${timestamp}] ✅ ${message}${details ? ` | ${details}` : ""}`);
}

function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[${timestamp}] ❌ ${message}`);
  if (error) {
    console.log(`           └── Error: ${typeof error === "string" ? error : error.message || JSON.stringify(error)}`);
  }
}

function logInfo(message: string, data?: any) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  if (data) {
    console.log(`[${timestamp}] ℹ️  ${message}:`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ℹ️  ${message}`);
  }
}

function logSaved(field: string, langCode: string) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  console.log(`[${timestamp}] 💾 SAVED: ${field}_${langCode}`);
}

// ============================================================
// 💾 SUPABASE SAVE FUNCTION
// ============================================================

async function saveToSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  tableName: string,
  articleId: string,
  langCode: string,
  fieldName: string,
  value: any
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Construire le nom de la colonne
  // IMPORTANT: Les colonnes en anglais n'ont PAS de suffixe (title, content, etc.)
  // Les autres langues ont un suffixe (title_fr, content_de, etc.)
  const columnName = langCode === "en" ? fieldName : `${fieldName}_${langCode}`;
  
  console.log(`💾 Saving to column: ${columnName} (lang: ${langCode}, field: ${fieldName})`);
  
  const { error } = await supabase
    .from(tableName)
    .update({ [columnName]: value })
    .eq("id", articleId);

  if (error) {
    logError(`Failed to save ${columnName}`, error);
    throw new Error(`Supabase save failed for ${columnName}: ${error.message}`);
  }

  logSaved(fieldName, langCode);
}

// ============================================================
// 🤖 CLAUDE API - Translate simple fields (JSON output)
// ============================================================

async function translateSimpleFields(
  content: Record<string, string>,
  targetLangName: string,
  sourceLangName: string,
  claudeApiKey: string
): Promise<Record<string, string>> {
  const fieldNames = Object.keys(content);
  
  const prompt = `You are a native ${targetLangName} translator.

Translate these fields from ${sourceLangName} to ${targetLangName}.

RULES:
1. Translate naturally — use ${targetLangName} idioms and expressions
2. Use formal register (vous, Sie, usted, Lei) — never informal
3. Keep "My Notary" and "mynotary.io" unchanged
4. meta_description must stay under 160 characters
5. Adapt punctuation to ${targetLangName} conventions

Return ONLY a valid JSON object with these fields: ${fieldNames.join(", ")}
Do NOT wrap in code blocks.

CONTENT:
${JSON.stringify(content, null, 2)}

JSON:`;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logError(`Claude API error ${response.status}`, errorBody);
    throw new Error(`Claude API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  logInfo("Claude API usage (simple fields)", {
    stop_reason: data.stop_reason,
    input_tokens: data.usage?.input_tokens,
    output_tokens: data.usage?.output_tokens,
  });

  let text = data.content[0].text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No valid JSON in simple fields response");
    return JSON.parse(match[0]);
  }
}

// ============================================================
// 🔪 CHUNKING - Diviser le HTML en morceaux intelligents
// ============================================================

const CHUNK_SIZE_THRESHOLD = 8000; // Si > 8000 chars, diviser
const MAX_CHUNK_SIZE = 6000; // Taille max d'un chunk

function splitHtmlIntoChunks(html: string): string[] {
  if (html.length <= CHUNK_SIZE_THRESHOLD) {
    return [html];
  }

  logStep(`Splitting HTML (${html.length} chars) into chunks...`);

  const chunks: string[] = [];
  
  // Trouver les positions de division (h2, h3, hr, sections)
  const splitPatterns = [
    /<h2[^>]*>/gi,
    /<h3[^>]*>/gi,
    /<section[^>]*>/gi,
    /<hr[^>]*\/?>/gi,
  ];

  let splitPositions: number[] = [0];
  for (const pattern of splitPatterns) {
    let match;
    const regex = new RegExp(pattern.source, 'gi');
    while ((match = regex.exec(html)) !== null) {
      splitPositions.push(match.index);
    }
  }

  // Si pas assez de positions, diviser par paragraphes
  if (splitPositions.length < 3) {
    const pPattern = /<\/p>/gi;
    let match;
    while ((match = pPattern.exec(html)) !== null) {
      splitPositions.push(match.index + match[0].length);
    }
  }

  // Trier et dédupliquer
  splitPositions = [...new Set(splitPositions)].sort((a, b) => a - b);
  splitPositions.push(html.length);

  // Créer les chunks en groupant les segments
  let currentChunk = "";
  for (let i = 0; i < splitPositions.length - 1; i++) {
    const segment = html.substring(splitPositions[i], splitPositions[i + 1]);
    
    if (currentChunk.length + segment.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = segment;
    } else {
      currentChunk += segment;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Fallback si pas de chunks
  if (chunks.length === 0) {
    for (let i = 0; i < html.length; i += MAX_CHUNK_SIZE) {
      chunks.push(html.substring(i, i + MAX_CHUNK_SIZE));
    }
  }

  logInfo(`Split into ${chunks.length} chunks`, chunks.map((c, i) => `Chunk ${i + 1}: ${c.length} chars`));

  return chunks;
}

// ============================================================
// 🤖 CLAUDE API - Translate a single HTML chunk
// ============================================================

async function translateHtmlChunk(
  htmlChunk: string,
  targetLangName: string,
  sourceLangName: string,
  claudeApiKey: string,
  chunkIndex: number,
  totalChunks: number
): Promise<string> {
  logStep(`Translating chunk ${chunkIndex + 1}/${totalChunks}`, `${htmlChunk.length} chars`);

  const prompt = `You are a native ${targetLangName} translator.

Translate this HTML from ${sourceLangName} to ${targetLangName}.

RULES:
1. Keep ALL HTML tags and attributes EXACTLY as they are
2. Keep all URLs unchanged
3. Keep "My Notary" and "mynotary.io" unchanged
4. Translate naturally — use ${targetLangName} idioms
5. Use formal register (vous, Sie, usted, Lei)

Return ONLY the translated HTML. No explanations, no code blocks.

HTML:
${htmlChunk}`;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logError(`Claude API error ${response.status} (chunk ${chunkIndex + 1})`, errorBody);
    throw new Error(`Claude API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  
  logInfo(`Chunk ${chunkIndex + 1} API usage`, {
    input_tokens: data.usage?.input_tokens,
    output_tokens: data.usage?.output_tokens,
  });

  if (data.stop_reason === "max_tokens") {
    throw new Error(`Chunk ${chunkIndex + 1} truncated`);
  }

  let result = data.content[0].text.trim();
  
  if (result.startsWith("```")) {
    result = result.replace(/^```(html)?\s*/, "").replace(/\s*```$/, "");
  }

  logSuccess(`Chunk ${chunkIndex + 1}/${totalChunks} done`, `${result.length} chars`);

  return result;
}

// ============================================================
// 🤖 CLAUDE API - Translate HTML content (with chunking)
// ============================================================

async function translateHtmlContent(
  html: string,
  targetLangName: string,
  sourceLangName: string,
  claudeApiKey: string
): Promise<string> {
  // Diviser en chunks si nécessaire
  const chunks = splitHtmlIntoChunks(html);
  
  if (chunks.length === 1) {
    // Petit contenu : traduction directe
    logStep("Translating HTML (single chunk)", `${html.length} chars`);
    return translateHtmlChunk(chunks[0], targetLangName, sourceLangName, claudeApiKey, 0, 1);
  }

  // Gros contenu : traduction par chunks
  logStep(`Translating HTML in ${chunks.length} chunks...`);
  
  const translatedChunks: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const translatedChunk = await translateHtmlChunk(
      chunks[i],
      targetLangName,
      sourceLangName,
      claudeApiKey,
      i,
      chunks.length
    );
    translatedChunks.push(translatedChunk);
  }

  const result = translatedChunks.join("");
  logSuccess(`All ${chunks.length} chunks translated`, `Total: ${result.length} chars`);
  
  return result;
}

// ============================================================
// 🤖 CLAUDE API - Translate FAQ (JSON array output)
// ============================================================

async function translateFaq(
  faq: FaqItem[],
  targetLangName: string,
  sourceLangName: string,
  claudeApiKey: string
): Promise<FaqItem[]> {
  const prompt = `You are a native ${targetLangName} translator.

Translate this FAQ from ${sourceLangName} to ${targetLangName}.

RULES:
- Translate questions naturally
- Use formal register (vous, Sie, usted, Lei)
- Keep "My Notary" and "mynotary.io" unchanged

Return ONLY a JSON array: [{"question": "...", "answer": "..."}]
No code blocks, no explanations.

FAQ:
${JSON.stringify(faq, null, 2)}

JSON:`;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logError(`Claude API error ${response.status} (FAQ)`, errorBody);
    throw new Error(`Claude API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  logInfo("Claude API usage (FAQ)", {
    stop_reason: data.stop_reason,
    input_tokens: data.usage?.input_tokens,
    output_tokens: data.usage?.output_tokens,
  });

  let text = data.content[0].text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No valid JSON array in FAQ response");
    return JSON.parse(match[0]);
  }
}

// ============================================================
// 🔄 PROGRESSIVE TRANSLATION - Translate & Save field by field
// ============================================================

async function translateAndSaveProgressively(
  content: TranslationRequest,
  targetLangCode: string,
  targetLangName: string,
  sourceLangName: string,
  claudeApiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ translated: Record<string, any>; progress: ProgressUpdate[] }> {
  const tableName = content.tableName || "blog_posts";
  const articleId = content.articleId;
  const progress: ProgressUpdate[] = [];
  const translated: Record<string, any> = {};

  logStep(`Progressive translation: ${sourceLangName} → ${targetLangName}`);
  logInfo("Target", { table: tableName, articleId, language: targetLangCode });

  // ============================================================
  // ÉTAPE 1: Métadonnées (title, meta_title, meta_description, category, cta, excerpt)
  // ============================================================
  const metaFields: Record<string, string> = {};
  if (content.title) metaFields.title = content.title;
  if (content.excerpt) metaFields.excerpt = content.excerpt;
  if (content.meta_title) metaFields.meta_title = content.meta_title;
  if (content.meta_description) metaFields.meta_description = content.meta_description;
  if (content.category) metaFields.category = content.category;
  if (content.cta) metaFields.cta = content.cta;

  if (Object.keys(metaFields).length > 0) {
    logStep("Translating metadata fields...", Object.keys(metaFields).join(", "));
    progress.push({ field: "metadata", status: "translating" });

    try {
      const translatedMeta = await translateSimpleFields(
        metaFields,
        targetLangName,
        sourceLangName,
        claudeApiKey
      );

      // Sauvegarder chaque champ immédiatement
      for (const [field, value] of Object.entries(translatedMeta)) {
        await saveToSupabase(supabaseUrl, supabaseKey, tableName, articleId, targetLangCode, field, value);
        translated[field] = value;
      }

      progress.push({ field: "metadata", status: "saved", chars: JSON.stringify(translatedMeta).length });
      logSuccess("Metadata translated & saved");
    } catch (error) {
      progress.push({ field: "metadata", status: "error" });
      logError("Metadata translation failed", error);
      throw error;
    }
  }

  // ============================================================
  // ÉTAPE 2: Content HTML (le plus gros morceau - traduit en RAW HTML, pas JSON)
  // ============================================================
  if (content.content) {
    logStep("Translating content (HTML)...", `${content.content.length} chars`);
    progress.push({ field: "content", status: "translating" });

    try {
      const translatedContent = await translateHtmlContent(
        content.content,
        targetLangName,
        sourceLangName,
        claudeApiKey
      );

      await saveToSupabase(supabaseUrl, supabaseKey, tableName, articleId, targetLangCode, "content", translatedContent);
      translated.content = translatedContent;

      progress.push({ field: "content", status: "saved", chars: translatedContent.length });
      logSuccess("Content translated & saved", `${translatedContent.length} chars`);
    } catch (error) {
      progress.push({ field: "content", status: "error" });
      logError("Content translation failed", error);
      throw error;
    }
  }

  // ============================================================
  // ÉTAPE 3: FAQ (si présent)
  // ============================================================
  if (content.faq && content.faq.length > 0) {
    logStep("Translating FAQ...", `${content.faq.length} questions`);
    progress.push({ field: "faq", status: "translating" });

    try {
      const translatedFaqResult = await translateFaq(
        content.faq,
        targetLangName,
        sourceLangName,
        claudeApiKey
      );

      await saveToSupabase(supabaseUrl, supabaseKey, tableName, articleId, targetLangCode, "faq", translatedFaqResult);
      translated.faq = translatedFaqResult;

      progress.push({ field: "faq", status: "saved", chars: translatedFaqResult.length });
      logSuccess("FAQ translated & saved", `${translatedFaqResult.length} questions`);
    } catch (error) {
      progress.push({ field: "faq", status: "error" });
      logError("FAQ translation failed", error);
      throw error;
    }
  }

  return { translated, progress };
}

// ============================================================
// 🚀 MAIN SERVER
// ============================================================

serve(async (req) => {
  // TOUJOURS gérer CORS en premier, avant toute autre opération
  // CORS preflight - doit être traité IMMÉDIATEMENT
  if (req.method === "OPTIONS") {
    console.log("🔄 OPTIONS preflight request - returning CORS headers");
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().split("-")[0];
  const requestStart = Date.now();
  
  // Wrapper global pour garantir les headers CORS même en cas d'erreur critique
  try {
    logHeader(`REQUEST ${requestId}`);
    logInfo("Method", req.method);
    
    // Log all headers for debugging
    console.log("📋 REQUEST HEADERS:");
    req.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    });
    
    // Check API keys
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("🔑 ENV VARIABLES CHECK:");
    console.log(`   CLAUDE_API_KEY: ${claudeApiKey ? `✅ SET (${claudeApiKey.substring(0, 10)}...)` : '❌ NOT SET'}`);
    console.log(`   SUPABASE_URL: ${supabaseUrl ? `✅ SET (${supabaseUrl})` : '❌ NOT SET'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? `✅ SET (${supabaseKey.substring(0, 20)}...)` : '❌ NOT SET'}`);

    if (!claudeApiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
    }
    
    logSuccess("API keys found");

    // Parse body with detailed error logging
    let body: TranslationRequest;
    let rawBody: string = "";
    try {
      // First, read the raw body text
      rawBody = await req.text();
      console.log("📦 RAW BODY RECEIVED:");
      console.log(`   Length: ${rawBody.length} characters`);
      console.log(`   First 500 chars: ${rawBody.substring(0, 500)}`);
      console.log(`   Last 200 chars: ${rawBody.substring(Math.max(0, rawBody.length - 200))}`);
      
      // Check for common issues
      if (!rawBody || rawBody.trim() === "") {
        throw new Error("Empty request body");
      }
      
      // Try to parse JSON
      console.log("🔍 Attempting JSON.parse...");
      body = JSON.parse(rawBody);
      console.log("✅ JSON parsed successfully!");
      console.log(`   Keys found: ${Object.keys(body).join(", ")}`);
      
    } catch (parseError: any) {
      console.log("❌ JSON PARSE ERROR:");
      console.log(`   Error message: ${parseError.message}`);
      console.log(`   Raw body length: ${rawBody.length}`);
      
      // Try to find the position of the error
      if (parseError.message.includes("position")) {
        const posMatch = parseError.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1]);
          console.log(`   Error position: ${pos}`);
          console.log(`   Context around error: ...${rawBody.substring(Math.max(0, pos - 50), pos)}[HERE]${rawBody.substring(pos, pos + 50)}...`);
        }
      }
      
      // Check for common JSON issues
      const firstChar = rawBody.trim()[0];
      const lastChar = rawBody.trim()[rawBody.trim().length - 1];
      console.log(`   First char: '${firstChar}' (should be '{')`);
      console.log(`   Last char: '${lastChar}' (should be '}')`);
      
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }

    // Validation
    if (!body.targetLanguage) {
      throw new Error("targetLanguage is required");
    }

    const targetLangName = SUPPORTED_LANGUAGES[body.targetLanguage];
    if (!targetLangName) {
      throw new Error(`Unsupported target language: ${body.targetLanguage}`);
    }

    const sourceLangCode = body.sourceLanguage || "en";
    const sourceLangName = SUPPORTED_LANGUAGES[sourceLangCode] || "English";

    // Validate content
    const hasAnyContent = body.title || body.content || body.excerpt || 
                          body.meta_title || body.meta_description || 
                          body.category || body.cta || 
                          (body.faq && body.faq.length > 0);
    
    if (!hasAnyContent) {
      throw new Error("At least one field is required for translation");
    }

    // Déterminer le mode : progressif (avec sauvegarde) ou classique (sans sauvegarde)
    const progressiveMode = !!(body.articleId && supabaseUrl && supabaseKey);

    logInfo("Request data", {
      mode: progressiveMode ? "PROGRESSIVE (with save)" : "CLASSIC (no save)",
      articleId: body.articleId || "N/A",
      tableName: body.tableName || "blog_posts",
      sourceLanguage: sourceLangCode,
      targetLanguage: body.targetLanguage,
      fields: {
        title: body.title ? `${body.title.length} chars` : "N/A",
        content: body.content ? `${body.content.length} chars` : "N/A",
        excerpt: body.excerpt ? `${body.excerpt.length} chars` : "N/A",
        faq: body.faq ? `${body.faq.length} questions` : "N/A",
      },
    });

    let translated: Record<string, any>;
    let progress: ProgressUpdate[] | undefined;

    if (progressiveMode) {
      // ============================================================
      // MODE PROGRESSIF : Traduit et sauvegarde champ par champ
      // ============================================================
      logStep(`Starting PROGRESSIVE translation: ${sourceLangCode.toUpperCase()} → ${body.targetLanguage.toUpperCase()}`);

      const result = await translateAndSaveProgressively(
        body,
        body.targetLanguage,
        targetLangName,
        sourceLangName,
        claudeApiKey,
        supabaseUrl!,
        supabaseKey!
      );
      translated = result.translated;
      progress = result.progress;
    } else {
      // ============================================================
      // MODE CLASSIQUE : Traduit par type de contenu (sans sauvegarde)
      // ============================================================
      logStep(`Starting CLASSIC translation: ${sourceLangCode.toUpperCase()} → ${body.targetLanguage.toUpperCase()}`);
      translated = {};
      
      // 1. Traduire les champs simples (texte court)
      const simpleFields: Record<string, string> = {};
      if (body.title) simpleFields.title = body.title;
      if (body.excerpt) simpleFields.excerpt = body.excerpt;
      if (body.meta_title) simpleFields.meta_title = body.meta_title;
      if (body.meta_description) simpleFields.meta_description = body.meta_description;
      if (body.category) simpleFields.category = body.category;
      if (body.cta) simpleFields.cta = body.cta;

      if (Object.keys(simpleFields).length > 0) {
        logStep("Translating simple fields...", Object.keys(simpleFields).join(", "));
        const translatedSimple = await translateSimpleFields(
          simpleFields,
          targetLangName,
          sourceLangName,
          claudeApiKey
        );
        Object.assign(translated, translatedSimple);
        logSuccess("Simple fields translated");
      }

      // 2. Traduire le contenu HTML (séparément, retourne du HTML brut)
      if (body.content) {
        logStep("Translating HTML content...", `${body.content.length} chars`);
        translated.content = await translateHtmlContent(
          body.content,
          targetLangName,
          sourceLangName,
          claudeApiKey
        );
        logSuccess("HTML content translated", `${translated.content.length} chars`);
      }

      // 3. Traduire la FAQ
      if (body.faq && body.faq.length > 0) {
        logStep("Translating FAQ...", `${body.faq.length} questions`);
        translated.faq = await translateFaq(
          body.faq,
          targetLangName,
          sourceLangName,
          claudeApiKey
        );
        logSuccess("FAQ translated");
      }
    }

    const totalDuration = Date.now() - requestStart;
    
    logHeader(`REQUEST ${requestId} COMPLETE`);
    logSuccess(`Total duration: ${totalDuration}ms`);
    if (progress) {
      logInfo("Progress summary", progress);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: progressiveMode ? "progressive" : "classic",
        articleId: body.articleId || null,
        language: body.targetLanguage,
        translation: translated,
        progress: progress || null,
        duration: totalDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    
    logHeader(`REQUEST ${requestId} FAILED`);
    logError(`Failed after ${totalDuration}ms`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration: totalDuration,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
