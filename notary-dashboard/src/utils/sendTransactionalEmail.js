/**
 * Utility function to send transactional emails via Supabase Edge Function
 * @param {Object} supabase - Supabase client instance
 * @param {Object} emailData - Email data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendTransactionalEmail = async (supabase, emailData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: emailData
    });

    if (error) {
      console.error('Error sending transactional email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error calling transactional email function:', error);
    return { success: false, error: error.message };
  }
};

