import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';
import { getServiceBySlug } from '../../data/services';

const ServiceDetailPage = () => {
  const { slug } = useParams();
  const service = getServiceBySlug(slug);

  if (!service) {
    return (
      <Layout>
        <SEO title="Service introuvable" description="Le service recherché n'existe plus ou a été déplacé." />
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Service introuvable</h1>
          <p className="text-sm text-slate-600">Le service que vous recherchez n'est plus disponible.</p>
          <Link to="/services" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            Retourner aux services
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={service.title} description={service.excerpt} keywords={service.keywords} />
      <article className="space-y-16">
        <header className="rounded-4xl bg-white p-10 shadow-xl shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Service notarial</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">{service.title}</h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-600">{service.excerpt}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {service.primaryBenefits.map((benefit) => (
              <div key={benefit} className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-700">
                {benefit}
              </div>
            ))}
          </div>
        </header>

        <section className="space-y-10">
          {service.detailedDescription.map((block) => (
            <div key={block.heading} className="rounded-4xl border border-slate-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">{block.heading}</h2>
              <p className="mt-4 text-sm text-slate-600">{block.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-4xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-10 text-white">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Votre prochain dossier</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">On avance ensemble ?</h2>
              <p className="mt-4 text-sm text-blue-100">
                Partagez vos contraintes, vos interlocuteurs et vos échéances : notre équipe prépare un plan d'action précis en
                moins de 48h.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {["Audit des pièces", 'Planification proactive', 'Signature qualifiée', 'Reporting post-closing'].map((item) => (
                <div key={item} className="rounded-3xl border border-blue-200/30 bg-white/10 p-6 text-sm text-blue-100">
                  <h3 className="text-lg font-semibold text-white">{item}</h3>
                  <p className="mt-3 text-blue-100/90">
                    {item === 'Audit des pièces' && "Nous sécurisons la conformité de chaque document et anticipons les contrôles."}
                    {item === 'Planification proactive' && 'Coordination des intervenants et rétroplanning partagé en temps réel.'}
                    {item === 'Signature qualifiée' && 'Signature électronique qualifiée ou en présentiel selon la réglementation.'}
                    {item === 'Reporting post-closing' && 'Remise d\'un rapport détaillé et archivage numérique sécurisé.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-900 shadow-lg shadow-blue-900/20 transition hover:-translate-y-1"
            >
              Prendre rendez-vous
            </a>
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Voir les autres services
            </Link>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Questions fréquentes</h2>
          <dl className="space-y-4">
            {service.faq.map((item) => (
              <div key={item.question} className="rounded-3xl border border-slate-100 bg-white p-6">
                <dt className="text-base font-semibold text-slate-900">{item.question}</dt>
                <dd className="mt-2 text-sm text-slate-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </Layout>
  );
};

export default ServiceDetailPage;
