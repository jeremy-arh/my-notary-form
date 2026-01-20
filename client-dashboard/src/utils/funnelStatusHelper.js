/**
 * Helper functions for managing funnel_status
 * Ensures funnel_status never regresses - only moves forward
 */

/**
 * Get the numeric order of a funnel_status
 * Higher number = more advanced in the funnel
 */
const getFunnelStatusOrder = (status) => {
  if (!status) return 0;
  
  const orderMap = {
    'started': 1,
    'services_selected': 2,
    'documents_uploaded': 3,
    'delivery_method_selected': 4,
    'personal_info_completed': 5,
    'summary_viewed': 6,
    'payment_pending': 7,
    'payment_completed': 8,
    'submission_completed': 9,
  };
  
  return orderMap[status] || 0;
};

/**
 * Compare two funnel_status values
 * Returns true if newStatus is higher (more advanced) than currentStatus
 * @param {string} currentStatus - Current funnel_status
 * @param {string} newStatus - New funnel_status to compare
 * @returns {boolean} - True if newStatus is higher than currentStatus
 */
export const shouldUpdateFunnelStatus = (currentStatus, newStatus) => {
  if (!newStatus) return false; // Don't update if newStatus is null/undefined
  
  const currentOrder = getFunnelStatusOrder(currentStatus);
  const newOrder = getFunnelStatusOrder(newStatus);
  
  // Only update if new status is higher (more advanced)
  return newOrder > currentOrder;
};

/**
 * Get the higher of two funnel_status values
 * @param {string} status1 - First funnel_status
 * @param {string} status2 - Second funnel_status
 * @returns {string} - The higher (more advanced) status
 */
export const getHigherFunnelStatus = (status1, status2) => {
  const order1 = getFunnelStatusOrder(status1);
  const order2 = getFunnelStatusOrder(status2);
  
  return order2 > order1 ? status2 : status1;
};
