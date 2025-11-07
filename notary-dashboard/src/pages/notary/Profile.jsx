import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notaryInfo, setNotaryInfo] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    timezone: '',
    license_number: '',
    iban: '',
    bic: '',
    bank_name: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchNotaryInfo();
  }, []);

  const fetchNotaryInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: notary, error } = await supabase
        .from('notary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (notary) {
        setNotaryInfo(notary);
        setFormData({
          full_name: notary.full_name || '',
          phone: notary.phone || '',
          address: notary.address || '',
          city: notary.city || '',
          postal_code: notary.postal_code || '',
          country: notary.country || '',
          timezone: notary.timezone || '',
          license_number: notary.license_number || '',
          iban: notary.iban || '',
          bic: notary.bic || '',
          bank_name: notary.bank_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching notary info:', error);
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

    if (!formData.full_name?.trim()) newErrors.full_name = 'Full name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('notary')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          license_number: formData.license_number,
          iban: formData.iban,
          bic: formData.bic,
          bank_name: formData.bank_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', notaryInfo.id);

      if (error) throw error;

      alert('Profile updated successfully!');
      fetchNotaryInfo();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your notary profile information</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black ${
              errors.full_name ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
          <input
            type="email"
            value={notaryInfo?.email || ''}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500"
          />
          <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Address</label>
          <input
            type="text"
            value={formData.address}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            placeholder="Address (managed by admin)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Auto-filled from address"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-filled from address</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.postal_code}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Auto-filled from address"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-filled from address</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
            <input
              type="text"
              value={formData.country}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Auto-filled from address"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-filled from address</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Timezone</label>
          <input
            type="text"
            value={formData.timezone}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            placeholder="Auto-filled from address (precise timezone)"
          />
          <p className="mt-1 text-xs text-gray-500">IANA timezone identifier - Auto-filled from Google Time Zone API (precise based on coordinates)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">License Number</label>
          <input
            type="text"
            value={formData.license_number}
            onChange={(e) => handleChange('license_number', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
          />
        </div>

        {/* Banking Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => handleChange('iban', e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                BIC / SWIFT
              </label>
              <input
                type="text"
                value={formData.bic}
                onChange={(e) => handleChange('bic', e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                placeholder="ABCDEFGH"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Bank name"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-glassy px-6 py-3 text-white font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
    </div>
  );
};

export default Profile;

