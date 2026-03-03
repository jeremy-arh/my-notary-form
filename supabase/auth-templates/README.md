# Templates d'authentification Supabase

Ces templates sont alignés sur le style des emails transactionnels (send-transactional-email) pour une cohérence visuelle et un rendu responsive identique.

## Magic Link

**Fichier :** `magic-link.html`

### Configuration

1. Ouvrez **Supabase Dashboard** > **Authentication** > **Email** > **Magic link**
2. Copiez le contenu de `magic-link.html` dans le champ **Body**
3. **Subject** : `Your Magic Link` (ou votre préférence)
4. Cliquez sur **Save changes**

### Responsive

Le template utilise les mêmes breakpoints que les emails transactionnels :

- **Mobile (< 620px)** : padding réduit, logo 110px, bouton pleine largeur, texte 16px
- **Desktop** : padding 50px, logo 130px, bouton 280px

### Variables Supabase

- `{{ .ConfirmationURL }}` : lien principal du magic link (authentification)
- `{{ .SiteURL }}` : lien secondaire vers le site
