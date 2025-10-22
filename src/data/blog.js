export const blogPosts = [
  {
    slug: 'digitalisation-office-notarial',
    title: 'Digitalisation du notariat : comment offrir une expérience fluide à vos clients',
    excerpt:
      "Découvrez les leviers digitaux qui permettent aux études notariales de réduire les délais, de sécuriser leurs échanges et d'offrir un parcours client moderne.",
    readingTime: '6 min',
    publishedAt: '2025-01-07',
    keywords: [
      'digitalisation notaire',
      'signature électronique notaire',
      'expérience client notariat',
    ],
    coverImageAlt: 'Signature électronique sur tablette lors dun rendez-vous notarial',
    content: [
      {
        heading: 'Pourquoi moderniser votre parcours client ?',
        body: `La digitalisation est devenue un critère différenciant pour les études notariales. Elle permet d'accélérer le
        traitement des dossiers, d'améliorer la transparence et de sécuriser les échanges sensibles. Les clients attendent
        désormais des notifications en temps réel, la signature à distance et une disponibilité accrue des notaires.`,
      },
      {
        heading: 'Les outils indispensables',
        body: `Portail client sécurisé, visioconférence certifiée, signature électronique qualifiée et coffre-fort numérique
        font désormais partie du socle technologique. L'intégration de ces outils avec votre logiciel métier est
        essentielle pour éviter les ressaisies et garantir la traçabilité.`,
      },
      {
        heading: 'Les facteurs clés de succès',
        body: `Au-delà de la technologie, la réussite repose sur la conduite du changement et la formation continue des équipes.
        Une stratégie de communication claire permet d'accompagner vos clients et partenaires vers ces nouveaux usages.`,
      },
    ],
  },
  {
    slug: 'optimiser-signature-actes-distance',
    title: 'Optimiser la signature d’actes à distance en toute conformité',
    excerpt:
      "Comment préparer vos clients, vos outils et vos processus internes pour proposer la signature d'actes authentiques à distance en toute sécurité.",
    readingTime: '5 min',
    publishedAt: '2024-12-12',
    keywords: [
      'signature à distance',
      'acte authentique électronique',
      'visioconférence notaire',
    ],
    coverImageAlt: 'Client signant un acte notarié à distance via visioconférence',
    content: [
      {
        heading: 'Cadre légal et prérequis',
        body: `La signature à distance est strictement encadrée. Elle nécessite une vérification renforcée de l'identité, l'usage
        de certificats qualifiés et la présence simultanée de toutes les parties. Un audit de conformité est indispensable
        avant de déployer ce service.`,
      },
      {
        heading: 'Préparer vos clients',
        body: `Informez vos clients des étapes, prévoyez un test technique et mettez à leur disposition un support réactif.
        L'objectif : éviter les blocages le jour de la signature et maintenir une relation de confiance.`,
      },
      {
        heading: 'Structurer vos processus internes',
        body: `Documentez vos procédures, formez vos collaborateurs et assurez-vous que vos solutions techniques sont compatibles
        avec le minutier électronique. Un reporting régulier permet de mesurer le taux de réussite et d'identifier les axes d'amélioration.`,
      },
    ],
  },
  {
    slug: 'strategie-contenu-etude-notariale',
    title: 'Stratégie de contenu : positionner votre étude notariale comme référence',
    excerpt:
      "Produire des contenus pédagogiques et optimisés pour le SEO est un levier puissant pour attirer de nouveaux clients et fidéliser votre audience professionnelle.",
    readingTime: '7 min',
    publishedAt: '2024-11-20',
    keywords: [
      'marketing notarial',
      'contenu juridique',
      'seo notaire',
    ],
    coverImageAlt: 'Notaire rédigeant un article de blog sur un ordinateur portable',
    content: [
      {
        heading: 'Choisir les bons sujets',
        body: `Analysez les questions fréquentes de vos clients, suivez l'actualité réglementaire et identifiez les mots-clés
        pertinents. Priorisez les sujets qui répondent à un besoin concret et qui valorisent votre expertise.`,
      },
      {
        heading: 'Structurer des contenus clairs et accessibles',
        body: `Utilisez un langage compréhensible, ponctuez vos articles d'exemples et proposez des ressources téléchargeables.
        L'objectif est de rendre la matière juridique intelligible sans compromettre la précision.`,
      },
      {
        heading: 'Assurer le suivi de vos performances',
        body: `Mesurez vos résultats avec un tableau de bord SEO : trafic organique, temps de lecture, nombre de leads générés.
        Ces indicateurs vous aideront à ajuster votre calendrier éditorial.`,
      },
    ],
  },
];

export const getPostBySlug = (slug) => blogPosts.find((post) => post.slug === slug);
