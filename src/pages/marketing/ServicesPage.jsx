import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';
import ServiceCard from '../../components/ServiceCard';
import { services } from '../../data/services';

const ServicesHero = () => (
  <section className="rounded-4xl bg-white p-10 shadow-xl shadow-slate-200/60">
    <SEO
      title="Services notariaux digitaux"
      description="My Notary propose des services notariaux haut de gamme : transactions immobilières, légalisation de documents internationaux, ingénierie patrimoniale."
      keywords={['services notariaux', 'notaire digital', 'legalisation', 'immobilier', 'patrimoine']}
    />
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Nos expertises</p>
    <h1 className="mt-4 text-3xl font-semibold text-slate-900">Des services orchestrés de bout en bout</h1>
    <p className="mt-4 max-w-3xl text-sm text-slate-600">
      Chaque mission est pilotée par un notaire dédié, épaulé par une équipe projet pluridisciplinaire (juristes, fiscalistes,
      chargés de relation client). Grâce à nos outils digitaux, vous gardez la main sur votre dossier avec une visibilité totale.
    </p>
  </section>
);

const ServicesPage = () => (
  <Layout>
    <div className="space-y-16">
      <ServicesHero />
      <section className="grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </section>
      <section className="rounded-4xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-10 text-white">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Accompagnement premium</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Une conciergerie notariale disponible et proactive</h2>
            <p className="mt-4 text-sm text-blue-100">
              Nos équipes vous répondent 6j/7, orchestrent les relances auprès des administrations et vous fournissent un
              reporting hebdomadaire personnalisé.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: 'Chef de projet dédié',
                description: 'Un interlocuteur unique qui coordonne notaires, juristes et partenaires externes.',
              },
              {
                title: 'Tableau de bord en direct',
                description: 'Suivez vos jalons, pièces manquantes et prochaines échéances sur notre plateforme.',
              },
              {
                title: 'Sécurité juridique renforcée',
                description: 'Audit qualité systématique, archivage conforme au RGPD et signature qualifiée.',
              },
              {
                title: 'Réseau international',
                description: 'Partenaires de confiance pour vos dossiers multijuridictionnels et multilingues.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-blue-200/30 bg-white/10 p-6 text-sm text-blue-100">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-blue-100/90">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-900 shadow-lg shadow-blue-900/20 transition hover:-translate-y-1"
          >
            Parler à un notaire
          </a>
          <Link
            to="/blog"
            className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Consulter nos analyses
          </Link>
        </div>
      </section>
    </div>
  </Layout>
);

export default ServicesPage;
