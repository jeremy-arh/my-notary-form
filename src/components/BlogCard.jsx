import { Link } from 'react-router-dom';

const formatDate = (date) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));

const BlogCard = ({ post }) => (
  <article className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{formatDate(post.publishedAt)}</p>
      <h3 className="mt-3 text-lg font-semibold text-slate-900 group-hover:text-blue-600">{post.title}</h3>
      <p className="mt-3 text-sm text-slate-600">{post.excerpt}</p>
    </div>
    <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
      <span>{post.readingTime} de lecture</span>
      <Link to={`/blog/${post.slug}`} className="inline-flex items-center font-semibold text-blue-700 transition hover:text-blue-900">
        Lire l'article
        <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  </article>
);

export default BlogCard;
