# Edge Function: translate-blog

Cette Edge Function permet de traduire automatiquement les articles de blog via l'API Claude.

## Prérequis

1. **Supabase CLI** installé : `npm install -g supabase`
2. **Clé API Claude** (Anthropic) : https://console.anthropic.com/

## Déploiement

### 1. Connecter votre projet Supabase

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Configurer la clé API Claude

```bash
supabase secrets set CLAUDE_API_KEY=sk-ant-api03-xxxxx
```

### 3. Déployer la fonction

```bash
supabase functions deploy translate-blog --no-verify-jwt
```

## Utilisation

La fonction est appelée automatiquement depuis l'interface d'édition d'articles de blog via le bouton "🤖 Traduire avec IA".

### Endpoint

```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/translate-blog
```

### Corps de la requête

```json
{
  "title": "Article title in English",
  "excerpt": "Short summary...",
  "content": "<p>HTML content...</p>",
  "meta_title": "SEO Title",
  "meta_description": "SEO Description",
  "category": "Technology",
  "cta": "Read more",
  "targetLanguages": ["fr", "es", "de", "it", "pt"]  // optionnel
}
```

### Réponse

```json
{
  "success": true,
  "translations": {
    "fr": {
      "title": "Titre de l'article en français",
      "excerpt": "Résumé court...",
      "content": "<p>Contenu HTML...</p>",
      "meta_title": "Titre SEO",
      "meta_description": "Description SEO",
      "category": "Technologie",
      "cta": "En savoir plus"
    },
    "es": { ... },
    "de": { ... },
    "it": { ... },
    "pt": { ... }
  }
}
```

## Coûts

Cette fonction utilise l'API Claude (claude-sonnet-4-20250514). Chaque traduction consomme des tokens.

Estimation pour un article moyen :
- ~2000-4000 tokens d'entrée par langue
- ~2000-4000 tokens de sortie par langue
- Total pour 5 langues : ~20,000-40,000 tokens

Consultez les tarifs Anthropic : https://www.anthropic.com/pricing

## Dépannage

### Erreur "CLAUDE_API_KEY not configured"
```bash
supabase secrets set CLAUDE_API_KEY=votre_cle_api
supabase functions deploy translate-blog --no-verify-jwt
```

### Erreur CORS
La fonction inclut déjà les headers CORS. Si le problème persiste, vérifiez que la fonction est déployée avec `--no-verify-jwt`.

### Erreur de parsing JSON
L'API Claude peut parfois retourner du texte avant/après le JSON. La fonction tente d'extraire le JSON automatiquement.

