import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';

const PrivacyPage = () => (
  <Layout>
    <SEO title="Politique de confidentialité" description="Comprenez comment My Notary collecte et protège vos données personnelles." />
    <article className="mx-auto max-w-3xl space-y-6 text-sm text-slate-600">
      <h1 className="text-3xl font-semibold text-slate-900">Politique de confidentialité</h1>
      <p>
        My Notary s&apos;engage à protéger vos données personnelles conformément au Règlement Général sur la Protection des
        Données (RGPD). Cette politique décrit les informations que nous collectons, la manière dont nous les utilisons et vos
        droits.
      </p>
      <h2 className="text-xl font-semibold text-slate-900">Données collectées</h2>
      <p>
        Nous collectons vos informations d&apos;identification (nom, email, téléphone) ainsi que des données relatives à vos
        dossiers lorsque vous utilisez nos services ou contactez notre support.
      </p>
      <h2 className="text-xl font-semibold text-slate-900">Utilisation</h2>
      <p>
        Vos données nous permettent d&apos;assurer le suivi de vos demandes, de préparer vos actes notariés, d&apos;améliorer nos
        services et de vous informer des mises à jour importantes.
      </p>
      <h2 className="text-xl font-semibold text-slate-900">Droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition. Contactez notre DPO à
        privacy@mynotary.fr pour exercer vos droits.
      </p>
    </article>
  </Layout>
);

export default PrivacyPage;
