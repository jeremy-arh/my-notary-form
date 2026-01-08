# Alternatives plus simples à l'API Google Ads

Malheureusement, **Google Ads API ne supporte pas les clés API simples** - elle nécessite OAuth 2.0 pour des raisons de sécurité.

Cependant, voici **3 alternatives plus simples** :

---

## 🎯 Option 1 : Google Ads Scripts (Recommandé - Le plus simple)

Google Ads Scripts permet d'automatiser l'export des données sans OAuth complexe.

### Avantages :
- ✅ Pas besoin de OAuth 2.0 complet
- ✅ Exécution automatique quotidienne
- ✅ Gratuit et intégré à Google Ads
- ✅ Peut envoyer les données directement à votre API

### Comment ça marche :

1. **Créer un script Google Ads** :
   - Allez dans Google Ads > Outils > Scripts
   - Créez un nouveau script

2. **Le script récupère les coûts et les envoie à votre API** :

```javascript
// Script Google Ads pour exporter les coûts quotidiens
function main() {
  // Récupérer les coûts du jour précédent
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = Utilities.formatDate(yesterday, Session.getTimeZone(), 'yyyy-MM-dd');
  
  // Requête pour récupérer les coûts par campagne
  const report = AdsApp.report(
    'SELECT CampaignId, CampaignName, Cost, Date ' +
    'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
    'WHERE Date = "' + dateStr + '"'
  );
  
  const rows = report.rows();
  const costs = [];
  
  while (rows.hasNext()) {
    const row = rows.next();
    costs.push({
      date: row['Date'],
      cost_amount: parseFloat(row['Cost']) / 1000000, // Convertir micros en euros
      campaign_id: row['CampaignId'],
      campaign_name: row['CampaignName']
    });
  }
  
  // Envoyer à votre API Supabase
  const url = 'https://VOTRE_PROJET.supabase.co/functions/v1/sync-google-ads-costs';
  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer VOTRE_SUPABASE_ANON_KEY'
    },
    'payload': JSON.stringify({ costs: costs })
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log('Coûts synchronisés: ' + response.getContentText());
  } catch (e) {
    Logger.log('Erreur: ' + e.toString());
  }
}
```

3. **Programmer l'exécution** :
   - Dans Google Ads Scripts, configurez l'exécution quotidienne
   - Le script s'exécutera automatiquement chaque jour

---

## 📊 Option 2 : Export CSV + Import manuel

### Avantages :
- ✅ Très simple à mettre en place
- ✅ Pas besoin de tokens complexes
- ✅ Contrôle total sur les données

### Inconvénients :
- ❌ Nécessite une action manuelle
- ❌ Pas automatique

### Comment faire :

1. **Exporter depuis Google Ads** :
   - Google Ads > Rapports > Rapports prédéfinis
   - Sélectionnez "Performance des campagnes"
   - Exportez en CSV

2. **Créer une fonction d'import CSV** dans votre interface :
   - Ajoutez un bouton "Importer CSV"
   - Parsez le fichier CSV
   - Insérez les données dans `google_ads_costs`

---

## 📈 Option 3 : Google Sheets + Zapier/Make

### Avantages :
- ✅ Interface visuelle
- ✅ Automatisation possible via Zapier/Make
- ✅ Pas besoin de coder

### Comment faire :

1. **Exporter Google Ads vers Google Sheets** :
   - Utilisez Google Ads Scripts pour exporter vers Sheets
   - Ou exportez manuellement

2. **Synchroniser Sheets vers Supabase** :
   - Utilisez Zapier ou Make.com
   - Créez un webhook qui lit Sheets et envoie à Supabase

---

## 🚀 Solution recommandée : Google Ads Scripts

Je recommande **l'Option 1 (Google Ads Scripts)** car :
- C'est gratuit
- Automatique
- Pas besoin de OAuth complexe
- Intégré directement dans Google Ads

Voulez-vous que je crée le script Google Ads complet et l'endpoint API pour recevoir les données ?


