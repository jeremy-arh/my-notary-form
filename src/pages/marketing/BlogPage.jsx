import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';
import BlogCard from '../../components/BlogCard';
import { blogPosts } from '../../data/blog';

const BlogPage = () => (
  <Layout>
    <SEO
      title="Blog notariale"
      description="Analyses notariales, conseils pratiques et retours d'expérience pour moderniser vos processus et sécuriser vos dossiers."
      keywords={['blog notaire', 'conseils notariaux', 'digitalisation notaire', 'signature électronique']}
    />
    <section className="space-y-12">
      <header className="rounded-4xl bg-white p-10 shadow-xl shadow-slate-200/60">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Le regard de nos notaires</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Ressources pour piloter vos dossiers avec sérénité</h1>
        <p className="mt-4 max-w-3xl text-sm text-slate-600">
          Transformations digitales, innovations réglementaires, bonnes pratiques opérationnelles : nous partageons notre vision
          pour vous aider à anticiper et à sécuriser vos projets.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {blogPosts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      <div className="rounded-4xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-10 text-white">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Newsletter My Notary</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Recevez nos analyses directement dans votre boîte mail</h2>
            <p className="mt-4 text-sm text-blue-100">
              Un condensé mensuel des évolutions réglementaires, de nos cas clients et de nos meilleures ressources pour garder
              une longueur d&apos;avance.
            </p>
          </div>
          <form className="flex flex-col gap-4 text-sm text-blue-100" aria-label="Inscription newsletter">
            <label className="flex flex-col gap-2" htmlFor="newsletter-email">
              Adresse email professionnelle
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="prenom@entreprise.fr"
                className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-900 shadow-lg shadow-blue-900/20 transition hover:-translate-y-1"
            >
              Je m&apos;inscris
            </button>
            <p className="text-xs text-blue-200">
              Nous n&apos;envoyons qu&apos;un email par mois. Désinscription possible en un clic.
            </p>
          </form>
        </div>
      </div>

      <div className="rounded-4xl border border-slate-100 bg-white p-8 text-sm text-slate-600">
        <h2 className="text-2xl font-semibold text-slate-900">Besoin d&apos;un accompagnement immédiat ?</h2>
        <p className="mt-3">
          Contactez notre équipe pour un audit flash de votre situation ou planifier un rendez-vous visio sous 24h.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Accéder au formulaire de contact
          </a>
          <Link
            to="/services"
            className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:text-blue-900"
          >
            Explorer nos services
          </Link>
        </div>
      </div>
    </section>
  </Layout>
);

export default BlogPage;
