import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Logo } from '../../../shared/assets';
import { supabase } from '../lib/supabase';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);

  const handleRetryPayment = async () => {
    setRetrying(true);
    setError(null);

    try {
      // Get form data from localStorage
      const savedFormData = localStorage.getItem('notaryFormData');

      if (!savedFormData) {
        setError('Form data not found. Please fill out the form again.');
        setRetrying(false);
        setTimeout(() => navigate('/form/documents'), 2000);
        return;
      }

      const formData = JSON.parse(savedFormData);

      // Calculate total amount
      let amount = 75; // Base fee
      if (formData.selectedOptions?.includes('urgent')) amount += 50;
      if (formData.selectedOptions?.includes('home-visit')) amount += 100;
      if (formData.selectedOptions?.includes('translation')) amount += 35;
      if (formData.selectedOptions?.includes('consultation')) amount += 150;
      if (formData.documents?.length) amount += formData.documents.length * 10;

      // Call Supabase Edge Function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          formData,
          amount: amount * 100 // Convert to cents
        }
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Retry payment error:', err);
      setError(err.message || 'Failed to create payment session. Please try again.');
      setRetrying(false);
    }
  };

  const handleBackToForm = () => {
    navigate('/form/summary');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@example.com?subject=Payment Issue';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center">
          <Logo width={150} height={150} />
        </div>

        {/* Failed Card */}
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 md:p-12">
          {/* Failed Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="heroicons:x-circle" className="w-12 h-12 text-red-600" />
          </div>

          {/* Failed Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 text-center">
            Payment Failed
          </h1>
          <p className="text-lg text-gray-700 mb-8 text-center">
            Unfortunately, your payment could not be processed. This could be due to insufficient funds,
            incorrect card details, or a temporary issue with your payment method.
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-white border-2 border-red-300 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <Icon icon="heroicons:exclamation-circle" className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-white rounded-2xl p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Icon icon="heroicons:information-circle" className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Common reasons for payment failure:</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <Icon icon="heroicons:minus" className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Insufficient funds in your account</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:minus" className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Incorrect card number or CVV</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:minus" className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Card expired or blocked</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:minus" className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Billing address mismatch</span>
                  </li>
                  <li className="flex items-start">
                    <Icon icon="heroicons:minus" className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Temporary bank or network issue</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              disabled={retrying}
              className="btn-glassy w-full px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {retrying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redirecting to payment...
                </>
              ) : (
                <>
                  <Icon icon="heroicons:arrow-path" className="w-5 h-5 mr-2" />
                  Retry Payment
                </>
              )}
            </button>

            <button
              onClick={handleBackToForm}
              disabled={retrying}
              className="btn-glassy-secondary w-full px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Icon icon="heroicons:arrow-left" className="w-5 h-5 mr-2" />
              Back to Summary
            </button>

            <button
              onClick={handleContactSupport}
              disabled={retrying}
              className="w-full px-8 py-3 text-gray-600 hover:text-gray-900 font-medium rounded-full transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon icon="heroicons:envelope" className="w-5 h-5 mr-2" />
              Contact Support
            </button>
          </div>

          {/* Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Your form data has been saved. You can retry the payment at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
