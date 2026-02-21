/**
 * Helper pour funnel_status - workflow identique à l'ancienne version.
 */

const FUNNEL_ORDER: Record<string, number> = {
  started: 1,
  services_selected: 2,
  documents_uploaded: 3,
  delivery_method_selected: 4,
  personal_info_completed: 5,
  summary_viewed: 6,
  payment_pending: 7,
  payment_completed: 8,
  submission_completed: 9,
};

export function shouldUpdateFunnelStatus(
  currentStatus: string | null,
  newStatus: string | null
): boolean {
  if (!newStatus) return false;
  const currentOrder = FUNNEL_ORDER[currentStatus ?? ""] ?? 0;
  const newOrder = FUNNEL_ORDER[newStatus] ?? 0;
  return newOrder > currentOrder;
}
