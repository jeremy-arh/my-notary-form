import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navLinkClasses = ({ isActive }) =>
  `relative px-3 py-2 text-sm font-semibold tracking-wide transition-colors duration-200 ${
    isActive ? 'text-blue-600 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:bg-blue-600' : 'text-slate-600 hover:text-blue-600'
  }`;

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Accueil My Notary">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <span className="text-lg font-bold">MN</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-wide text-slate-900">My Notary</span>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-blue-600">Étude notariale digitale</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={toggleMenu}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 md:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          <span className="sr-only">Ouvrir le menu</span>
          <svg
            className="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          <NavLink to="/" className={navLinkClasses} onClick={closeMenu} end>
            Accueil
          </NavLink>
          <NavLink to="/services" className={navLinkClasses} onClick={closeMenu}>
            Services
          </NavLink>
          <NavLink to="/blog" className={navLinkClasses} onClick={closeMenu}>
            Blog
          </NavLink>
          <a href="#contact" className="rounded-full border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50">
            Prendre rendez-vous
          </a>
        </nav>
      </div>

      {isOpen ? (
        <div id="mobile-menu" className="border-t border-slate-100 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-4" aria-label="Navigation mobile">
            <NavLink to="/" className={navLinkClasses} onClick={closeMenu} end>
              Accueil
            </NavLink>
            <NavLink to="/services" className={navLinkClasses} onClick={closeMenu}>
              Services
            </NavLink>
            <NavLink to="/blog" className={navLinkClasses} onClick={closeMenu}>
              Blog
            </NavLink>
            <a
              href="#contact"
              onClick={closeMenu}
              className="mt-2 rounded-full border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50"
            >
              Prendre rendez-vous
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
};

export default Header;
