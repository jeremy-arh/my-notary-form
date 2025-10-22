import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';
import ServiceCard from '../../components/ServiceCard';
import BlogCard from '../../components/BlogCard';
import { services } from '../../data/services';
import { blogPosts } from '../../data/blog';

const Hero = () => (
  <section className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-10 text-white shadow-2xl">
    {/** SEO component renders meta tags when hero mounts */}
    <SEO
      title="Notaires digitaux pour vos projets immobiliers et internationaux"
      description="Étude notariale digitale spécialisée en transactions immobilières, légalisations internationales et ingénierie patrimoniale. Rendez-vous rapides en visio ou en présentiel."
      keywords={[
        'notaire digital',
        'notaire paris',
        'signature électronique acte',
        'ingénierie patrimoniale',
      ]}
      structuredData={{
        '@context': 'https://schema.org',
        '@type': 'LegalService',
        name: 'My Notary',
        image: 'https://www.mynotary.fr/logo.png',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://www.mynotary.fr',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '128 Rue du Progrès',
          addressLocality: 'Paris',
          postalCode: '75010',
          addressCountry: 'FR',
        },
        telephone: '+33184000000',
        areaServed: 'France et international',
        sameAs: ['https://www.linkedin.com/company/my-notary'],
        makesOffer: services.map((service) => ({ '@type': 'Offer', name: service.title })),
      }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_45%)]" aria-hidden />
    <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Étude notariale nouvelle génération</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-5xl">
          Le partenaire notarial qui simplifie vos démarches et accélère vos projets
        </h1>
        <p className="mt-6 max-w-xl text-base text-blue-100">
          Nos notaires digitalisent vos parcours immobiliers, patrimoniaux et internationaux. Rendez-vous flexibles, suivi en
          ligne, signature électronique qualifiée : nous orchestrons vos dossiers avec rigueur et transparence.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-900 shadow-lg shadow-blue-900/30 transition hover:-translate-y-1"
          >
            Planifier un échange
          </a>
          <Link
            to="/services"
            className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Découvrir nos expertises
          </Link>
        </div>
        <dl className="mt-12 grid gap-6 text-sm text-blue-100 sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-[0.2em] text-blue-200">+1200 dossiers</dt>
            <dd>Clôturés en 2024 avec une satisfaction client de 4,9/5.</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.2em] text-blue-200">48h</dt>
            <dd>Pour l&apos;apostille de vos documents prioritaires.</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.2em] text-blue-200">14 pays</dt>
            <dd>Couverture internationale grâce à notre réseau de notaires partenaires.</dd>
          </div>
        </dl>
      </div>

      <div className="relative hidden rounded-3xl border border-blue-200/50 bg-white/10 p-6 backdrop-blur-lg lg:block">
        <div className="space-y-6 text-sm text-blue-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Votre feuille de route</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Une méthode claire en 3 étapes</h2>
          </div>
          <ol className="space-y-4">
            {["Brief stratégique", 'Préparation & vérifications', 'Signature & suivi'].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/20 text-base font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{step}</p>
                  <p className="text-xs text-blue-100/80">
                    {index === 0 && 'Analyse juridique, audit des pièces et planification sur-mesure de votre dossier.'}
                    {index === 1 && 'Collecte des documents, vérifications réglementaires et coordination avec vos partenaires.'}
                    {index === 2 && 'Signature électronique qualifiée et archivage sécurisé, avec reporting post-closing.'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-8 rounded-2xl border border-blue-200/40 bg-white/10 p-5 text-xs text-blue-100">
          <p className="font-semibold uppercase tracking-[0.2em] text-blue-200">Disponibilités</p>
          <p className="mt-3 text-base font-semibold text-white">Créneaux visio sous 24h</p>
          <p className="mt-2 leading-relaxed">
            Notre conciergerie notariale vous propose un rendez-vous en présentiel ou en visioconférence, selon vos contraintes
            horaires et géographiques.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const ServicesPreview = () => (
  <section className="mt-20">
    <div className="flex flex-col gap-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Expertises clés</p>
      <h2 className="text-3xl font-semibold text-slate-900">Des services pensés pour accélérer vos projets</h2>
      <p className="mx-auto max-w-2xl text-sm text-slate-600">
        Nous combinons la rigueur notariale et l&apos;agilité digitale pour délivrer un accompagnement premium à chaque étape de
        vos dossiers.
      </p>
    </div>
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.slug} service={service} />
      ))}
    </div>
  </section>
);

const Testimonials = () => (
  <section className="mt-24 rounded-4xl bg-white p-10 shadow-xl shadow-slate-200/60">
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Ils nous font confiance</p>
        <h2 className="mt-4 text-3xl font-semibold text-slate-900">Des clients exigeants, des dossiers complexes</h2>
        <p className="mt-4 text-sm text-slate-600">
          Dirigeants, investisseurs, expatriés : notre équipe accompagne des profils qui recherchent de la performance et de la
          sécurité juridique.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[
          {
            content:
              '“Grâce à My Notary, nous avons signé la cession de notre filiale en moins de huit semaines avec un dispositif de signature électronique sécurisé.”',
            author: 'Claire D., CFO scale-up fintech',
          },
          {
            content:
              '“Ils maîtrisent parfaitement les contraintes internationales. Mon équipe a pu faire légaliser plus de 200 contrats pour nos expatriés.”',
            author: 'Nicolas R., DRH groupe industriel',
          },
          {
            content:
              '“Un accompagnement humain malgré la distance. Les rendez-vous visio sont très efficaces et l’espace client très intuitif.”',
            author: 'Sophie M., entrepreneure expatriée à Dubaï',
          },
          {
            content:
              '“Leur expertise patrimoniale nous a permis d’optimiser notre transmission familiale tout en préparant la reprise de l’entreprise.”',
            author: 'Famille L., dirigeants PME familiale',
          },
        ].map((testimonial) => (
          <figure key={testimonial.author} className="rounded-3xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-600">
            <blockquote className="leading-relaxed">{testimonial.content}</blockquote>
            <figcaption className="mt-4 font-semibold text-slate-900">{testimonial.author}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

const BlogPreview = () => (
  <section className="mt-24">
    <div className="flex flex-col gap-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Ressources</p>
      <h2 className="text-3xl font-semibold text-slate-900">Conseils de nos notaires</h2>
      <p className="mx-auto max-w-2xl text-sm text-slate-600">
        Articles pédagogiques, retours d&apos;expérience et analyses réglementaires pour faire les bons choix.
      </p>
    </div>
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {blogPosts.slice(0, 3).map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
    <div className="mt-10 text-center">
      <Link
        to="/blog"
        className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:text-blue-900"
      >
        Voir tous les articles
      </Link>
    </div>
  </section>
);

const ContactSection = () => (
  <section id="contact" className="mt-24 rounded-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-white">
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Prendre rendez-vous</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Discutons de votre prochain dossier</h2>
        <p className="mt-4 text-sm text-blue-100">
          Notre équipe vous recontacte sous 24h pour cadrer votre besoin, estimer les délais et constituer la première checklist
          de documents.
        </p>
        <div className="mt-6 space-y-4 text-sm text-blue-100">
          <p className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-semibold">1</span>
            Diagnostic offert de 30 minutes en visioconférence.
          </p>
          <p className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-semibold">2</span>
            Feuille de route personnalisée et devis transparent.
          </p>
          <p className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-semibold">3</span>
            Accès immédiat à l&apos;espace client sécurisé My Notary.
          </p>
        </div>
      </div>
      <form className="space-y-4" aria-label="Formulaire de contact">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-white" htmlFor="contact-name">
            Nom complet
            <input
              id="contact-name"
              name="name"
              type="text"
              placeholder="Ex. Jeanne Martin"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white" htmlFor="contact-email">
            Email professionnel
            <input
              id="contact-email"
              name="email"
              type="email"
              placeholder="prenom@entreprise.fr"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-white" htmlFor="contact-service">
          Service souhaité
          <select
            id="contact-service"
            name="service"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Sélectionnez un service
            </option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug} className="text-slate-900">
                {service.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white" htmlFor="contact-message">
          Décrivez votre projet
          <textarea
            id="contact-message"
            name="message"
            rows="4"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
            placeholder="Parlez-nous de votre besoin, des échéances et des parties prenantes."
            required
          />
        </label>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-900 shadow-lg shadow-slate-900/20 transition hover:-translate-y-1 md:w-auto"
        >
          Envoyer ma demande
        </button>
        <p className="text-xs text-blue-200">
          En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour être recontacté dans le cadre de votre
          demande. Consultez notre politique de confidentialité.
        </p>
      </form>
    </div>
  </section>
);

const HomePage = () => (
  <Layout>
    <div className="space-y-20">
      <Hero />
      <ServicesPreview />
      <Testimonials />
      <BlogPreview />
      <ContactSection />
    </div>
  </Layout>
);

export default HomePage;
