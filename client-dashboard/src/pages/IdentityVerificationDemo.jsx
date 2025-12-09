import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import Logo from '../assets/Logo'

const stepsFlow = [
  { id: 'consent', label: 'Introduction & consentement' },
  { id: 'doc-choice', label: 'Choix du document' },
  { id: 'front', label: 'Capture recto' },
  { id: 'back', label: 'Capture verso' },
  { id: 'selfie', label: 'Selfie & liveness' },
  { id: 'auto-check', label: 'Vérification automatique' },
  { id: 'final', label: 'Validation finale' },
]

const IdentityVerificationDemo = () => {
  const [documentType, setDocumentType] = useState('Passeport')
  const [documentNumber, setDocumentNumber] = useState('FR88-JD-2030')
  const [status, setStatus] = useState('idle') // idle | checking | validated
  const [consentGiven, setConsentGiven] = useState(true)
  const [steps, setSteps] = useState(() =>
    stepsFlow.map((step) => ({ ...step, status: 'pending' })),
  )
  const [notifications, setNotifications] = useState([])
  const timersRef = useRef([])

  useEffect(() => {
    document.title = 'Démo vérification identité'
  }, [])

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  const pushNotification = (message) => {
    setNotifications((prev) => {
      const next = [{ id: Date.now() + Math.random(), message }, ...prev]
      return next.slice(0, 4)
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!consentGiven) return
    setStatus('checking')
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    setSteps(stepsFlow.map((step) => ({ ...step, status: 'pending' })))
    pushNotification('Vérification lancée')

    let delay = 200
    stepsFlow.forEach((step, index) => {
      const startAt = delay
      const endAt = delay + 650

      timersRef.current.push(
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((item) => (item.id === step.id ? { ...item, status: 'running' } : item)),
          )
        }, startAt),
      )

      timersRef.current.push(
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((item) => (item.id === step.id ? { ...item, status: 'done' } : item)),
          )
          pushNotification(`${step.label} validée`)
          if (index === stepsFlow.length - 1) {
            setStatus('validated')
          }
        }, endAt),
      )

      delay = endAt + 120
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-gray-900">
      {/* Notifications empilées */}
      <div className="fixed top-4 right-4 z-20 space-y-2 w-72">
        {notifications.map((note) => (
          <div
            key={note.id}
            className="rounded-xl border border-gray-200 bg-white shadow-md px-4 py-3 text-sm text-gray-800 flex items-start gap-2"
          >
            <Icon icon="solar:check-circle-bold-duotone" className="h-5 w-5 text-emerald-500 mt-0.5" />
            <span>{note.message}</span>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Vérification d&apos;identité
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1">
              Simulation sécurisée
            </h1>
            <p className="text-sm text-gray-600">
              Parcours standard : consentement, document, captures recto/verso, selfie, vérification.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <Logo width={34} height={34} />
            <div>
              <p className="text-xs text-gray-500 leading-tight">Profil utilisé</p>
              <p className="text-sm font-semibold">John Doe</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Document officiel</h2>
                <p className="text-sm text-gray-600">
                  Choisissez un document et saisissez un numéro pour lancer la vérification.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-0"
                />
                <label htmlFor="consent" className="text-sm text-gray-700 leading-tight">
                  Introduction & consentement : j’accepte que ce contrôle vérifie mon document et mon selfie pour cette session.
                </label>
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-semibold text-gray-800">Type de document</label>
                <div className="mt-2 relative">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-black transition"
                  >
                    <option>Passeport</option>
                    <option>Carte d&apos;identité</option>
                    <option>Permis de conduire</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-semibold text-gray-800">Numéro d&apos;identification</label>
                <div className="mt-2 relative">
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-black transition"
                    placeholder="Ex: FR88-JD-2030"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon icon="solar:shield-check-bold-duotone" className="h-5 w-5 text-emerald-500" />
                  <span>Traitement géré localement pour ce parcours.</span>
                </div>
                <button
                  type="submit"
                  className="btn-glassy text-white px-5 py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
                  disabled={status === 'checking' || !consentGiven}
                >
                  {status === 'checking' ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:play-circle-bold-duotone" className="h-5 w-5" />
                      Lancer la vérification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Résultat</h3>
                <p className="text-sm text-gray-600">Parcours multi-étapes avec notifications d’étape.</p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  status === 'validated'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : status === 'checking'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {status === 'validated' ? 'Validé' : status === 'checking' ? 'En cours' : 'En attente'}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Titulaire</p>
                <p className="text-sm font-semibold text-gray-900">John Doe</p>
                <p className="text-xs text-gray-500">john@doe.com</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Document</p>
                <p className="text-sm font-semibold text-gray-900">{documentType}</p>
                <p className="text-xs text-gray-500">{documentNumber || '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                <Icon
                  icon={status === 'validated' ? 'solar:check-circle-bold-duotone' : 'solar:clock-linear'}
                  className={`h-5 w-5 ${status === 'validated' ? 'text-emerald-500' : 'text-gray-500'}`}
                />
              </div>
              <div className="text-sm text-gray-700">
                {status === 'validated' ? (
                  <>
                    <p className="font-semibold text-emerald-700">Vérification réussie</p>
                    <p>Document confirmé, étapes complétées pour la capture.</p>
                  </>
                ) : status === 'checking' ? (
                  <>
                    <p className="font-semibold text-amber-700">Contrôle en cours</p>
                    <p>Lecture du document et validation du numéro simulées.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-800">Prêt à vérifier</p>
                    <p>Choisissez un document et lancez la vérification.</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div
                    className={`h-9 w-9 rounded-full border flex items-center justify-center ${
                      step.status === 'done'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : step.status === 'running'
                          ? 'border-amber-200 bg-amber-50 text-amber-600'
                          : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    <Icon
                      icon={
                        step.status === 'done'
                          ? 'solar:check-circle-bold-duotone'
                          : step.status === 'running'
                            ? 'solar:clock-linear'
                            : 'solar:document-linear'
                      }
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{step.label}</p>
                    <p className="text-xs text-gray-500">
                      {step.status === 'done'
                        ? 'Étape validée'
                        : step.status === 'running'
                          ? 'Étape en cours'
                          : 'En attente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IdentityVerificationDemo

