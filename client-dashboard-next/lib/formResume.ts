import type { FormData } from "./formData";

const FORM_STEP_PATHS = [
  "/form/personal-info",
  "/form/choose-services",
  "/form/documents",
  "/form/delivery",
  "/form/summary",
] as const;

/**
 * Détermine la dernière étape complétée à partir des données du formulaire.
 * Retourne l'index (0-4) de l'étape vers laquelle rediriger au retour.
 */
export function getResumeStepIndex(formData: FormData): number {
  // Étape 1 : informations personnelles
  if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim()) {
    return 0; // personal-info
  }
  // Étape 2 : choix des services
  if (!formData.selectedServices?.length) {
    return 1; // choose-services
  }
  // Étape 3 : documents uploadés
  const totalDocs = (formData.selectedServices ?? []).reduce((acc, sid) => {
    const docs = formData.serviceDocuments?.[sid] as unknown[] | undefined;
    return acc + (docs?.length ?? 0);
  }, 0);
  if (totalDocs === 0) {
    return 2; // documents
  }
  // Étape 4 : méthode de livraison
  if (!formData.deliveryMethod) {
    return 3; // delivery
  }
  // Étape 5 : résumé
  return 4; // summary
}

/**
 * Retourne le path de l'étape de reprise.
 */
export function getResumePath(formData: FormData): string {
  const index = getResumeStepIndex(formData);
  return FORM_STEP_PATHS[index];
}
