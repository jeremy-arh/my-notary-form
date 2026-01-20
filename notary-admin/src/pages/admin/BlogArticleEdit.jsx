import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { supabase } from '../../lib/supabase';
import { translateAndSave, TRANSLATION_LANGUAGES } from '../../lib/translateService';
import AdminLayout from '../../components/admin/AdminLayout';

// Langues disponibles (correspondant à la structure de la table blog_posts)
// Note: 'en' utilise les colonnes de base (title, content, etc.) sans suffixe
// Les autres langues utilisent des suffixes (_fr, _es, _de, _it, _pt)
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', isBase: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷', isBase: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', isBase: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', isBase: false },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', isBase: false },
  { code: 'pt', name: 'Português', flag: '🇵🇹', isBase: false }
];

const BlogArticleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(null);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en'); // Langue source pour la traduction
  const [selectedLanguages, setSelectedLanguages] = useState(['fr', 'es', 'de', 'it', 'pt']);
  const [selectedFields, setSelectedFields] = useState(['title', 'excerpt', 'content', 'meta_title', 'meta_description', 'category', 'cta', 'faq']);
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [tagsInput, setTagsInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [editorMode, setEditorMode] = useState('richtext');
  
  // Image de couverture par défaut
  const DEFAULT_COVER_IMAGE = 'https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/cfec8f0c-cd20-47e4-bb88-4ced48474700/public';

  // Structure de données par langue
  const [formData, setFormData] = useState({
    // Champs communs (non traduits)
    slug: '',
    cover_image_url: DEFAULT_COVER_IMAGE, // Image par défaut
    cover_image_alt: '',
    tags: [],
    author_name: '',
    author_email: '',
    author_avatar_url: '',
    author_bio: '',
    status: 'draft',
    published_at: '',
    views_count: 0,
    read_time_minutes: null,
    is_featured: false,
    featured_order: null,
    meta_keywords: [], // Global, pas par langue
    // Données par langue
    // 'en' utilise les colonnes de base (title, content, etc.)
    // Les autres langues utilisent des suffixes (_fr, _es, etc.)
    languages: LANGUAGES.reduce((acc, lang) => {
      acc[lang.code] = {
        title: '',
        excerpt: '',
        content: '',
        meta_title: '',
        meta_description: '',
        category: '',
        cta: '',
        faq: [] // FAQ par langue: [{ question: '', answer: '' }]
      };
      return acc;
    }, {})
  });

  useEffect(() => {
    if (isEditing) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Initialiser les données par langue
        // 'en' utilise les colonnes de base (title, content, etc.)
        // Les autres langues utilisent des suffixes (_fr, _es, etc.)
        const languagesData = LANGUAGES.reduce((acc, lang) => {
          if (lang.isBase) {
            // Anglais : colonnes de base
            acc[lang.code] = {
          title: data.title || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          category: data.category || '',
              cta: data.cta || '',
              faq: data.faq || []
            };
          } else {
            // Autres langues : colonnes avec suffixe
            acc[lang.code] = {
              title: data[`title_${lang.code}`] || '',
              excerpt: data[`excerpt_${lang.code}`] || '',
              content: data[`content_${lang.code}`] || '',
              meta_title: data[`meta_title_${lang.code}`] || '',
              meta_description: data[`meta_description_${lang.code}`] || '',
              category: data[`category_${lang.code}`] || '',
              cta: data[`cta_${lang.code}`] || '',
              faq: data[`faq_${lang.code}`] || []
            };
          }
          return acc;
        }, {});

        setFormData({
          slug: data.slug || '',
          cover_image_url: data.cover_image_url || DEFAULT_COVER_IMAGE,
          cover_image_alt: data.cover_image_alt || '',
          tags: data.tags || [],
          author_name: data.author_name || '',
          author_email: data.author_email || '',
          author_avatar_url: data.author_avatar_url || '',
          author_bio: data.author_bio || '',
          status: data.status || 'draft',
          published_at: data.published_at ? new Date(data.published_at).toISOString().slice(0, 16) : '',
          views_count: data.views_count || 0,
          read_time_minutes: data.read_time_minutes || null,
          is_featured: data.is_featured || false,
          featured_order: data.featured_order || null,
          meta_keywords: data.meta_keywords || [],
          languages: languagesData
        });
        setTagsInput((data.tags || []).join(', '));
        // Utiliser les keywords globaux (pas par langue)
        setKeywordsInput((data.meta_keywords || []).join(', '));
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      alert('Erreur lors du chargement de l\'article: ' + error.message);
      navigate('/cms');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${timestamp}.${fileExt}`;
      const filePath = `blog-images/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      // Mettre à jour le formulaire avec l'URL
      setFormData({ ...formData, cover_image_url: urlData.publicUrl });

      alert('Image uploadée avec succès !');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors de l\'upload de l\'image: ' + error.message);
    } finally {
      setUploadingImage(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Convertir les tags depuis les strings
      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      // Convertir les keywords globaux depuis les strings
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);

      // Générer le slug si nécessaire (priorité au slug manuel, sinon titre anglais)
      const finalSlug = formData.slug || (formData.languages['en']?.title || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // La canonical URL est toujours la version anglaise (page principale)
      // Elle sera générée automatiquement basée sur le slug anglais
      // Note: Vous pouvez remplacer par votre URL de base réelle si nécessaire
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const canonicalUrl = finalSlug ? `${baseUrl}/blog/${finalSlug}` : '';

      // Construire les données de l'article avec les champs par langue
      const articleData = {
        slug: finalSlug,
        cover_image_url: formData.cover_image_url || DEFAULT_COVER_IMAGE,
        cover_image_alt: formData.cover_image_alt || '',
        canonical_url: canonicalUrl, // Toujours la version anglaise
        tags,
        author_name: formData.author_name || '',
        author_email: formData.author_email || '',
        author_avatar_url: formData.author_avatar_url || '',
        author_bio: formData.author_bio || '',
        status: formData.status || 'draft',
        published_at: formData.status === 'published' && formData.published_at 
          ? new Date(formData.published_at).toISOString() 
          : (formData.status === 'published' && !isEditing 
            ? new Date().toISOString() 
            : formData.published_at || null),
        read_time_minutes: formData.read_time_minutes ? parseInt(formData.read_time_minutes) : null,
        featured_order: formData.featured_order ? parseInt(formData.featured_order) : null,
        views_count: parseInt(formData.views_count) || 0,
        is_featured: formData.is_featured || false,
        meta_keywords: keywords // Global, pas par langue
      };

      // Ajouter les champs par langue
      LANGUAGES.forEach(lang => {
        const langData = formData.languages[lang.code];
        if (langData) {
          if (lang.isBase) {
            // Anglais : colonnes de base
            articleData.title = langData.title || '';
            articleData.excerpt = langData.excerpt || '';
            articleData.content = langData.content || '';
            articleData.meta_title = langData.meta_title || '';
            articleData.meta_description = langData.meta_description || '';
            articleData.category = langData.category || '';
            articleData.cta = langData.cta || '';
            articleData.faq = langData.faq || [];
          } else {
            // Autres langues : colonnes avec suffixe
            articleData[`title_${lang.code}`] = langData.title || '';
            articleData[`excerpt_${lang.code}`] = langData.excerpt || '';
            articleData[`content_${lang.code}`] = langData.content || '';
            articleData[`meta_title_${lang.code}`] = langData.meta_title || '';
            articleData[`meta_description_${lang.code}`] = langData.meta_description || '';
            articleData[`category_${lang.code}`] = langData.category || '';
            articleData[`cta_${lang.code}`] = langData.cta || '';
            articleData[`faq_${lang.code}`] = langData.faq || [];
          }
        }
      });

      // Supprimer les champs undefined ou vides (sauf pour les arrays et booleans)
      Object.keys(articleData).forEach(key => {
        if (articleData[key] === undefined || 
            (articleData[key] === '' && !Array.isArray(articleData[key]) && typeof articleData[key] !== 'boolean')) {
          delete articleData[key];
        }
      });

      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(articleData)
          .eq('id', id);

        if (error) throw error;
        alert('Article modifié avec succès !');
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([articleData]);

        if (error) throw error;
        alert('Article créé avec succès !');
      }

      navigate('/cms');
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Ouvre le modal de sélection des langues
  const openTranslateModal = () => {
    const englishContent = formData.languages['en'];
    if (!englishContent?.title && !englishContent?.content) {
      alert('Veuillez d\'abord remplir le titre ou le contenu en anglais avant de traduire.');
      return;
    }
    if (!isEditing || !id) {
      alert('Veuillez d\'abord enregistrer l\'article avant de traduire.\n\nLes traductions sont sauvegardées automatiquement dans la base de données.');
      return;
    }
    setShowTranslateModal(true);
  };

  // Toggle sélection d'une langue
  const toggleLanguageSelection = (langCode) => {
    setSelectedLanguages(prev => 
      prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode]
    );
  };

  // Sélectionner/désélectionner toutes les langues
  const toggleAllLanguages = () => {
    // Exclure la langue source des langues cibles
    const allCodes = LANGUAGES.map(l => l.code).filter(c => c !== sourceLanguage);
    const currentTargetCodes = selectedLanguages.filter(c => c !== sourceLanguage);
    if (currentTargetCodes.length === allCodes.length) {
      setSelectedLanguages([]);
    } else {
      setSelectedLanguages(allCodes);
    }
  };

  // Lancer la traduction avec sauvegarde automatique
  const startTranslation = async () => {
    if (selectedLanguages.length === 0) {
      alert('Veuillez sélectionner au moins une langue cible.');
      return;
    }

    // Filtrer la langue source des langues cibles
    const targetLanguages = selectedLanguages.filter(l => l !== sourceLanguage);
    if (targetLanguages.length === 0) {
      alert('Veuillez sélectionner au moins une langue différente de la langue source.');
      return;
    }

    setShowTranslateModal(false);
    
    // Utiliser le contenu de la langue source sélectionnée
    const sourceContent = formData.languages[sourceLanguage];
    const sourceLangInfo = LANGUAGES.find(l => l.code === sourceLanguage);
    const total = targetLanguages.length;

    console.log('═'.repeat(50));
    console.log('🌍 DÉMARRAGE DE LA TRADUCTION');
    console.log('═'.repeat(50));
    console.log(`📄 Article ID: ${id}`);
    console.log(`🔤 Langue source: ${sourceLangInfo?.name || sourceLanguage}`);
    console.log(`🌐 Langues cibles: ${targetLanguages.join(', ').toUpperCase()}`);
    console.log(`📝 Titre: ${sourceContent.title?.substring(0, 50)}...`);

    try {
      setTranslating(true);
      setTranslationProgress({ current: 0, total, language: '', flag: '🌐', status: 'starting' });

      const startTime = Date.now();

      // Callback de progression
      const onProgress = (progress) => {
        console.log(`[${progress.current}/${progress.total}] ${progress.flag} ${progress.languageName}: ${progress.status}`);

        setTranslationProgress({
          current: progress.current,
          total: progress.total,
          language: progress.languageName,
          flag: progress.flag,
          status: progress.status,
        });

        // Mettre à jour l'état local si traduction réussie (seulement les champs traduits)
        if (progress.status === 'success' && progress.translation) {
          setFormData(prev => {
            const updatedLang = { ...prev.languages[progress.language] };
            
            // Mettre à jour seulement les champs qui ont été traduits
            if (progress.translation.title !== undefined) updatedLang.title = progress.translation.title;
            if (progress.translation.excerpt !== undefined) updatedLang.excerpt = progress.translation.excerpt;
            if (progress.translation.content !== undefined) updatedLang.content = progress.translation.content;
            if (progress.translation.meta_title !== undefined) updatedLang.meta_title = progress.translation.meta_title;
            if (progress.translation.meta_description !== undefined) updatedLang.meta_description = progress.translation.meta_description;
            if (progress.translation.category !== undefined) updatedLang.category = progress.translation.category;
            if (progress.translation.cta !== undefined) updatedLang.cta = progress.translation.cta;
            if (progress.translation.faq !== undefined) updatedLang.faq = progress.translation.faq;
            
            return {
              ...prev,
              languages: {
                ...prev.languages,
                [progress.language]: updatedLang,
              },
            };
          });
        }
      };

      // Debug: afficher le contenu source
      console.log('🔍 DEBUG - sourceLanguage:', sourceLanguage);
      console.log('🔍 DEBUG - sourceContent:', JSON.stringify(sourceContent, null, 2));
      console.log('🔍 DEBUG - selectedFields:', selectedFields);

      // Vérifier que le contenu source existe
      if (!sourceContent) {
        alert(`Erreur: Pas de contenu trouvé pour la langue ${sourceLanguage}`);
        setTranslating(false);
        return;
      }

      // Construire l'objet avec seulement les champs sélectionnés depuis la langue source
      const contentToTranslate = {};
      if (selectedFields.includes('title') && sourceContent.title) {
        contentToTranslate.title = sourceContent.title;
      }
      if (selectedFields.includes('excerpt') && sourceContent.excerpt) {
        contentToTranslate.excerpt = sourceContent.excerpt;
      }
      if (selectedFields.includes('content') && sourceContent.content) {
        contentToTranslate.content = sourceContent.content;
      }
      if (selectedFields.includes('meta_title') && sourceContent.meta_title) {
        contentToTranslate.meta_title = sourceContent.meta_title;
      }
      if (selectedFields.includes('meta_description') && sourceContent.meta_description) {
        contentToTranslate.meta_description = sourceContent.meta_description;
      }
      if (selectedFields.includes('category') && sourceContent.category) {
        contentToTranslate.category = sourceContent.category;
      }
      if (selectedFields.includes('cta') && sourceContent.cta) {
        contentToTranslate.cta = sourceContent.cta;
      }
      if (selectedFields.includes('faq') && sourceContent.faq && sourceContent.faq.length > 0) {
        contentToTranslate.faq = sourceContent.faq;
      }

      console.log('🔍 DEBUG - contentToTranslate:', JSON.stringify(contentToTranslate, null, 2));
      console.log('📝 Champs à traduire:', Object.keys(contentToTranslate).join(', '));

      // Vérifier qu'il y a du contenu à traduire
      if (Object.keys(contentToTranslate).length === 0) {
        alert(`Erreur: Aucun contenu à traduire trouvé pour la langue ${sourceLangInfo?.name || sourceLanguage}.\n\nVérifiez que le contenu existe dans cette langue.`);
        setTranslating(false);
        return;
      }

      // Appeler le service de traduction avec sauvegarde automatique
      const result = await translateAndSave(
        id,
        contentToTranslate,
        targetLanguages,
        selectedFields,
        sourceLanguage,
        onProgress
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log('═'.repeat(50));
      console.log('✅ TRADUCTION TERMINÉE');
      console.log(`⏱️ Durée: ${duration}s`);
      console.log(`📊 Réussies: ${result.stats.succeeded}/${result.stats.total}`);
      console.log('═'.repeat(50));

      // Afficher le résultat
      if (result.stats.failed === 0) {
        alert(`✅ Traductions terminées et sauvegardées !\n\n` +
          `⏱️ Durée: ${duration}s\n` +
          `🌍 Langues: ${result.stats.succeeded}/${total}\n` +
          `💾 Sauvegardé dans Supabase\n\n` +
          `Vérifiez chaque onglet de langue.`);
      } else {
        const failedLangs = Object.keys(result.errors || {}).join(', ').toUpperCase();
        alert(`⚠️ Traductions partiellement terminées\n\n` +
          `✓ Réussies et sauvegardées: ${result.stats.succeeded}\n` +
          `✗ Échouées: ${failedLangs}\n\n` +
          `⏱️ Durée: ${duration}s`);
      }
    } catch (error) {
      console.error('❌ Erreur de traduction:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('CLAUDE_API_KEY')) {
        errorMessage = 'Clé API Claude non configurée.\n\nExécutez: supabase secrets set CLAUDE_API_KEY=votre_cle';
      }
      
      alert('❌ Erreur:\n\n' + errorMessage);
    } finally {
      setTranslating(false);
      setTranslationProgress(null);
    }
  };

  // Extensions de l'éditeur (définies en dehors pour pouvoir les réutiliser avec generateJSON)
  const editorExtensions = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
  ];

  // Créer un seul éditeur qui change de contenu selon la langue active
  const editor = useEditor({
    extensions: editorExtensions,
    content: formData.languages[activeLanguage]?.content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setFormData(prev => ({
        ...prev,
        languages: {
          ...prev.languages,
          [activeLanguage]: {
            ...prev.languages[activeLanguage],
            content: html
          }
        }
      }));
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
      // Préserver le formatage HTML lors du collage
      handlePaste: (view, event, slice) => {
        const html = event.clipboardData?.getData('text/html');
        if (html && editor) {
          event.preventDefault();
          
          // Nettoyer le HTML des éléments dangereux tout en préservant le formatage
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          
          // Supprimer les scripts, styles et éléments dangereux
          const dangerousElements = tempDiv.querySelectorAll('script, style, iframe, object, embed, meta, link');
          dangerousElements.forEach(el => el.remove());
          
          // Nettoyer les attributs d'événements dangereux et les styles problématiques
          const allElements = tempDiv.querySelectorAll('*');
          allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
              // Supprimer les handlers d'événements
              if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
              }
              // Supprimer les classes et IDs spécifiques qui pourraient causer des problèmes
              if (attr.name === 'class' || attr.name === 'id') {
                el.removeAttribute(attr.name);
              }
            });
          });
          
          const cleanHtml = tempDiv.innerHTML;
          
          // Insérer le HTML nettoyé - TipTap va le parser et conserver le formatage
          editor.commands.insertContent(cleanHtml, {
            parseOptions: {
              preserveWhitespace: false,
    },
  });

          return true;
        }
        // Laisser TipTap gérer le collage si pas de HTML
        return false;
      },
    },
  });

  // Mettre à jour le contenu de l'éditeur quand la langue active change
  useEffect(() => {
    const currentContent = formData.languages[activeLanguage]?.content || '';
    if (editor && currentContent !== editor.getHTML()) {
      editor.commands.setContent(currentContent);
    }
  }, [activeLanguage, editor]);

  if (loading && isEditing) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Modifiez les informations de l\'article' : 'Créez un nouvel article de blog'}
            </p>
          </div>
          <button
            onClick={() => navigate('/cms')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
          >
            <Icon icon="heroicons:arrow-left" className="w-5 h-5 inline mr-2" />
            Retour
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          {/* Champs communs (non traduits) */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informations générales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Slug</label>
              <input
                type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Auto-généré si vide"
              />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Keywords (globaux, séparés par des virgules)</label>
              <input
                type="text"
                  value={keywordsInput}
                  onChange={(e) => {
                    setKeywordsInput(e.target.value);
                    const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0);
                    setFormData(prev => ({ ...prev, meta_keywords: keywords }));
                  }}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="keyword1, keyword2, keyword3"
              />
              </div>
            </div>
          </div>

          {/* Champs Auteur */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Auteur</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Nom de l'auteur</label>
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email de l'auteur</label>
                <input
                  type="email"
                  value={formData.author_email}
                  onChange={(e) => setFormData({ ...formData, author_email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">URL de l'avatar</label>
                <input
                  type="text"
                  value={formData.author_avatar_url}
                  onChange={(e) => setFormData({ ...formData, author_avatar_url: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Bio de l'auteur</label>
                <textarea
                  value={formData.author_bio}
                  onChange={(e) => setFormData({ ...formData, author_bio: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Sous-tabs par langue */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Contenu par langue</h3>
              {/* Bouton de traduction automatique */}
              <button
                type="button"
                onClick={openTranslateModal}
                disabled={translating}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  translating
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                }`}
                title="Traduire automatiquement le contenu anglais"
              >
                {translating && translationProgress ? (
                  <>
                    <Icon icon="heroicons:arrow-path" className="w-5 h-5 animate-spin" />
                    <span>{translationProgress.flag} {translationProgress.language || 'Démarrage'}...</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {translationProgress.current}/{translationProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon icon="heroicons:language" className="w-5 h-5" />
                    🤖 Traduire avec IA
                  </>
                )}
              </button>
            </div>
            
            {/* Barre de progression de traduction */}
            {translating && translationProgress && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">
                    {translationProgress.status === 'saving' ? '💾 Sauvegarde...' : '🔄 Traduction...'}
                  </span>
                  <span className="text-sm text-purple-600">
                    {translationProgress.current}/{translationProgress.total} langues
                  </span>
                </div>
                {/* Barre de progression */}
                <div className="w-full bg-purple-200 rounded-full h-3 mb-3">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }}
                  />
                </div>
                {/* Indicateurs par langue */}
                <div className="flex justify-around">
                  {selectedLanguages.map((langCode, index) => {
                    const langInfo = TRANSLATION_LANGUAGES.find(l => l.code === langCode);
                    const isCompleted = translationProgress.current > index;
                    const isCurrent = translationProgress.current === index + 1;
                    return (
                      <div 
                        key={langCode}
                        className={`flex flex-col items-center transition-all ${
                          isCompleted ? 'opacity-100' : isCurrent ? 'opacity-100 scale-110' : 'opacity-40'
                        }`}
                      >
                        <span className={`text-xl ${isCurrent ? 'animate-bounce' : ''}`}>
                          {isCompleted ? '✅' : isCurrent ? langInfo?.flag : '⏳'}
                        </span>
                        <span className={`text-xs font-medium ${
                          isCompleted ? 'text-green-600' : isCurrent ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          {langCode.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabs de langue */}
            <div className="bg-[#F3F4F6] rounded-xl border border-gray-200 p-2 mb-4">
              <div className="flex space-x-2 overflow-x-auto">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setActiveLanguage(lang.code);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      activeLanguage === lang.code
                        ? 'bg-black text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu pour la langue active */}
            <div className="space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Titre ({LANGUAGES.find(l => l.code === activeLanguage)?.name}) *
                </label>
                <input
                  type="text"
                  value={formData.languages[activeLanguage]?.title || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    languages: {
                      ...prev.languages,
                      [activeLanguage]: {
                        ...prev.languages[activeLanguage],
                        title: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  required
                />
          </div>

          {/* Extrait */}
          <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Extrait ({LANGUAGES.find(l => l.code === activeLanguage)?.name})
                </label>
            <textarea
                  value={formData.languages[activeLanguage]?.excerpt || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    languages: {
                      ...prev.languages,
                      [activeLanguage]: {
                        ...prev.languages[activeLanguage],
                        excerpt: e.target.value
                      }
                    }
                  }))}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              rows="3"
              placeholder="Résumé court de l'article..."
            />
          </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Catégorie ({LANGUAGES.find(l => l.code === activeLanguage)?.name})
                </label>
                <input
                  type="text"
                  value={formData.languages[activeLanguage]?.category || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    languages: {
                      ...prev.languages,
                      [activeLanguage]: {
                        ...prev.languages[activeLanguage],
                        category: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
            />
          </div>

          {/* Contenu Rich Text */}
          <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Contenu ({LANGUAGES.find(l => l.code === activeLanguage)?.name}) *
                  </label>
                  {/* Toggle Mode Richtext / HTML */}
                  <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        // Synchroniser le contenu de l'éditeur vers formData avant de changer de mode
                        if (editorMode === 'richtext' && editor) {
                          const currentHtml = editor.getHTML();
                          setFormData(prev => ({
                            ...prev,
                            languages: {
                              ...prev.languages,
                              [activeLanguage]: {
                                ...prev.languages[activeLanguage],
                                content: currentHtml
                              }
                            }
                          }));
                        }
                        setEditorMode('richtext');
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        editorMode === 'richtext' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon icon="heroicons:pencil-square" className="w-4 h-4 inline mr-1" />
                      Éditeur
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Synchroniser le contenu de l'éditeur vers formData avant de changer de mode
                        if (editorMode === 'richtext' && editor) {
                          const currentHtml = editor.getHTML();
                          setFormData(prev => ({
                            ...prev,
                            languages: {
                              ...prev.languages,
                              [activeLanguage]: {
                                ...prev.languages[activeLanguage],
                                content: currentHtml
                              }
                            }
                          }));
                        }
                        setEditorMode('html');
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        editorMode === 'html' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon icon="heroicons:code-bracket" className="w-4 h-4 inline mr-1" />
                      HTML
                    </button>
                  </div>
                </div>
                {/* Mode Éditeur Richtext */}
                {editorMode === 'richtext' && (
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              {/* Barre d'outils */}
              {editor && (
                <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
                    title="Gras"
                  >
                    <span className="font-bold text-sm">B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
                    title="Italique"
                  >
                    <span className="italic text-sm">I</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''}`}
                    title="Barré"
                  >
                    <span className="line-through text-sm">S</span>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}`}
                    title="Titre 1"
                  >
                    <span className="font-bold text-lg">H1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
                    title="Titre 2"
                  >
                    <span className="font-bold text-base">H2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''}`}
                    title="Titre 3"
                  >
                    <span className="font-bold text-sm">H3</span>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
                    title="Liste à puces"
                  >
                    <Icon icon="heroicons:list-bullet" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
                    title="Liste numérotée"
                  >
                    <span className="text-sm font-semibold">1.</span>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
                    title="Aligner à gauche"
                  >
                          <Icon icon="heroicons:bars-3-bottom-left" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
                    title="Centrer"
                  >
                          <Icon icon="heroicons:bars-3" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
                    title="Aligner à droite"
                  >
                          <Icon icon="heroicons:bars-3-bottom-right" className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt('Entrez l\'URL du lien:');
                      if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                      }
                    }}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
                    title="Ajouter un lien"
                  >
                    <Icon icon="heroicons:link" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt('Entrez l\'URL de l\'image:');
                      if (url) {
                        editor.chain().focus().setImage({ src: url }).run();
                      }
                    }}
                    className="p-2 rounded hover:bg-gray-200"
                    title="Insérer une image"
                  >
                    <Icon icon="heroicons:photo" className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                    className="p-2 rounded hover:bg-gray-200"
                    title="Réinitialiser le formatage"
                  >
                    <Icon icon="heroicons:arrow-path" className="w-5 h-5" />
                  </button>
                </div>
              )}
              {/* Éditeur */}
              <div className="bg-white min-h-[400px] p-4 prose prose-sm max-w-none">
                <style>{`
                  .ProseMirror {
                    outline: none;
                    min-height: 400px;
                  }
                  .ProseMirror p {
                    margin: 0.5em 0;
                  }
                  .ProseMirror h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin: 0.5em 0;
                  }
                  .ProseMirror h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin: 0.5em 0;
                  }
                  .ProseMirror h3 {
                    font-size: 1.25em;
                    font-weight: bold;
                    margin: 0.5em 0;
                  }
                  .ProseMirror ul, .ProseMirror ol {
                    padding-left: 1.5em;
                    margin: 0.5em 0;
                  }
                  .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                  }
                  .ProseMirror a {
                    color: #2563eb;
                    text-decoration: underline;
                  }
                `}</style>
                <EditorContent editor={editor} />
              </div>
            </div>
                )}

                {/* Mode HTML brut */}
                {editorMode === 'html' && (
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="border-b border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-mono">
                        <Icon icon="heroicons:code-bracket" className="w-4 h-4 inline mr-1" />
                        Code HTML
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(formData.languages[activeLanguage]?.content || '');
                            alert('HTML copié dans le presse-papiers !');
                          } catch (error) {
                            console.error('Erreur lors de la copie:', error);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-all"
                      >
                        <Icon icon="heroicons:clipboard-document" className="w-4 h-4 inline mr-1" />
                        Copier HTML
                      </button>
                    </div>
                    <textarea
                      value={formData.languages[activeLanguage]?.content || ''}
                      onChange={(e) => {
                        const newHtml = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          languages: {
                            ...prev.languages,
                            [activeLanguage]: {
                              ...prev.languages[activeLanguage],
                              content: newHtml
                            }
                          }
                        }));
                        // Synchroniser avec l'éditeur TipTap
                        if (editor) {
                          editor.commands.setContent(newHtml);
                        }
                      }}
                      className="w-full min-h-[400px] p-4 font-mono text-sm bg-gray-900 text-green-400 focus:outline-none resize-y"
                      placeholder="<p>Collez ou écrivez votre HTML ici...</p>"
                      spellCheck={false}
                    />
                  </div>
                )}

            <p className="text-xs text-gray-500 mt-2">
                  💡 Basculez entre <strong>Éditeur</strong> (visuel) et <strong>HTML</strong> (code source) selon vos besoins. Les modifications sont synchronisées.
                </p>
              </div>

          {/* SEO */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              SEO ({LANGUAGES.find(l => l.code === activeLanguage)?.name})
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Title</label>
                <input
                  type="text"
                  value={formData.languages[activeLanguage]?.meta_title || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      languages: {
                        ...prev.languages,
                        [activeLanguage]: {
                          ...prev.languages[activeLanguage],
                          meta_title: e.target.value
                        }
                      }
                    }));
                  }}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  maxLength={255}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Description</label>
                <textarea
                  value={formData.languages[activeLanguage]?.meta_description || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      languages: {
                        ...prev.languages,
                        [activeLanguage]: {
                          ...prev.languages[activeLanguage],
                          meta_description: e.target.value
                        }
                      }
                    }));
                  }}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  rows="2"
                  maxLength={320}
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              CTA - Call to Action ({LANGUAGES.find(l => l.code === activeLanguage)?.name})
            </label>
            <input
              type="text"
              value={formData.languages[activeLanguage]?.cta || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                languages: {
                  ...prev.languages,
                  [activeLanguage]: {
                    ...prev.languages[activeLanguage],
                    cta: e.target.value
                  }
                }
              }))}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="Texte du call-to-action"
            />
          </div>

          {/* FAQ */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="heroicons:question-mark-circle" className="w-5 h-5 text-purple-600" />
                FAQ ({LANGUAGES.find(l => l.code === activeLanguage)?.name})
              </h3>
              <button
                type="button"
                onClick={() => {
                  const currentFaq = formData.languages[activeLanguage]?.faq || [];
                  setFormData(prev => ({
                    ...prev,
                    languages: {
                      ...prev.languages,
                      [activeLanguage]: {
                        ...prev.languages[activeLanguage],
                        faq: [...currentFaq, { question: '', answer: '' }]
                      }
                    }
                  }));
                }}
                className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all text-sm font-medium"
              >
                <Icon icon="heroicons:plus" className="w-4 h-4" />
                Ajouter une question
              </button>
            </div>

            {/* Liste des FAQ */}
            <div className="space-y-4">
              {(formData.languages[activeLanguage]?.faq || []).length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Icon icon="heroicons:question-mark-circle" className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Aucune FAQ pour cette langue</p>
                  <p className="text-sm text-gray-400">Cliquez sur "Ajouter une question" pour commencer</p>
                </div>
              ) : (
                (formData.languages[activeLanguage]?.faq || []).map((faqItem, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        Q{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentFaq = [...(formData.languages[activeLanguage]?.faq || [])];
                          currentFaq.splice(index, 1);
                          setFormData(prev => ({
                            ...prev,
                            languages: {
                              ...prev.languages,
                              [activeLanguage]: {
                                ...prev.languages[activeLanguage],
                                faq: currentFaq
                              }
                            }
                          }));
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 rounded transition-all"
                        title="Supprimer cette question"
                      >
                        <Icon icon="heroicons:trash" className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Question */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                      <input
                        type="text"
                        value={faqItem.question}
                        onChange={(e) => {
                          const currentFaq = [...(formData.languages[activeLanguage]?.faq || [])];
                          currentFaq[index] = { ...currentFaq[index], question: e.target.value };
                          setFormData(prev => ({
                            ...prev,
                            languages: {
                              ...prev.languages,
                              [activeLanguage]: {
                                ...prev.languages[activeLanguage],
                                faq: currentFaq
                              }
                            }
                          }));
                        }}
                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        placeholder="Entrez la question..."
                      />
                    </div>
                    
                    {/* Réponse */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Réponse</label>
                      <textarea
                        value={faqItem.answer}
                        onChange={(e) => {
                          const currentFaq = [...(formData.languages[activeLanguage]?.faq || [])];
                          currentFaq[index] = { ...currentFaq[index], answer: e.target.value };
                          setFormData(prev => ({
                            ...prev,
                            languages: {
                              ...prev.languages,
                              [activeLanguage]: {
                                ...prev.languages[activeLanguage],
                                faq: currentFaq
                              }
                            }
                          }));
                        }}
                        className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        rows="3"
                        placeholder="Entrez la réponse..."
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {(formData.languages[activeLanguage]?.faq || []).length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                💡 Les FAQ sont enregistrées séparément pour chaque langue. Pensez à les traduire ou utilisez la traduction automatique.
              </p>
            )}
          </div>
        </div>
          </div>

          {/* Image de couverture */}
      <div className="border-t pt-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Médias</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Image de couverture</label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="cover-image-upload"
                />
                <label
                  htmlFor="cover-image-upload"
                  className={`block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all text-center ${
                    uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingImage ? (
                    <span className="text-gray-600">
                      <Icon icon="heroicons:arrow-path" className="w-5 h-5 inline mr-2 animate-spin" />
                      Upload en cours...
                    </span>
                  ) : (
                    <span className="text-gray-700">
                      <Icon icon="heroicons:photo" className="w-5 h-5 inline mr-2" />
                      {formData.cover_image_url ? 'Changer l\'image' : 'Uploader une image'}
                    </span>
                  )}
                </label>
                {formData.cover_image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.cover_image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Supprimer l'image
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Texte alternatif image</label>
              <input
                type="text"
                value={formData.cover_image_alt}
                onChange={(e) => setFormData({ ...formData, cover_image_alt: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Description de l'image pour l'accessibilité"
              />
              </div>
            </div>
          </div>

          {/* Tags et autres champs communs */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Paramètres</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Tags (séparés par des virgules)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Statut et Publication */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Date de publication</label>
              <input
                type="datetime-local"
                value={formData.published_at}
                onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Temps de lecture (minutes)</label>
              <input
                type="number"
                value={formData.read_time_minutes || ''}
                onChange={(e) => setFormData({ ...formData, read_time_minutes: e.target.value || null })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                min="1"
              />
            </div>
          </div>

          {/* Featured */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="ml-2 text-sm font-semibold text-gray-900">Article mis en avant</span>
              </label>
            </div>
            {formData.is_featured && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Ordre d'affichage</label>
                <input
                  type="number"
                  value={formData.featured_order || ''}
                  onChange={(e) => setFormData({ ...formData, featured_order: e.target.value || null })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Nombre de vues</label>
              <input
                type="number"
                value={formData.views_count}
                onChange={(e) => setFormData({ ...formData, views_count: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                min="0"
              />
            </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => navigate('/cms')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>

      {/* Modal de sélection des langues et champs */}
      {showTranslateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="heroicons:language" className="w-6 h-6 text-purple-600" />
                Traduire l'article
              </h3>
              <button
                onClick={() => setShowTranslateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Icon icon="heroicons:x-mark" className="w-5 h-5" />
              </button>
            </div>

            {/* Info */}
            <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              <Icon icon="heroicons:information-circle" className="w-5 h-5 inline mr-1" />
              Les traductions seront sauvegardées automatiquement dans Supabase après chaque langue.
            </div>

            {/* Langue source */}
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <label className="font-semibold text-gray-900 mb-3 block">🔤 Traduire depuis</label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSourceLanguage(lang.code)}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg transition-all border-2 ${
                      sourceLanguage === lang.code
                        ? 'border-amber-500 bg-amber-100 text-amber-800'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sélection des langues cibles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-semibold text-gray-900">🌍 Traduire vers</label>
                  <button
                    type="button"
                    onClick={toggleAllLanguages}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {selectedLanguages.length === TRANSLATION_LANGUAGES.length ? 'Aucune' : 'Toutes'}
                  </button>
                </div>
                <div className="space-y-2">
                  {LANGUAGES.filter(l => l.code !== sourceLanguage).map((lang) => (
                    <label
                      key={lang.code}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${
                        selectedLanguages.includes(lang.code)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(lang.code)}
                        onChange={() => toggleLanguageSelection(lang.code)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-lg">{lang.flag}</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{lang.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sélection des champs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-semibold text-gray-900">📝 Éléments à traduire</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allFields = ['title', 'excerpt', 'content', 'meta_title', 'meta_description', 'category', 'cta', 'faq'];
                      setSelectedFields(selectedFields.length === allFields.length ? [] : allFields);
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {selectedFields.length === 8 ? 'Aucun' : 'Tous'}
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { code: 'title', name: 'Titre', icon: '📌' },
                    { code: 'excerpt', name: 'Extrait', icon: '📄' },
                    { code: 'content', name: 'Contenu (HTML)', icon: '📝' },
                    { code: 'meta_title', name: 'Meta Title', icon: '🔍' },
                    { code: 'meta_description', name: 'Meta Description', icon: '📋' },
                    { code: 'category', name: 'Catégorie', icon: '🏷️' },
                    { code: 'cta', name: 'Call to Action', icon: '🎯' },
                    { code: 'faq', name: 'FAQ', icon: '❓' },
                  ].map((field) => (
                    <label
                      key={field.code}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-all border ${
                        selectedFields.includes(field.code)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.code)}
                        onChange={() => {
                          setSelectedFields(prev => 
                            prev.includes(field.code)
                              ? prev.filter(f => f !== field.code)
                              : [...prev, field.code]
                          );
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2">{field.icon}</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">{field.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Résumé */}
            {selectedLanguages.filter(l => l !== sourceLanguage).length > 0 && selectedFields.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-sm">
                <div className="flex items-center gap-2 mb-2 text-gray-900 font-medium">
                  <span>{LANGUAGES.find(l => l.code === sourceLanguage)?.flag}</span>
                  <span>{LANGUAGES.find(l => l.code === sourceLanguage)?.name}</span>
                  <Icon icon="heroicons:arrow-right" className="w-4 h-4 text-gray-400" />
                  <span>{selectedLanguages.filter(l => l !== sourceLanguage).map(code => LANGUAGES.find(l => l.code === code)?.flag).join(' ')}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>
                    <Icon icon="heroicons:clock" className="w-4 h-4 inline mr-1" />
                    ~{selectedLanguages.filter(l => l !== sourceLanguage).length * Math.max(5, selectedFields.length * 2)} sec
                  </span>
                  <span className="text-gray-500">
                    {selectedLanguages.filter(l => l !== sourceLanguage).length} langue{selectedLanguages.filter(l => l !== sourceLanguage).length > 1 ? 's' : ''} × {selectedFields.length} champ{selectedFields.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTranslateModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={startTranslation}
                disabled={selectedLanguages.length === 0 || selectedFields.length === 0}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedLanguages.length === 0 || selectedFields.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                <Icon icon="heroicons:play" className="w-5 h-5" />
                Lancer la traduction
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default BlogArticleEdit;

