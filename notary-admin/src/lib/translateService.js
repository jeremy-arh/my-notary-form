// ============================================================
// 🌍 SERVICE DE TRADUCTION
// ============================================================
// Traduit les articles de blog via l'API Claude
// Sauvegarde automatiquement dans Supabase après chaque langue
// ============================================================

import { supabase } from './supabase';

// Langues disponibles pour la traduction
export const TRANSLATION_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

// ============================================================
// 📝 LOGGING
// ============================================================

function logHeader(title) {
  console.log('\n' + '═'.repeat(50));
  console.log(`🌍 ${title}`);
  console.log('═'.repeat(50));
}

function logStep(emoji, message, details = '') {
  const time = new Date().toLocaleTimeString('fr-FR');
  console.log(`[${time}] ${emoji} ${message}${details ? ` → ${details}` : ''}`);
}

// ============================================================
// 🔄 TRADUCTION D'UNE LANGUE
// ============================================================

// Mapping des codes de langue vers leurs noms complets
const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
};

/**
 * Traduit le contenu vers UNE SEULE langue
 * @param {Object} sourceContent - Contenu source à traduire
 * @param {string} targetLanguage - Langue cible (ex: 'fr')
 * @param {string} sourceLanguage - Langue source (ex: 'en')
 */
export async function translateToLanguage(sourceContent, targetLanguage, sourceLanguage = 'en') {
  const langInfo = TRANSLATION_LANGUAGES.find(l => l.code === targetLanguage);
  const langName = langInfo?.name || targetLanguage;
  const flag = langInfo?.flag || '🌐';
  const sourceLangName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  
  logStep(flag, `Traduction ${sourceLangName} → ${langName}...`);
  const startTime = Date.now();

  // Debug: log du contenu source
  console.log('🔍 translateToLanguage - sourceContent:', JSON.stringify(sourceContent, null, 2));

  // Construire le body avec seulement les champs qui ont du contenu
  const requestBody = {
    targetLanguage: targetLanguage,
    sourceLanguage: sourceLanguage,
  };

  // Ajouter seulement les champs non-vides
  if (sourceContent.title) requestBody.title = sourceContent.title;
  if (sourceContent.excerpt) requestBody.excerpt = sourceContent.excerpt;
  if (sourceContent.content) requestBody.content = sourceContent.content;
  if (sourceContent.meta_title) requestBody.meta_title = sourceContent.meta_title;
  if (sourceContent.meta_description) requestBody.meta_description = sourceContent.meta_description;
  if (sourceContent.category) requestBody.category = sourceContent.category;
  if (sourceContent.cta) requestBody.cta = sourceContent.cta;
  if (sourceContent.faq && sourceContent.faq.length > 0) requestBody.faq = sourceContent.faq;

  console.log('🔍 translateToLanguage - requestBody:', JSON.stringify(requestBody, null, 2));

  try {
    const { data, error } = await supabase.functions.invoke('translate-blog', {
      body: requestBody,
    });

    const duration = Date.now() - startTime;

    if (error) {
      logStep('❌', `${langName} ÉCHEC`, error.message);
      throw new Error(error.message);
    }

    if (!data?.success) {
      logStep('❌', `${langName} ÉCHEC`, data?.error);
      throw new Error(data?.error || 'Échec de la traduction');
    }

    logStep('✅', `${langName} OK`, `${duration}ms`);
    return data.translation;

  } catch (error) {
    logStep('❌', `${langName} ERREUR`, error.message);
    throw error;
  }
}

// ============================================================
// 💾 SAUVEGARDE DANS SUPABASE
// ============================================================

/**
 * Sauvegarde une traduction dans Supabase
 * @param {string} articleId - ID de l'article
 * @param {string} langCode - Code de la langue
 * @param {Object} translation - Données traduites
 * @param {string[]} fields - Champs à sauvegarder (optionnel, tous par défaut)
 */
export async function saveTranslationToSupabase(articleId, langCode, translation, fields = null) {
  const langInfo = TRANSLATION_LANGUAGES.find(l => l.code === langCode);
  const langName = langInfo?.name || langCode;
  
  logStep('💾', `Sauvegarde ${langName} dans Supabase...`);

  // Construire les colonnes à mettre à jour (seulement les champs spécifiés)
  const updateData = {};
  
  const allFields = ['title', 'excerpt', 'content', 'meta_title', 'meta_description', 'category', 'cta', 'faq'];
  const fieldsToSave = fields || allFields;
  
  fieldsToSave.forEach(field => {
    if (translation[field] !== undefined) {
      if (field === 'faq') {
        updateData[`faq_${langCode}`] = translation.faq || [];
      } else {
        updateData[`${field}_${langCode}`] = translation[field] || '';
      }
    }
  });

  if (Object.keys(updateData).length === 0) {
    logStep('⚠️', `Aucun champ à sauvegarder pour ${langName}`);
    return true;
  }

  logStep('📝', `Champs à sauvegarder: ${Object.keys(updateData).join(', ')}`);

  try {
    const { error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', articleId);

    if (error) {
      logStep('❌', `Sauvegarde ${langName} ÉCHEC`, error.message);
      throw error;
    }

    logStep('✅', `Sauvegarde ${langName} OK`);
    return true;

  } catch (error) {
    logStep('❌', `Sauvegarde ${langName} ERREUR`, error.message);
    throw error;
  }
}

// ============================================================
// 🌍 TRADUCTION MULTIPLE AVEC SAUVEGARDE
// ============================================================

/**
 * Traduit vers plusieurs langues et sauvegarde après chaque traduction
 * @param {string} articleId - ID de l'article dans Supabase
 * @param {Object} sourceContent - Contenu source (seulement les champs à traduire)
 * @param {string[]} languages - Langues cibles (ex: ['fr', 'es'] ou null pour toutes)
 * @param {string[]} fields - Champs à traduire (ex: ['title', 'content'])
 * @param {string} sourceLanguage - Langue source (ex: 'en')
 * @param {Function} onProgress - Callback de progression
 */
export async function translateAndSave(articleId, sourceContent, languages = null, fields = null, sourceLanguage = 'en', onProgress = null) {
  const targetLangs = languages || TRANSLATION_LANGUAGES.map(l => l.code);
  const total = targetLangs.length;
  const fieldsToTranslate = fields || Object.keys(sourceContent);
  const sourceLangName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  
  logHeader(`TRADUCTION DE ${total} LANGUE(S)`);
  logStep('📄', 'Article ID', articleId);
  logStep('🔤', 'Langue source', sourceLangName);
  logStep('🌐', 'Langues cibles', targetLangs.join(', ').toUpperCase());
  logStep('📝', 'Champs', fieldsToTranslate.join(', '));
  
  const results = {
    translations: {},
    saved: {},
    errors: {},
  };

  for (let i = 0; i < targetLangs.length; i++) {
    const langCode = targetLangs[i];
    const langInfo = TRANSLATION_LANGUAGES.find(l => l.code === langCode);
    
    console.log(`\n${'─'.repeat(40)}`);
    logStep('🔄', `[${i + 1}/${total}] ${langInfo?.name || langCode}`);

    // Callback de progression - DÉBUT
    if (onProgress) {
      onProgress({
        language: langCode,
        languageName: langInfo?.name || langCode,
        flag: langInfo?.flag || '🌐',
        status: 'translating',
        current: i + 1,
        total: total,
      });
    }

    try {
      // 1. TRADUIRE
      const translation = await translateToLanguage(sourceContent, langCode, sourceLanguage);
      results.translations[langCode] = translation;

      // Callback de progression - TRADUCTION OK
      if (onProgress) {
        onProgress({
          language: langCode,
          languageName: langInfo?.name || langCode,
          flag: langInfo?.flag || '🌐',
          status: 'saving',
          current: i + 1,
          total: total,
          translation: translation,
        });
      }

      // 2. SAUVEGARDER DANS SUPABASE (seulement les champs traduits)
      if (articleId) {
        await saveTranslationToSupabase(articleId, langCode, translation, fieldsToTranslate);
        results.saved[langCode] = true;
      }

      // Callback de progression - SUCCÈS
      if (onProgress) {
        onProgress({
          language: langCode,
          languageName: langInfo?.name || langCode,
          flag: langInfo?.flag || '🌐',
          status: 'success',
          current: i + 1,
          total: total,
          translation: translation,
        });
      }

    } catch (error) {
      results.errors[langCode] = error.message;
      
      // Callback de progression - ERREUR
      if (onProgress) {
        onProgress({
          language: langCode,
          languageName: langInfo?.name || langCode,
          flag: langInfo?.flag || '🌐',
          status: 'error',
          error: error.message,
          current: i + 1,
          total: total,
        });
      }
    }

    // Pause entre les appels
    if (i < targetLangs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // RÉSUMÉ
  const successCount = Object.keys(results.saved).length;
  const errorCount = Object.keys(results.errors).length;
  
  console.log(`\n${'═'.repeat(50)}`);
  logStep('📊', 'RÉSUMÉ');
  logStep('✅', `Réussies: ${successCount}/${total}`);
  if (errorCount > 0) {
    logStep('❌', `Échouées: ${errorCount}`, Object.keys(results.errors).join(', '));
  }
  console.log('═'.repeat(50) + '\n');

  return {
    ...results,
    stats: {
      total,
      succeeded: successCount,
      failed: errorCount,
    },
  };
}

// ============================================================
// 🔧 UTILITAIRES
// ============================================================

/**
 * Vérifie si le service de traduction est disponible
 */
export async function isTranslationAvailable() {
  try {
    const { error } = await supabase.functions.invoke('translate-blog', {
      body: { title: 'test', targetLanguage: 'fr' },
    });
    return !error;
  } catch {
    return false;
  }
}
