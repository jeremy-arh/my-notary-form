import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Logo } from '../../../shared/assets';
import { supabase } from '../lib/supabase';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);

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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-black mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-center">
            <Logo width={150} height={150} />
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="heroicons:x-mark" className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/form/summary')}
              className="btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
            >
              Back to Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center">
          <Logo width={150} height={150} />
        </div>

        {/* Success Card */}
        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <Icon icon="heroicons:check-circle" className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Thank you for your payment. Your notary request has been submitted successfully.
          </p>

          {/* Submission ID */}
          {submissionId && (
            <div className="bg-white rounded-xl p-4 mb-6 inline-block">
              <p className="text-sm text-gray-600 mb-1">Submission ID</p>
              <p className="text-lg font-bold text-gray-900 font-mono">{submissionId}</p>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-white rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Icon icon="heroicons:information-circle" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <Icon icon="heroicons:check" className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>You'll receive a confirmation email shortly</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:check" className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Our team will review your request within 24 hours</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:check" className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>We'll contact you to confirm your appointment details</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:check" className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Track your request status in your dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGoToDashboard}
            className="btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center mx-auto"
          >
            <Icon icon="heroicons:squares-2x2" className="w-5 h-5 mr-2" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
