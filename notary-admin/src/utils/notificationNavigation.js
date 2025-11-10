/**
 * Utility function to handle notification navigation based on action_type and user_type
 * @param {Object} notification - The notification object
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onClose - Callback to close notification panel (optional)
 */
export const handleNotificationNavigation = (notification, navigate, onClose) => {
  if (!notification.action_data && !notification.action_type) {
    // No navigation data, just close if callback provided
    if (onClose) onClose();
    return;
  }

  try {
    const actionData = typeof notification.action_data === 'string' 
      ? JSON.parse(notification.action_data) 
      : notification.action_data || {};
    
    const actionType = notification.action_type;
    const userType = notification.user_type;

    // Handle navigation based on action_type
    switch (actionType) {
      case 'notarized_file_uploaded':
        // Redirect to submission detail with notarized tab
        if (actionData.submission_id) {
          navigate(`/submission/${actionData.submission_id}?tab=notarized`);
          if (onClose) onClose();
        }
        break;

      case 'status_changed':
      case 'submission_modified':
      case 'appointment_updated':
        // Redirect to submission detail
        if (actionData.submission_id) {
          navigate(`/submission/${actionData.submission_id}`);
          if (onClose) onClose();
        }
        break;

      case 'payout_created':
        // For admin, redirect to submission detail or payouts list
        if (actionData.submission_id) {
          navigate(`/submission/${actionData.submission_id}`);
          if (onClose) onClose();
        } else {
          navigate('/submissions');
          if (onClose) onClose();
        }
        break;

      case 'message_received':
      case 'new_message':
        // Redirect to messages page
        navigate('/messages');
        if (onClose) onClose();
        break;

      case 'notary_assigned':
      case 'notary_created':
        // Redirect to notary detail or submissions
        if (actionData.notary_id) {
          navigate(`/notary/${actionData.notary_id}`);
          if (onClose) onClose();
        } else if (actionData.submission_id) {
          navigate(`/submission/${actionData.submission_id}`);
          if (onClose) onClose();
        } else {
          navigate('/notary');
          if (onClose) onClose();
        }
        break;

      default:
        // Fallback: if submission_id exists, go to submission detail
        if (actionData.submission_id) {
          navigate(`/submission/${actionData.submission_id}`);
          if (onClose) onClose();
        } else if (actionData.notary_id) {
          // Redirect to notary detail
          navigate(`/notary/${actionData.notary_id}`);
          if (onClose) onClose();
        } else {
          // Default to dashboard
          navigate('/dashboard');
          if (onClose) onClose();
        }
    }
  } catch (e) {
    console.error('Error parsing notification action_data:', e);
    // Fallback to dashboard on error
    navigate('/dashboard');
    if (onClose) onClose();
  }
};

