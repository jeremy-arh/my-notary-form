# Formulaire de Demande de Service Notarié

Application web responsive pour la réservation de services notariés avec un formulaire multi-étapes.

## Fonctionnalités

- **Formulaire multi-étapes** avec barre de progression
- **Design responsive** optimisé pour mobile, tablette et desktop
- **Validation des données** en temps réel
- **Interface intuitive** avec Tailwind CSS

### Étapes du formulaire

1. **Sélection de services** - Choix des services notariés et options supplémentaires
2. **Réservation de rendez-vous** - Sélection de la date, l'heure et le lieu
3. **Informations personnelles** - Coordonnées complètes du client
4. **Récapitulatif** - Vérification et soumission de la demande

## Technologies utilisées

- React 19.1.1
- Vite 7.1.7
- Tailwind CSS 4.1.15
- PostCSS & Autoprefixer

## Installation

\`\`\`bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build de production
npm run preview
\`\`\`

## Structure du projet

\`\`\`
src/
├── components/
│   ├── NotaryForm.jsx              # Composant principal du formulaire
│   └── steps/
│       ├── ServiceSelection.jsx    # Étape 1: Sélection des services
│       ├── AppointmentBooking.jsx  # Étape 2: Réservation
│       ├── PersonalInfo.jsx        # Étape 3: Informations
│       └── Summary.jsx             # Étape 4: Récapitulatif
├── App.jsx                         # Composant racine
├── main.jsx                        # Point d'entrée
└── index.css                       # Styles Tailwind
\`\`\`

## Services disponibles

- Achat/Vente immobilière
- Testament
- Procuration
- Contrat de mariage
- Succession
- Authentification de documents

## Options supplémentaires

- Service urgent (48h)
- Déplacement à domicile
- Service de traduction
- Consultation juridique préalable

## Développement

Le projet utilise Vite pour un développement rapide avec Hot Module Replacement (HMR). Les modifications sont reflétées instantanément dans le navigateur.

## Personnalisation

Pour personnaliser les services, horaires ou lieux de rendez-vous, modifiez les constantes dans les fichiers respectifs:
- Services: \`src/components/steps/ServiceSelection.jsx\`
- Horaires: \`src/components/steps/AppointmentBooking.jsx\`
- Lieux: \`src/components/steps/AppointmentBooking.jsx\`

## Licence

MIT
