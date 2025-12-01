import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import ClientLayout from '../../components/ClientLayout';
import { useToast } from '../../contexts/ToastContext';

const Profile = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'invoices'
  const [clientInfo, setClientInfo] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClientInfo();
  }, []);

  const fetchClientInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: client, error } = await supabase
        .from('client')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (client) {
        setClientInfo(client);
        setFormData({
          firstName: client.first_name || '',
          lastName: client.last_name || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          postalCode: client.postal_code || '',
          country: client.country || ''
        });

        // Fetch invoices
        const { data: submissionsData } = await supabase
          .from('submission')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });

        // Filter submissions that have invoice URLs
        const paidInvoices = submissionsData?.filter(
          sub => sub.data?.payment?.invoice_url
        ) || [];
        setInvoices(paidInvoices);
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('client')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          country: formData.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientInfo.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      fetchClientInfo(); // Refresh data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </ClientLayout>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto overflow-x-hidden">
        {/* Tabs */}
        <div className="flex space-x-6 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'profile'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'invoices'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoices
            {activeTab === 'invoices' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-black focus:border-black ${
                  errors.firstName ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-black focus:border-black ${
                  errors.lastName ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-black focus:border-black ${
                errors.phone ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2">
              Street Address
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>

          {/* City, Postal Code, Country */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-gray-900 mb-2">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-900 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-gray-900 mb-2">
                Country
              </label>
              <input
                type="text"
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="heroicons:check" className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-4 sm:p-6 overflow-hidden">
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <Icon icon="heroicons:document-text" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No invoices available yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Date</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Amount</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Status</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-200 hover:bg-white transition-colors">
                        <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(invoice.data.payment.paid_at || invoice.created_at)}
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {(() => {
                            const amount = (invoice.data.payment.amount_paid || 0) / 100;
                            const currency = (invoice.data.payment.currency || 'usd').toUpperCase();
                            const locale = currency === 'USD' ? 'en-US' : 
                                         currency === 'GBP' ? 'en-GB' : 
                                         currency === 'CAD' ? 'en-CA' : 
                                         currency === 'AUD' ? 'en-AU' : 
                                         currency === 'CHF' ? 'de-CH' : 
                                         currency === 'JPY' ? 'ja-JP' : 
                                         currency === 'CNY' ? 'zh-CN' : 'fr-FR';
                            return new Intl.NumberFormat(locale, {
                              style: 'currency',
                              currency: currency === 'USD' ? 'USD' : 
                                       currency === 'GBP' ? 'GBP' : 
                                       currency === 'CAD' ? 'CAD' : 
                                       currency === 'AUD' ? 'AUD' : 
                                       currency === 'CHF' ? 'CHF' : 
                                       currency === 'JPY' ? 'JPY' : 
                                       currency === 'CNY' ? 'CNY' : 'EUR'
                            }).format(amount);
                          })()}
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4 whitespace-nowrap">
                          <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border bg-green-100 text-green-800 border-green-200">
                            {invoice.data.payment.payment_status === 'paid' ? 'Paid' : invoice.data.payment.payment_status}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4 whitespace-nowrap">
                          <a
                            href={invoice.data.payment.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black hover:text-gray-700 font-medium text-xs sm:text-sm flex items-center"
                          >
                            <Icon icon="heroicons:arrow-down-tray" className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Download</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default Profile;
