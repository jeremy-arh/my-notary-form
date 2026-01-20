// ============================================================
// 🌍 EDGE FUNCTION: TRANSLATE BLOG
// ============================================================
// Traduit un article de blog vers UNE langue à la fois
// Deploy: supabase functions deploy translate-blog --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// ============================================================
// 🔄 TRANSLATION FUNCTION
// ============================================================

async function translateToLanguage(
  content: TranslationRequest,
  targetLangCode: string,
  targetLangName: string,
  sourceLangCode: string,
  sourceLangName: string,
  claudeApiKey: string
) {
  logStep(`Translating ${sourceLangName} → ${targetLangName.toUpperCase()} (${targetLangCode})`);
  
  const startTime = Date.now();

  // Construire contentToTranslate uniquement avec les champs fournis
  const contentToTranslate: Record<string, any> = {};
  const fieldsPresent: string[] = [];

  if (content.title !== undefined && content.title !== "") {
    contentToTranslate.title = content.title;
    fieldsPresent.push("title");
  }
  if (content.excerpt !== undefined && content.excerpt !== "") {
    contentToTranslate.excerpt = content.excerpt;
    fieldsPresent.push("excerpt");
  }
  if (content.content !== undefined && content.content !== "") {
    contentToTranslate.content = content.content;
    fieldsPresent.push("content (HTML)");
  }
  if (content.meta_title !== undefined && content.meta_title !== "") {
    contentToTranslate.meta_title = content.meta_title;
    fieldsPresent.push("meta_title");
  }
  if (content.meta_description !== undefined && content.meta_description !== "") {
    contentToTranslate.meta_description = content.meta_description;
    fieldsPresent.push("meta_description (max 160 chars)");
  }
  if (content.category !== undefined && content.category !== "") {
    contentToTranslate.category = content.category;
    fieldsPresent.push("category");
  }
  if (content.cta !== undefined && content.cta !== "") {
    contentToTranslate.cta = content.cta;
    fieldsPresent.push("cta");
  }
  if (content.faq !== undefined && content.faq.length > 0) {
    contentToTranslate.faq = content.faq;
    fieldsPresent.push("faq (array of {question, answer})");
  }

  logInfo("Fields to translate", fieldsPresent.join(", "));
  logInfo("Content sizes", {
    title: contentToTranslate.title ? `${contentToTranslate.title.length} chars` : "N/A",
    content: contentToTranslate.content ? `${contentToTranslate.content.length} chars` : "N/A",
    excerpt: contentToTranslate.excerpt ? `${contentToTranslate.excerpt.length} chars` : "N/A",
    faq: contentToTranslate.faq ? `${contentToTranslate.faq.length} questions` : "N/A",
  });

  // Construire la liste des champs pour le prompt
  const fieldsListForPrompt = fieldsPresent.map(f => `- ${f}`).join("\n");

  // Règles spécifiques selon les champs présents
  let faqRule = "";
  if (contentToTranslate.faq) {
    faqRule = `
7. FAQ Translation
   - Translate each question and answer in the faq array
   - Keep the same array structure: [{"question": "...", "answer": "..."}]
   - Make questions natural and conversational in ${targetLangName}
`;
  }

  const prompt = `You are a native ${targetLangName} translator.

Translate this blog article content from ${sourceLangName} to ${targetLangName}.

RULES:

1. HTML & Structure
   - Keep ALL HTML tags and attributes exactly as they are
   - Keep URLs unchanged
   - Keep the same paragraph and section structure
   - Do not add or remove any HTML elements

2. Terms to keep unchanged
   - "My Notary"
   - "mynotary.io"
   - Email addresses
   - Any URL

3. Translation quality
   - Translate naturally — adapt expressions to how a native ${targetLangName} speaker would say it
   - Never translate word-for-word or literally
   - Use idioms and expressions natural to ${targetLangName}
   - Adapt punctuation to ${targetLangName} conventions (e.g., French uses spaces before : ; ? !)
   - Use formal register (vous, Sie, usted, Lei) — never informal

4. SEO & Keywords
   - Translate keywords to their natural equivalent in ${targetLangName}
   - Keep keyword density similar to the original
   - Meta description must stay under 160 characters

5. Consistency
   - Use the same translated term throughout the entire article
   - If "certified copy" becomes "copie certifiée", use it everywhere
   - Maintain consistent tone from start to finish

6. Cultural adaptation
   - Convert examples if needed to be relevant for ${targetLangName} speakers
   - Keep legal/notary terminology accurate for ${targetLangName}-speaking countries
${faqRule}
OUTPUT FORMAT:
Return ONLY a valid JSON object with EXACTLY these fields translated:
${fieldsListForPrompt}

Do NOT wrap in code blocks. Do NOT add explanations. Return ONLY the JSON.

CONTENT TO TRANSLATE:
${JSON.stringify(contentToTranslate, null, 2)}

TRANSLATED JSON:`;

  try {
    logStep("Calling Claude API...");
    
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    logInfo(`Claude API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logError(`Claude API returned ${response.status}`, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.content?.[0]?.text) {
      logError("Invalid response structure from Claude");
      throw new Error("Invalid response structure");
    }

    logInfo("Claude API usage", {
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
    });

    let translatedText = data.content[0].text.trim();
    
    // Clean markdown code blocks if present
    if (translatedText.startsWith("```")) {
      translatedText = translatedText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(translatedText);
    } catch {
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No valid JSON found in response");
      parsed = JSON.parse(jsonMatch[0]);
    }

    const duration = Date.now() - startTime;
    logSuccess(`${targetLangName} translation complete`, `${duration}ms`);
    logInfo("Translated content sizes", {
      title: `${parsed.title?.length || 0} chars`,
      content: `${parsed.content?.length || 0} chars`,
    });

    return parsed;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Translation to ${targetLangName} failed after ${duration}ms`, error);
    throw error;
  }
}

// ============================================================
// 🚀 MAIN SERVER
// ============================================================

serve(async (req) => {
  const requestId = crypto.randomUUID().split("-")[0];
  const requestStart = Date.now();
  
  logHeader(`REQUEST ${requestId}`);
  logInfo("Method", req.method);

  // CORS preflight
  if (req.method === "OPTIONS") {
    logStep("Handling CORS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check API key
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      logError("CLAUDE_API_KEY not configured");
      throw new Error("CLAUDE_API_KEY not configured");
    }
    logSuccess("Claude API key found", `${claudeApiKey.length} chars`);

    // Parse body
    let body: TranslationRequest;
    try {
      body = await req.json();
    } catch {
      logError("Failed to parse request body");
      throw new Error("Invalid JSON in request body");
    }

    // Langue source par défaut: anglais
    const sourceLangCode = body.sourceLanguage || 'en';
    
    // Log complet du body reçu pour debug
    logInfo("Full request body keys", Object.keys(body));
    logInfo("Request data", {
      sourceLanguage: sourceLangCode,
      targetLanguage: body.targetLanguage,
      hasTitle: !!body.title,
      hasContent: !!body.content,
      hasExcerpt: !!body.excerpt,
      hasFaq: !!(body.faq && body.faq.length > 0),
      titleLength: body.title?.length || 0,
      contentLength: body.content?.length || 0,
      excerptLength: body.excerpt?.length || 0,
      faqCount: body.faq?.length || 0,
    });

    // Validate - au moins un champ doit avoir du contenu
    const hasAnyContent = body.title || body.content || body.excerpt || body.meta_title || body.meta_description || body.category || body.cta || (body.faq && body.faq.length > 0);
    
    if (!hasAnyContent) {
      logError("No content to translate", {
        title: body.title,
        content: body.content?.substring(0, 100),
        excerpt: body.excerpt,
      });
      throw new Error("At least one field (title, content, excerpt, etc.) is required for translation");
    }
    if (!body.targetLanguage) {
      throw new Error("targetLanguage is required");
    }

    const targetLangName = SUPPORTED_LANGUAGES[body.targetLanguage];
    if (!targetLangName) {
      throw new Error(`Unsupported target language: ${body.targetLanguage}`);
    }

    const sourceLangName = SUPPORTED_LANGUAGES[sourceLangCode] || 'English';

    logStep(`Starting translation: ${sourceLangCode.toUpperCase()} → ${body.targetLanguage.toUpperCase()}`);

    // Translate
    const translation = await translateToLanguage(
      body,
      body.targetLanguage,
      targetLangName,
      sourceLangCode,
      sourceLangName,
      claudeApiKey
    );

    const totalDuration = Date.now() - requestStart;
    
    logHeader(`REQUEST ${requestId} COMPLETE`);
    logSuccess(`Total duration: ${totalDuration}ms`);
    logInfo("Translation result", {
      language: body.targetLanguage,
      titleTranslated: !!translation.title,
      contentTranslated: !!translation.content,
    });

    return new Response(
      JSON.stringify({
        success: true,
        language: body.targetLanguage,
        translation,
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
