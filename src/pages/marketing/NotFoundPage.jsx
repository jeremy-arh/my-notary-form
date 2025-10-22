import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';

const NotFoundPage = () => (
  <Layout>
    <SEO title="Page introuvable" description="La page que vous recherchez n'existe pas ou a été déplacée." />
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Erreur 404</p>
      <h1 className="text-3xl font-semibold text-slate-900">Oups, cette page est introuvable</h1>
      <p className="max-w-lg text-sm text-slate-600">
        La ressource demandée a peut-être été déplacée ou supprimée. Retournez à l&apos;accueil pour poursuivre votre navigation.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Revenir à l&apos;accueil
        </Link>
        <Link
          to="/services"
          className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:text-blue-900"
        >
          Explorer nos services
        </Link>
      </div>
    </div>
  </Layout>
);

export default NotFoundPage;
