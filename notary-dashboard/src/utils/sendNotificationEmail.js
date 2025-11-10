/**
 * Utility function to send notification email via Supabase Edge Function
 * @param {Object} supabase - Supabase client instance
 * @param {string} notificationId - ID of the notification to send email for
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendNotificationEmail = async (supabase, notificationId) => {
  if (!notificationId) {
    console.error('Notification ID is required');
    return { success: false, error: 'Notification ID is required' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: { notification_id: notificationId }
    });

    if (error) {
      console.error('Error sending notification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error calling email function:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create notification and send email
 * @param {Object} supabase - Supabase client instance
 * @param {Object} notificationData - Notification data
 * @param {boolean} sendEmail - Whether to send email (default: true, skipped for admin)
 * @returns {Promise<{notificationId: string, emailSent: boolean}>}
 */
export const createNotificationWithEmail = async (supabase, notificationData, sendEmail = true) => {
  const { user_type, ...rest } = notificationData;
  
  // Skip email for admin users
  const shouldSendEmail = sendEmail && user_type !== 'admin';

  try {
    // Create notification
    const { data: notificationId, error: notificationError } = await supabase.rpc('create_notification', {
      ...rest,
      p_user_type: user_type,
      p_send_email: false // We'll send email separately
    });

    if (notificationError) {
      throw notificationError;
    }

    let emailSent = false;
    
    // Send email if requested
    if (shouldSendEmail && notificationId) {
      const emailResult = await sendNotificationEmail(supabase, notificationId);
      emailSent = emailResult.success;
      
      if (!emailSent) {
        console.warn('Notification created but email sending failed:', emailResult.error);
      }
    }

    return { notificationId, emailSent };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

