/**
 * Utility function to send transactional emails via Supabase Edge Function
 * @param {Object} supabase - Supabase client instance
 * @param {Object} emailData - Email data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendTransactionalEmail = async (supabase, emailData) => {
  try {
    console.log('📧 [sendTransactionalEmail] Attempting to send email:', {
      email_type: emailData.email_type,
      recipient_email: emailData.recipient_email,
      recipient_type: emailData.recipient_type
    });

    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: emailData
    });

    if (error) {
      console.error('❌ [sendTransactionalEmail] Error from Supabase function:', error);
      console.error('❌ [sendTransactionalEmail] Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log('✅ [sendTransactionalEmail] Email function response:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ [sendTransactionalEmail] Exception caught:', error);
    console.error('❌ [sendTransactionalEmail] Error message:', error.message);
    console.error('❌ [sendTransactionalEmail] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

