import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-slate-100 bg-slate-50">
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 text-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <span className="text-lg font-bold">MN</span>
          </div>
          <div>
            <p className="text-base font-semibold">My Notary</p>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Étude notariale digitale</p>
          </div>
        </div>
        <p className="mt-4 max-w-md text-sm text-slate-600">
          Nous accompagnons dirigeants, expatriés et particuliers dans toutes leurs démarches notariales : transactions
          immobilières, légalisations internationales, ingénierie patrimoniale.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Navigation</h3>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>
            <Link to="/" className="transition hover:text-blue-600">
              Accueil
            </Link>
          </li>
          <li>
            <Link to="/services" className="transition hover:text-blue-600">
              Services
            </Link>
          </li>
          <li>
            <Link to="/blog" className="transition hover:text-blue-600">
              Blog
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Contact</h3>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>
            <a href="tel:+33184000000" className="transition hover:text-blue-600">
              +33 1 84 00 00 00
            </a>
          </li>
          <li>
            <a href="mailto:contact@mynotary.fr" className="transition hover:text-blue-600">
              contact@mynotary.fr
            </a>
          </li>
          <li>128 Rue du Progrès, 75010 Paris</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-slate-500 md:flex-row md:px-6">
        <p>© {new Date().getFullYear()} My Notary. Tous droits réservés.</p>
        <div className="flex gap-4">
          <Link to="/mentions-legales" className="transition hover:text-blue-600">
            Mentions légales
          </Link>
          <Link to="/politique-confidentialite" className="transition hover:text-blue-600">
            Politique de confidentialité
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
