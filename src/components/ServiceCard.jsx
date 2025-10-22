import { Link } from 'react-router-dom';

const ServiceCard = ({ service }) => (
  <article className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
    <div>
      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600">{service.title}</h3>
      <p className="mt-3 text-sm text-slate-600">{service.excerpt}</p>
      <ul className="mt-5 space-y-2 text-sm text-slate-500">
        {service.primaryBenefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="mt-6">
      <Link
        to={`/services/${service.slug}`}
        className="inline-flex items-center text-sm font-semibold text-blue-700 transition hover:text-blue-900"
        aria-label={`Découvrir le service ${service.title}`}
      >
        Découvrir le service
        <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  </article>
);

export default ServiceCard;
