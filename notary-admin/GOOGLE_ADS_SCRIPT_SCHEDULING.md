# Programmer le script Google Ads Scripts - 4 fois par jour

## 📅 Configuration des déclencheurs (Triggers)

Google Ads Scripts permet de programmer l'exécution automatique de scripts à des heures fixes.

### Méthode 1 : Via l'interface Google Ads Scripts (Recommandé)

1. **Ouvrez votre script** dans Google Ads :
   - Allez dans Google Ads > Outils > Scripts
   - Cliquez sur votre script

2. **Configurez les déclencheurs** :
   - En haut du script, cliquez sur **"Déclencheurs"** ou **"Triggers"**
   - Cliquez sur **"+ Ajouter un déclencheur"** ou **"+ Add trigger"**

3. **Créez 4 déclencheurs** avec ces paramètres :

#### Déclencheur 1 - 8h00
- **Événement** : Basé sur l'heure
- **Heure** : 08:00
- **Fuseau horaire** : Votre fuseau horaire (ex: Europe/Paris)
- **Fréquence** : Quotidien

#### Déclencheur 2 - 12h00
- **Événement** : Basé sur l'heure
- **Heure** : 12:00
- **Fuseau horaire** : Votre fuseau horaire
- **Fréquence** : Quotidien

#### Déclencheur 3 - 16h00
- **Événement** : Basé sur l'heure
- **Heure** : 16:00
- **Fuseau horaire** : Votre fuseau horaire
- **Fréquence** : Quotidien

#### Déclencheur 4 - 20h00
- **Événement** : Basé sur l'heure
- **Heure** : 20:00
- **Fuseau horaire** : Votre fuseau horaire
- **Fréquence** : Quotidien

### Méthode 2 : Via le code (Alternative)

Si vous préférez configurer les déclencheurs directement dans le code, ajoutez cette fonction à la fin de votre script :

```javascript
// Fonction pour configurer les déclencheurs automatiquement
function setupTriggers() {
  // Supprimer les anciens déclencheurs
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Créer 4 déclencheurs quotidiens
  const times = ['08:00', '12:00', '16:00', '20:00'];
  
  times.forEach(time => {
    const parts = time.split(':');
    const hour = parseInt(parts[0]);
    const minute = parseInt(parts[1]);
    
    ScriptApp.newTrigger('main')
      .timeBased()
      .everyDays(1)
      .atHour(hour)
      .nearMinute(minute)
      .create();
  });
  
  Logger.log('✅ 4 déclencheurs créés pour les heures: ' + times.join(', '));
}
```

**Pour utiliser cette méthode :**
1. Ajoutez la fonction `setupTriggers()` à votre script
2. Exécutez-la **une seule fois** manuellement
3. Supprimez-la ensuite du script (ou laissez-la commentée)

## ⚙️ Configuration recommandée

### Horaires suggérés (4 fois par jour)

- **08:00** - Synchronisation matinale
- **12:00** - Synchronisation midi
- **16:00** - Synchronisation après-midi
- **20:00** - Synchronisation soir

### Autres options

Vous pouvez aussi choisir d'autres horaires selon vos besoins :
- **6h, 12h, 18h, 0h** (toutes les 6 heures)
- **9h, 13h, 17h, 21h** (heures de bureau)
- **Toutes les heures** (24 déclencheurs)

## 📊 Vérification des exécutions

Pour vérifier que les déclencheurs fonctionnent :

1. **Dans Google Ads Scripts** :
   - Allez dans l'onglet **"Exécutions"** ou **"Executions"**
   - Vous verrez l'historique des exécutions avec leur statut

2. **Vérifier les logs** :
   - Cliquez sur une exécution pour voir les logs
   - Vérifiez que les coûts sont bien synchronisés

## ⚠️ Limitations importantes

1. **Quota d'exécution** :
   - Google Ads Scripts a une limite d'exécutions par jour
   - Avec 4 exécutions/jour, vous êtes largement dans les limites

2. **Délai de traitement** :
   - Les données Google Ads peuvent avoir un délai de 3-24h
   - Les données du jour même peuvent ne pas être complètes

3. **Fuseau horaire** :
   - Assurez-vous de configurer le bon fuseau horaire
   - Les heures sont en temps local du fuseau sélectionné

## 🔧 Dépannage

### Le script ne s'exécute pas automatiquement

1. Vérifiez que les déclencheurs sont bien créés
2. Vérifiez le fuseau horaire
3. Vérifiez que le script n'a pas d'erreurs
4. Vérifiez les quotas dans Google Ads

### Le script s'exécute mais échoue

1. Vérifiez les logs pour voir l'erreur
2. Vérifiez que l'URL de la fonction Edge est correcte
3. Vérifiez que le token Supabase est valide
4. Vérifiez la connexion internet

## 📝 Notes

- Les déclencheurs persistent même si vous modifiez le script
- Vous pouvez modifier les horaires à tout moment
- Vous pouvez désactiver temporairement un déclencheur sans le supprimer
- Les exécutions manuelles ne comptent pas dans les quotas automatiques


