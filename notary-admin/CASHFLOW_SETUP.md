# Configuration du Suivi de Trésorerie

## Installation

### 1. Exécuter la migration SQL

Exécutez le fichier `supabase-cashflow-migration.sql` dans votre Supabase SQL Editor pour créer les tables nécessaires :

- `webservice_costs` : Coûts mensuels des webservices
- `google_ads_costs` : Coûts journaliers Google Ads
- `notary_payments` : Versements aux notaires

### 2. Vérifier les dépendances

Les dépendances suivantes sont déjà installées :
- `date-fns` : Pour la gestion des dates et du calendrier
- `@iconify/react` : Pour les icônes

## Fonctionnalités

### KPI (Indicateurs Clés de Performance)

- **MRR (Monthly Recurring Revenue)** : Revenu récurrent mensuel moyen calculé sur les 3 derniers mois
- **Revenus Mensuels** : Total des revenus Stripe pour le mois sélectionné
- **Marge Mensuelle** : Différence entre revenus et coûts (en € et %)
- **Coûts Totaux** : Somme de tous les coûts du mois

### Types de Coûts

1. **Webservices** : Coûts mensuels ou annuels des services web
   - Nom du service
   - Montant
   - Période de facturation (mensuel/annuel)
   - Date de facturation
   - Description

2. **Google Ads** : Coûts journaliers des campagnes publicitaires
   - Montant
   - Date
   - Nom de la campagne
   - Description

3. **Versements Notaires** : Paiements effectués aux notaires
   - Nom du notaire
   - Montant
   - Date de versement
   - ID de soumission (optionnel)
   - Description

### Calendrier

Le calendrier affiche jour par jour :
- **Revenus** (en vert) : Paiements Stripe reçus
- **Coûts Google Ads** (en orange) : Dépenses publicitaires
- **Versements Notaires** (en rouge) : Paiements aux notaires
- **Net** : Solde net du jour (revenus - coûts)

Les jours avec un solde positif ont une bordure verte, les jours avec un solde négatif ont une bordure rouge.

### Revenus Stripe

Les revenus sont automatiquement récupérés depuis la table `submission` en filtrant les paiements avec le statut `paid`. Les montants sont convertis de centimes en euros.

## Utilisation

1. Accédez à la page "Trésorerie" depuis le menu latéral
2. Sélectionnez le mois à visualiser avec le sélecteur de mois en haut à droite
3. Ajoutez des coûts en cliquant sur le bouton "+" dans chaque section
4. Consultez le calendrier pour voir la répartition jour par jour
5. Analysez les KPI pour suivre la santé financière

## Notes

- Les revenus sont automatiquement synchronisés avec Stripe via la table `submission`
- Les coûts doivent être saisis manuellement
- Le MRR est calculé comme la moyenne des revenus des 3 derniers mois
- La marge est calculée comme : Revenus - Coûts totaux

