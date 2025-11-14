import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Logo from '../assets/Logo';
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

      // Call Supabase Edge Function to create Stripe checkout session
      // The Edge Function will fetch services from database and calculate the amount
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          formData
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

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-3 md:space-y-4">
        {/* Logo */}
        <div className="w-full flex items-center justify-center">
          <Logo width={80} height={80} className="md:w-[100px] md:h-[100px]" />
        </div>

        {/* Failed Icon with Animation */}
        <div className="w-full flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-50 to-rose-50 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
              <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-ping"></div>
              <Icon icon="heroicons:x-circle" className="w-10 h-10 md:w-12 md:h-12 text-red-600 relative z-10" />
            </div>
          </div>
        </div>

        {/* Failed Message */}
        <div className="w-full text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed px-2">
            Unfortunately, your payment could not be processed. This could be due to insufficient funds,
            incorrect card details, or a temporary issue with your payment method.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 md:p-4">
              <div className="flex items-start">
                <Icon icon="heroicons:exclamation-circle" className="w-5 h-5 md:w-6 md:h-6 text-red-600 mr-2 md:mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs md:text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="w-full">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 md:p-6 border border-amber-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl flex items-center justify-center mr-3">
                <Icon icon="heroicons:information-circle" className="w-6 h-6 md:w-7 md:h-7 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">Common reasons for payment failure:</h3>
                <ul className="space-y-1.5 md:space-y-2">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center mr-2 mt-0.5 border-2 border-amber-300">
                      <Icon icon="heroicons:minus" className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Insufficient funds in your account</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center mr-2 mt-0.5 border-2 border-amber-300">
                      <Icon icon="heroicons:minus" className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Incorrect card number or CVV</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center mr-2 mt-0.5 border-2 border-amber-300">
                      <Icon icon="heroicons:minus" className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Card expired or blocked</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center mr-2 mt-0.5 border-2 border-amber-300">
                      <Icon icon="heroicons:minus" className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Billing address mismatch</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center mr-2 mt-0.5 border-2 border-amber-300">
                      <Icon icon="heroicons:minus" className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-700">Temporary bank or network issue</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - In a row */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center">
            <button
              onClick={handleRetryPayment}
              disabled={retrying}
              className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-black text-white font-semibold rounded-xl transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:gap-3 shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              {retrying ? (
                <>
                  <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <Icon icon="heroicons:arrow-path" className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Retry Payment</span>
                </>
              )}
            </button>

            <button
              onClick={handleBackToForm}
              disabled={retrying}
              className="flex-1 px-6 md:px-8 py-3 md:py-4 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl transition-all hover:bg-gray-50 hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
            >
              <Icon icon="heroicons:arrow-left" className="w-4 h-4 md:w-5 md:h-5" />
              <span>Back to Summary</span>
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="w-full">
          <div className="flex items-start bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-200">
            <Icon icon="heroicons:information-circle" className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mr-2 md:mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-xs md:text-sm text-blue-800">
              <strong className="font-semibold">Note:</strong> Your form data has been saved. You can retry the payment at any time.
            </p>
          </div>
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

export default PaymentFailed;
