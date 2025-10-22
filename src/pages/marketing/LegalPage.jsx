import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';

const LegalPage = () => (
  <Layout>
    <SEO title="Mentions légales" description="Informations légales de My Notary, étude notariale digitale." />
    <article className="mx-auto max-w-3xl space-y-6 text-sm text-slate-600">
      <h1 className="text-3xl font-semibold text-slate-900">Mentions légales</h1>
      <p>
        Le présent site est édité par My Notary, société d&apos;exercice libéral à forme anonyme au capital de 250 000 €, immatriculée
        au RCS de Paris sous le numéro 812 345 678, dont le siège social est situé 128 Rue du Progrès, 75010 Paris.
      </p>
      <h2 className="text-xl font-semibold text-slate-900">Direction de la publication</h2>
      <p>Le directeur de la publication est Maître Camille Dupont, notaire associée.</p>
      <h2 className="text-xl font-semibold text-slate-900">Hébergement</h2>
      <p>Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</p>
      <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
      <p>
        Pour toute question, vous pouvez nous contacter à l&apos;adresse contact@mynotary.fr ou par téléphone au +33 1 84 00 00 00.
      </p>
    </article>
  </Layout>
);

export default LegalPage;
