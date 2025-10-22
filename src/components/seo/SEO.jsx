import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const defaultTitle = 'My Notary – Étude notariale digitale et internationale';
const defaultDescription =
  "My Notary accompagne particuliers et entreprises dans leurs projets immobiliers, patrimoniaux et internationaux avec une équipe notariale experte.";

const ensureMeta = (name) => {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  return element;
};

const ensureCanonical = () => {
  let element = document.querySelector("link[rel='canonical']");
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  return element;
};

const SEO = ({ title, description = defaultDescription, keywords = [], structuredData }) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const computedTitle = title ? `${title} | My Notary` : defaultTitle;
    document.title = computedTitle;

    const metaDescription = ensureMeta('description');
    metaDescription.setAttribute('content', description);

    const metaKeywords = ensureMeta('keywords');
    if (keywords.length > 0) {
      metaKeywords.setAttribute('content', keywords.join(', '));
    } else {
      metaKeywords.setAttribute('content', 'notaire, notaire digital, légalisation, immobilier, patrimoine');
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mynotary.fr';
    const canonical = ensureCanonical();
    canonical.setAttribute('href', `${origin}${location.pathname}`);

    const existingStructuredData = document.getElementById('structured-data');
    if (existingStructuredData) {
      existingStructuredData.remove();
    }

    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'structured-data';
      script.innerHTML = JSON.stringify(structuredData);
      document.head.appendChild(script);

      return () => {
        script.remove();
      };
    }

    return undefined;
  }, [title, description, keywords, structuredData, location.pathname]);

  return null;
};

export default SEO;
