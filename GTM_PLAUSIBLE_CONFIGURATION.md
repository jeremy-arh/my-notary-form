# 🔧 Configuration Plausible via Google Tag Manager

## 📋 Vue d'ensemble

Plausible Analytics est maintenant intégré via Google Tag Manager (GTM) au lieu d'être chargé directement dans le HTML. Cela permet :

- ✅ **Gestion centralisée** : Tous les tags dans GTM
- ✅ **Moins de blocage** : GTM est moins souvent bloqué que Plausible
- ✅ **Flexibilité** : Facile d'ajouter/modifier les événements
- ✅ **Server-side tagging** : Possibilité d'utiliser GTM server-side pour encore plus de fiabilité

## 🏗️ Architecture

```
Site Web → dataLayer GTM → GTM Container → Plausible API
```

Les événements sont envoyés via le `dataLayer` GTM avec les événements suivants :
- `plausible_pageview` : Pour les pageviews
- `plausible_event` : Pour les événements personnalisés

## 📝 Configuration dans GTM

### Étape 1 : Créer les Variables

#### Variable 1 : Plausible Domain
1. **Variables** → **Nouvelle**
2. **Nom** : `Plausible Domain`
3. **Type** : Constante
4. **Valeur** : `mynotary.io`

#### Variable 2 : Plausible Event Name
1. **Variables** → **Nouvelle**
2. **Nom** : `Plausible Event Name`
3. **Type** : Variable de Data Layer
4. **Nom de la variable Data Layer** : `plausible_event`

#### Variable 3 : Plausible Props
1. **Variables** → **Nouvelle**
2. **Nom** : `Plausible Props`
3. **Type** : Variable de Data Layer
4. **Nom de la variable Data Layer** : `plausible_props`

#### Variable 4 : Page Path
1. **Variables** → **Nouvelle**
2. **Nom** : `Page Path`
3. **Type** : Variable de Data Layer
4. **Nom de la variable Data Layer** : `page_path`

### Étape 2 : Créer les Déclencheurs (Triggers)

#### Déclencheur 1 : Plausible Pageview
1. **Déclencheurs** → **Nouveau**
2. **Nom** : `Plausible Pageview`
3. **Type** : Événement personnalisé
4. **Nom de l'événement** : `plausible_pageview`

#### Déclencheur 2 : Plausible Event
1. **Déclencheurs** → **Nouveau**
2. **Nom** : `Plausible Event`
3. **Type** : Événement personnalisé
4. **Nom de l'événement** : `plausible_event`

### Étape 3 : Créer les Balises (Tags)

#### Balise 1 : Plausible Pageview

1. **Balises** → **Nouvelle**
2. **Nom** : `Plausible - Pageview`
3. **Type** : Requête HTTP
4. **Configuration** :
   - **URL** : `https://plausible.io/api/event`
   - **Méthode** : POST
   - **En-têtes** :
     - `Content-Type` : `application/json`
   - **Corps** :
   ```json
   {
     "domain": "{{Plausible Domain}}",
     "name": "pageview",
     "url": "{{Page URL}}",
     "referrer": "{{Page Referrer}}"
   }
   ```
5. **Déclenchement** : `Plausible Pageview`

#### Balise 2 : Plausible Custom Events

1. **Balises** → **Nouvelle**
2. **Nom** : `Plausible - Custom Events`
3. **Type** : Requête HTTP
4. **Configuration** :
   - **URL** : `https://plausible.io/api/event`
   - **Méthode** : POST
   - **En-têtes** :
     - `Content-Type` : `application/json`
   - **Corps** :
   ```json
   {
     "domain": "{{Plausible Domain}}",
     "name": "{{Plausible Event Name}}",
     "url": "{{Page URL}}",
     "referrer": "{{Page Referrer}}",
     "props": {{Plausible Props}}
   }
   ```
5. **Déclenchement** : `Plausible Event`

### Étape 4 : Configuration Server-Side (Optionnel mais Recommandé)

Si vous utilisez GTM Server-Side Tagging :

1. **Server Container** → **Tags** → **Nouvelle**
2. **Nom** : `Plausible - Server-Side`
3. **Type** : Requête HTTP
4. **Configuration** :
   - **URL** : `https://plausible.io/api/event`
   - **Méthode** : POST
   - **En-têtes** :
     - `Content-Type` : `application/json`
   - **Corps** :
   ```json
   {
     "domain": "{{Plausible Domain}}",
     "name": "{{Plausible Event Name}}",
     "url": "{{Page URL}}",
     "referrer": "{{Page Referrer}}",
     "props": {{Plausible Props}}
   }
   ```

## 🔍 Événements Trackés

### Pageviews
- **Événement GTM** : `plausible_pageview`
- **Envoi automatique** : À chaque changement de route

### Événements Personnalisés

| Événement | Nom Plausible | Propriétés |
|-----------|---------------|------------|
| CTA Click | `cta_click` | `cta_type`, `cta_location` |
| Service Click | `service_click` | `service_id`, `service_name`, `click_location` |
| Login Click | `login_click` | `click_location` |
| Navigation Click | `navigation_click` | `link_text`, `destination` |
| Blog Post View | `blog_post_view` | `post_slug`, `post_title` |

## 🧪 Test et Vérification

### 1. Vérifier le DataLayer

Ouvrez la console du navigateur et tapez :
```javascript
dataLayer
```

Vous devriez voir les événements `plausible_pageview` et `plausible_event`.

### 2. Vérifier les Requêtes

1. Ouvrez les **Outils de développement** → **Réseau**
2. Filtrez par `plausible.io`
3. Vous devriez voir des requêtes POST vers `https://plausible.io/api/event`

### 3. Vérifier dans Plausible

1. Connectez-vous à votre dashboard Plausible
2. Les événements devraient apparaître dans les **Goals** → **Custom Events**
3. Les pageviews devraient apparaître dans la vue principale

## 🐛 Dépannage

### Les événements ne sont pas envoyés

1. **Vérifiez GTM** : Assurez-vous que GTM est chargé (vérifiez la console)
2. **Vérifiez le DataLayer** : Les événements doivent être dans `dataLayer`
3. **Vérifiez les Déclencheurs** : Les noms d'événements doivent correspondre exactement
4. **Mode Debug** : Utilisez GTM Preview pour voir si les balises se déclenchent

### Les événements sont envoyés mais n'apparaissent pas dans Plausible

1. **Vérifiez le domaine** : Doit être exactement `mynotary.io`
2. **Vérifiez le format JSON** : Le corps de la requête doit être valide
3. **Vérifiez les permissions** : Le domaine doit être configuré dans Plausible

## 📚 Ressources

- [Plausible Events API](https://plausible.io/docs/events-api)
- [GTM HTTP Request Tag](https://support.google.com/tagmanager/answer/6107013)
- [GTM Server-Side Tagging](https://support.google.com/tagmanager/answer/9205541)




