import { useState } from 'react';
import { Icon } from '@iconify/react';

const Summary = ({ formData, prevStep, handleSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notaryOptions = {
    'real-estate': 'Real Estate Transaction',
    'will': 'Last Will & Testament',
    'power-of-attorney': 'Power of Attorney',
    'marriage-contract': 'Marriage Contract',
    'succession': 'Succession & Estate',
    'authentication': 'Document Authentication',
    'affidavit': 'Affidavit',
    'incorporation': 'Business Incorporation',
    'urgent': 'Urgent Service (48h)',
    'home-visit': 'Home Visit',
    'translation': 'Translation Service',
    'consultation': 'Legal Consultation'
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not selected';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'Not selected';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review Your Information
        </h2>
        <p className="text-gray-600">
          Please review all details before submitting
        </p>
      </div>

      {/* Documents */}
      {formData.documents && formData.documents.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Icon icon="heroicons:document-text" className="w-5 h-5 text-blue-600" />
            </div>
            Documents ({formData.documents.length})
          </h3>
          <div className="space-y-2">
            {formData.documents.map((doc, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-xl">
                <Icon icon="heroicons:document" className="w-8 h-8 mr-3 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Services */}
      {formData.selectedOptions && formData.selectedOptions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <Icon icon="heroicons:check-badge" className="w-5 h-5 text-purple-600" />
            </div>
            Selected Services
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {formData.selectedOptions.map((optionId) => (
              <div key={optionId} className="flex items-center p-3 bg-gray-50 rounded-xl">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center mr-3">
                  <Icon icon="heroicons:check" className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-900">{notaryOptions[optionId]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Details */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <Icon icon="heroicons:calendar-days" className="w-5 h-5 text-green-600" />
          </div>
          Appointment Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Date</span>
            <span className="text-sm text-gray-900">{formatDate(formData.appointmentDate)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Time</span>
            <span className="text-sm text-gray-900">{formatTime(formData.appointmentTime)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Timezone</span>
            <span className="text-sm text-gray-900">{formData.timezone || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
            <Icon icon="heroicons:user" className="w-5 h-5 text-amber-600" />
          </div>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Full Name</p>
            <p className="text-sm font-medium text-gray-900">
              {formData.firstName} {formData.lastName}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{formData.email}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Phone</p>
            <p className="text-sm font-medium text-gray-900">{formData.phone}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Country</p>
            <p className="text-sm font-medium text-gray-900">{formData.country}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl md:col-span-2">
            <p className="text-xs text-gray-600 mb-1">Address</p>
            <p className="text-sm font-medium text-gray-900">
              {formData.address}, {formData.city}, {formData.postalCode}
            </p>
          </div>
          {formData.notes && (
            <div className="p-3 bg-gray-50 rounded-xl md:col-span-2">
              <p className="text-xs text-gray-600 mb-1">Additional Notes</p>
              <p className="text-sm text-gray-900">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Notice */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Icon icon="heroicons:information-circle" className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="ml-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              What happens next?
            </h4>
            <p className="text-sm text-blue-800">
              After submitting, you'll receive a confirmation email at <strong>{formData.email}</strong>.
              Our team will review your request and contact you within 24 hours to confirm your appointment.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={prevStep}
          disabled={isSubmitting}
          className="btn-glassy-secondary px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            <>
              <Icon icon="heroicons:paper-airplane" className="w-5 h-5 mr-2" />
              Submit Request
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Summary;
