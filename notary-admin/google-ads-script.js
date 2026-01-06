/**
 * Google Ads Script pour exporter automatiquement les coûts quotidiens
 * 
 * Instructions :
 * 1. Allez dans Google Ads > Outils > Scripts
 * 2. Créez un nouveau script
 * 3. Collez ce code
 * 4. Remplacez les variables ci-dessous
 * 5. Programmez l'exécution quotidienne
 */

// ⚠️ CONFIGURATION - Remplacez ces valeurs
const SUPABASE_FUNCTION_URL = 'https://jlizwheftlnhoifbqeex.supabase.co/functions/v1/receive-google-ads-costs';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaXp3aGVmdGxuaG9pZmJxZWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjYxODQsImV4cCI6MjA3NjY0MjE4NH0.fgNPzBgLkS7vSpV4cPlS_lvRb4MWp8gn8DPMqXgTbyE'; // Votre Supabase Anon Key

function main() {
  // Récupérer les coûts des 30 derniers jours
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30); // 30 jours en arrière
  
  // Formater les dates au format YYYY-MM-DD (compatible Google Apps Script)
  function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    return year + '-' + month + '-' + day;
  }
  
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(today);
  
  Logger.log('Récupération des coûts du ' + startDateStr + ' au ' + endDateStr + ' (30 derniers jours)');
  
  // Requête pour récupérer les coûts par campagne sur les 30 derniers jours
  const query = 'SELECT CampaignId, CampaignName, Cost, Date ' +
                'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
                'WHERE Date >= "' + startDateStr + '" ' +
                'AND Date <= "' + endDateStr + '" ' +
                'AND Cost > 0 ' +
                'ORDER BY Date DESC';
  
  const report = AdsApp.report(query);
  const rows = report.rows();
  const costs = [];
  
  // Parcourir les résultats
  while (rows.hasNext()) {
    const row = rows.next();
    
    // Google Ads Scripts retourne le coût - format à détecter automatiquement
    const costRaw = parseFloat(row['Cost']);
    
    // Détection automatique du format :
    // - Si >= 10000, c'est probablement en micros (ex: 48600000 = 48.60€)
    // - Si < 10000, c'est probablement déjà en euros (ex: 48.60 = 48.60€)
    let costEuros;
    if (costRaw >= 10000) {
      // Format micros : diviser par 1,000,000
      costEuros = costRaw / 1000000;
    } else {
      // Déjà en euros (ou centimes si < 1, mais généralement en euros)
      costEuros = costRaw;
    }
    
    // Normaliser la date au format YYYY-MM-DD
    let dateValue = row['Date'];
    // Si la date est au format YYYYMMDD (sans tirets), la convertir
    if (dateValue && dateValue.length === 8 && !dateValue.includes('-')) {
      dateValue = dateValue.substring(0, 4) + '-' + dateValue.substring(4, 6) + '-' + dateValue.substring(6, 8);
    }
    
    costs.push({
      date: dateValue,
      cost_amount: costEuros,
      campaign_id: row['CampaignId'].toString(),
      campaign_name: row['CampaignName']
    });
  }
  
  Logger.log('Nombre de coûts trouvés: ' + costs.length);
  
  if (costs.length === 0) {
    Logger.log('Aucun coût trouvé pour la période du ' + startDateStr + ' au ' + endDateStr);
    return;
  }
  
  // Grouper par date pour le log
  const costsByDate = {};
  costs.forEach(cost => {
    if (!costsByDate[cost.date]) {
      costsByDate[cost.date] = 0;
    }
    costsByDate[cost.date] += parseFloat(cost.cost_amount);
  });
  
  Logger.log('Résumé par date:');
  Object.keys(costsByDate).sort().reverse().forEach(date => {
    Logger.log('  ' + date + ': ' + costsByDate[date].toFixed(2) + '€');
  });
  
  // Envoyer à votre API Supabase
  const payload = {
    costs: costs
  };
  
  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, // Utiliser le JWT Supabase
      'apikey': SUPABASE_ANON_KEY
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  // Log pour déboguer
  Logger.log('URL de destination: ' + SUPABASE_FUNCTION_URL);
  Logger.log('Token utilisé: ' + SUPABASE_ANON_KEY.substring(0, 20) + '...');
  Logger.log('Nombre de coûts à envoyer: ' + costs.length);
  
  try {
    const response = UrlFetchApp.fetch(SUPABASE_FUNCTION_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      Logger.log('✅ Coûts synchronisés avec succès: ' + responseText);
    } else {
      Logger.log('❌ Erreur HTTP ' + responseCode + ': ' + responseText);
      Logger.log('⚠️ Vérifiez que SUPABASE_ANON_KEY est correct dans ce script');
    }
  } catch (e) {
    Logger.log('❌ Erreur lors de l\'envoi: ' + e.toString());
    Logger.log('⚠️ Vérifiez que l\'URL de la fonction Edge est correcte');
  }
}

// Fonction pour configurer les déclencheurs automatiques (4 fois par jour)
// Exécutez cette fonction UNE SEULE FOIS pour créer les déclencheurs
function setupTriggers() {
  // Supprimer les anciens déclencheurs pour main()
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Créer 4 déclencheurs quotidiens aux heures spécifiées
  const times = [
    { hour: 8, minute: 0, label: '08:00' },
    { hour: 12, minute: 0, label: '12:00' },
    { hour: 16, minute: 0, label: '16:00' },
    { hour: 20, minute: 0, label: '20:00' }
  ];
  
  times.forEach(time => {
    ScriptApp.newTrigger('main')
      .timeBased()
      .everyDays(1)
      .atHour(time.hour)
      .nearMinute(time.minute)
      .create();
  });
  
  Logger.log('✅ 4 déclencheurs créés pour les heures: ' + times.map(t => t.label).join(', '));
  Logger.log('Le script s\'exécutera automatiquement 4 fois par jour.');
}

// Fonction pour tester avec une date spécifique
function testWithDate(testDate) {
  const testDateObj = new Date(testDate);
  const year = testDateObj.getFullYear();
  const month = (testDateObj.getMonth() + 1 < 10 ? '0' : '') + (testDateObj.getMonth() + 1);
  const day = (testDateObj.getDate() < 10 ? '0' : '') + testDateObj.getDate();
  const dateStr = year + '-' + month + '-' + day;
  
  Logger.log('Test avec la date: ' + dateStr);
  
  const query = 'SELECT CampaignId, CampaignName, Cost, Date ' +
                'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
                'WHERE Date = "' + dateStr + '" ' +
                'AND Cost > 0';
  
  const report = AdsApp.report(query);
  const rows = report.rows();
  
  Logger.log('Nombre de résultats: ' + report.numRows());
  
  while (rows.hasNext()) {
    const row = rows.next();
    Logger.log('Campagne: ' + row['CampaignName'] + ' - Coût: ' + (parseFloat(row['Cost']) / 1000000) + '€');
  }
}

