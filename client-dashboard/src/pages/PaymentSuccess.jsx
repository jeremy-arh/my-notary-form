import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Logo from '../assets/Logo';
import { supabase } from '../lib/supabase';
import { trackPaymentSuccess } from '../utils/gtm';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
          setError('No payment session found');
          setLoading(false);
          return;
        }

        // Call Supabase Edge Function to verify payment
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        if (data.verified && data.submissionId) {
          setSubmissionId(data.submissionId);
          setInvoiceUrl(data.invoiceUrl);
          setUserEmail(data.userData?.email || data.email || null);
          
          // Track payment success in GTM (purchase event for Google Ads conversion)
          // Structured according to GTM Enhanced Conversions requirements
          trackPaymentSuccess({
            submissionId: data.submissionId,
            transactionId: data.transactionId || sessionId,
            amount: data.amount || 0,
            currency: data.currency || 'EUR',
            userData: data.userData || {},
            selectedServices: data.selectedServices || [],
            isFirstPurchase: data.isFirstPurchase !== undefined ? data.isFirstPurchase : true,
            servicesCount: data.servicesCount || 0,
          });
        } else {
          setError('Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setError(err.message || 'Failed to verify payment');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleGoToDashboard = () => {
    // Clear localStorage
    localStorage.removeItem('notaryFormData');
    localStorage.removeItem('notaryCompletedSteps');
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mb-4"></div>
          <p className="text-gray-600 font-medium mt-4">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <div className="mb-6 flex items-center justify-center">
            <Logo width={100} height={100} />
          </div>
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="heroicons:x-mark" className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/form/summary')}
            className="px-6 py-3 bg-black text-white font-semibold rounded-xl transition-all hover:bg-gray-800 active:scale-95"
          >
            Back to Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-3 md:space-y-4">
        {/* Logo */}
        <div className="w-full flex items-center justify-center">
          <Logo width={80} height={80} className="md:w-[100px] md:h-[100px]" />
        </div>

        {/* Success Icon with Animation */}
        <div className="w-full flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
              <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping"></div>
              <Icon icon="heroicons:check-circle" className="w-10 h-10 md:w-12 md:h-12 text-green-600 relative z-10" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="w-full text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed px-2">
            Thank you for your payment. Your notary request has been submitted successfully.
          </p>
        </div>

        {/* Submission ID */}
        {submissionId && (
          <div className="w-full">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Submission ID</p>
                  <p className="text-base md:text-lg font-bold text-gray-900 font-mono">{submissionId.substring(0, 8)}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Icon icon="heroicons:document-duplicate" className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Download */}
        {invoiceUrl && (
          <div className="w-full">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 md:p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon icon="heroicons:document-arrow-down" className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-700 mb-0.5">Invoice Available</p>
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Download Invoice →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="w-full">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 md:p-6 border border-gray-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                <Icon icon="heroicons:information-circle" className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">What happens next?</h3>
                <ul className="space-y-1.5 md:space-y-2">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <Icon icon="heroicons:check" className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">
                      You'll receive a confirmation email{userEmail ? ` at ${userEmail}` : ''}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <Icon icon="heroicons:check" className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">A certified notary will be assigned within 24 hours</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <Icon icon="heroicons:check" className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Your video link and all appointment details will be available in your dashboard</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <Icon icon="heroicons:check" className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Track your request status in real-time until completion</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full">
          <button
            onClick={handleGoToDashboard}
            className="w-full px-6 md:px-8 py-3 md:py-4 bg-black text-white font-semibold rounded-xl transition-all hover:bg-gray-800 active:scale-95 flex items-center justify-center gap-2 md:gap-3 shadow-lg hover:shadow-xl text-sm md:text-base"
          >
            <Icon icon="heroicons:squares-2x2" className="w-4 h-4 md:w-5 md:h-5" />
            <span>Go to Dashboard</span>
            <Icon icon="heroicons:arrow-right" className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="text-center pt-1">
          <p className="text-xs md:text-sm text-gray-500">
            Need help? <a href="mailto:support@mynotary.io" className="text-gray-900 font-medium hover:underline">Contact our support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;


