import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import SEO from '../../components/seo/SEO';
import { getPostBySlug } from '../../data/blog';

const formatDate = (date) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));

const BlogPostPage = () => {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <Layout>
        <SEO title="Article introuvable" description="Le contenu recherché n'est plus disponible." />
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Article introuvable</h1>
          <p className="text-sm text-slate-600">L'article demandé n'existe plus ou a été déplacé.</p>
          <Link to="/blog" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            Retourner au blog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={post.title} description={post.excerpt} keywords={post.keywords} />
      <article className="mx-auto max-w-3xl space-y-12">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Insights My Notary</p>
          <h1 className="text-3xl font-semibold text-slate-900">{post.title}</h1>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500">
            <span>{formatDate(post.publishedAt)}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
            <span>{post.readingTime} de lecture</span>
          </div>
        </header>

        <section className="space-y-8 text-sm text-slate-700">
          {post.content.map((block) => (
            <div key={block.heading} className="space-y-3">
              <h2 className="text-2xl font-semibold text-slate-900">{block.heading}</h2>
              <p className="leading-relaxed">{block.body}</p>
            </div>
          ))}
        </section>

        <aside className="rounded-4xl border border-slate-100 bg-slate-50 p-8 text-sm text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">Aller plus loin avec My Notary</h2>
          <p className="mt-3">
            Nos notaires vous accompagnent sur la mise en œuvre opérationnelle : cadrage juridique, conduite du changement,
            déploiement des outils digitaux.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Planifier un rendez-vous
            </a>
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-600 hover:text-blue-900"
            >
              Découvrir nos services
            </Link>
          </div>
        </aside>
      </article>
    </Layout>
  );
};

export default BlogPostPage;
