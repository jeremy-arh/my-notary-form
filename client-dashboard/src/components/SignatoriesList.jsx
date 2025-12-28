import { Icon } from '@iconify/react';
import { useCurrency } from '../contexts/CurrencyContext';

const SignatoriesList = ({ signatories, documentKey, documentName }) => {
  const { formatPriceSync } = useCurrency();
  if (!signatories || signatories.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
        <Icon icon="heroicons:document" className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-gray-600 flex-shrink-0" />
        <span className="truncate">{documentName || `Document ${documentKey}`}</span>
      </h4>
      <div className="space-y-2 sm:space-y-3">
        {signatories.map((signatory, sigIndex) => (
          <div key={sigIndex} className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-900">
                Signatory {sigIndex + 1}
                {sigIndex === 0 && <span className="ml-1.5 text-[9px] sm:text-[10px] text-gray-500">(included)</span>}
                {sigIndex > 0 && <span className="ml-1.5 text-[9px] sm:text-[10px] text-orange-600 font-medium">(+{formatPriceSync(10)})</span>}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-1.5 font-medium text-gray-900">
                  {signatory.first_name || signatory.firstName} {signatory.last_name || signatory.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date of Birth:</span>
                <span className="ml-1.5 font-medium text-gray-900">
                  {signatory.birth_date || signatory.birthDate}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Birth City:</span>
                <span className="ml-1.5 font-medium text-gray-900">
                  {signatory.birth_city || signatory.birthCity}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-600">Address:</span>
                <span className="ml-1.5 font-medium text-gray-900 break-words">
                  {signatory.postal_address || signatory.postalAddress}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-1.5 font-medium text-gray-900 break-words">
                  {signatory.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <span className="ml-1.5 font-medium text-gray-900 break-words">
                  {signatory.phone || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignatoriesList;

