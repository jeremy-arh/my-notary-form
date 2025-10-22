import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';

const Profile = () => {
  const [profile, setProfile] = useState({
    email: '',
    full_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    license_number: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('notary')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setProfile({
            email: user.email,
            full_name: data.full_name || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            postal_code: data.postal_code || '',
            country: data.country || '',
            license_number: data.license_number || '',
            bio: data.bio || ''
          });
        } else {
          setProfile({ ...profile, email: user.email });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Check if profile exists
      const { data: existing } = await supabase
        .from('notary')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing profile
        const { error } = await supabase
          .from('notary')
          .update({
            full_name: profile.full_name,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            postal_code: profile.postal_code,
            country: profile.country,
            license_number: profile.license_number,
            bio: profile.bio,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('notary')
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: profile.full_name,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            postal_code: profile.postal_code,
            country: profile.country,
            license_number: profile.license_number,
            bio: profile.bio
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your personal information</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center ${
            message.type === 'success' ? 'bg-gray-100 border border-gray-200' : 'bg-red-50 border border-red-200'
          }`}>
            <Icon
              icon={message.type === 'success' ? 'heroicons:check-circle' : 'heroicons:exclamation-circle'}
              className={`w-5 h-5 mr-2 ${message.type === 'success' ? 'text-gray-600' : 'text-red-600'}`}
            />
            <span className={`text-sm ${message.type === 'success' ? 'text-gray-900' : 'text-red-800'}`}>
              {message.text}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="bg-[#F3F4F6] rounded-2xl p-8 space-y-6">
          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full px-4 py-3 bg-gray-200 border-2 border-gray-300 rounded-xl text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="John Doe"
            />
          </div>

          {/* License Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              License Number
            </label>
            <input
              type="text"
              value={profile.license_number}
              onChange={(e) => handleChange('license_number', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="NP-12345"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Address
            </label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="123 Main Street"
            />
          </div>

          {/* City, Postal Code, Country */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                City
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={profile.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="10001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Country
              </label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="United States"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows="4"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all resize-none"
              placeholder="Tell us about yourself and your experience..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="btn-glassy w-full px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
        </form>
      </div>
    </AdminLayout>
  );
};

export default Profile;
