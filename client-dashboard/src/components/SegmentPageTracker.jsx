import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Composant pour tracker les pages vues Segment lors de la navigation
 * Segment track automatiquement la première page au chargement, mais pour les SPA
 * il faut tracker manuellement les changements de route
 */
export default function SegmentPageTracker() {
  const location = useLocation()
  const isFirstRender = useRef(true)
  const previousPathname = useRef(location.pathname)

  useEffect(() => {
    // Ignorer le premier rendu car le script initial track déjà la première page
    if (isFirstRender.current) {
      isFirstRender.current = false
      previousPathname.current = location.pathname
      return
    }

    // Ne tracker que si le pathname a changé (navigation réelle)
    if (previousPathname.current === location.pathname) {
      return
    }

    previousPathname.current = location.pathname

    // Attendre que Segment soit chargé
    const trackPageView = () => {
      if (typeof window === 'undefined' || !window.analytics) {
        // Si Segment n'est pas encore chargé, réessayer après un court délai
        setTimeout(trackPageView, 100)
        return
      }

      // Vérifier que analytics est initialisé
      if (!window.analytics.initialized) {
        // Attendre que Segment soit initialisé
        const checkInitialized = setInterval(() => {
          if (window.analytics && window.analytics.initialized) {
            clearInterval(checkInitialized)
            sendPageView()
          }
        }, 100)

        // Timeout après 5 secondes pour éviter une boucle infinie
        setTimeout(() => clearInterval(checkInitialized), 5000)
        return
      }

      sendPageView()
    }

    const sendPageView = () => {
      try {
        const fullPath = location.pathname + (location.search || '')
        const pageTitle = document.title || ''
        const canonical = document.querySelector("link[rel='canonical']")?.getAttribute('href')
        
        console.log('[Segment] 📊 Envoi pageview (navigation):', {
          path: fullPath,
          title: pageTitle,
          canonical
        })

        // Envoyer la page vue à Segment avec les métadonnées
        window.analytics.page({
          path: fullPath,
          url: typeof window !== 'undefined' ? window.location.href : fullPath,
          title: pageTitle,
          referrer: document.referrer || '',
          ...(canonical && { canonical })
        })

        console.log('[Segment] ✅ Pageview envoyé avec succès')
      } catch (error) {
        console.error('[Segment] ❌ Erreur lors de l\'envoi du pageview:', error)
      }
    }

    // Délai pour s'assurer que la navigation est complète
    const timer = setTimeout(trackPageView, 100)

    return () => clearTimeout(timer)
  }, [location.pathname, location.search])

  return null
}

