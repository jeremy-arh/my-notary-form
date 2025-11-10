import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import AddressAutocomplete from '../../components/AddressAutocomplete';

const NotariesList = () => {
  const navigate = useNavigate();
  const [notaries, setNotaries] = useState([]);
  const [filteredNotaries, setFilteredNotaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNotary, setSelectedNotary] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    timezone: '',
    license_number: '',
    bio: '',
    iban: '',
    bic: '',
    bank_name: '',
    is_active: true
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  useEffect(() => {
    fetchNotaries();
    fetchServices();
  }, []);

  useEffect(() => {
    filterNotaries();
  }, [notaries, searchTerm]);

  const fetchNotaries = async () => {
    try {
      console.log('🔍 Fetching notaries...');
      const { data, error } = await supabase
        .from('notary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notaries from database:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} notaries in database`);

      // Fetch user data from auth.users for notaries with user_id
      // Note: auth.admin methods require service role key
      const notariesWithUserData = await Promise.all(
        (data || []).map(async (notary) => {
          if (notary.user_id) {
            try {
              console.log(`🔍 Fetching user data for notary ${notary.id} (user_id: ${notary.user_id})`);
              const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notary.user_id);
              
              if (userError) {
                console.warn(`⚠️ Error fetching user data for notary ${notary.id}:`, userError);
                // Continue without user data if admin methods fail
                return {
                  ...notary,
                  account_created_at: null,
                  last_sign_in_at: null
                };
              }

              if (userData?.user) {
                console.log(`✅ User data found for notary ${notary.id}`);
                return {
                  ...notary,
                  account_created_at: userData.user.created_at,
                  last_sign_in_at: userData.user.last_sign_in_at
                };
              }
            } catch (err) {
              console.error(`❌ Exception fetching user data for notary ${notary.id}:`, err);
              // Continue without user data
            }
          }
          return {
            ...notary,
            account_created_at: null,
            last_sign_in_at: null
          };
        })
      );

      console.log(`✅ Processed ${notariesWithUserData.length} notaries`);
      setNotaries(notariesWithUserData);
    } catch (error) {
      console.error('❌ Error fetching notaries:', error);
      alert(`Error loading notaries: ${error.message}\n\nPlease check:\n1. Database connection\n2. RLS policies\n3. Service role key configuration`);
    } finally {
      setLoading(false);
    }
  };

  const filterNotaries = () => {
    let filtered = notaries;

    if (searchTerm) {
      filtered = filtered.filter(notary =>
        notary.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notary.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notary.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotaries(filtered);
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, service_id')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleAddressSelect = (addressData) => {
    setFormData({
      ...formData,
      address: addressData.address || formData.address,
      city: addressData.city || formData.city,
      postal_code: addressData.postal_code || formData.postal_code,
      country: addressData.country || formData.country,
      timezone: addressData.timezone || formData.timezone
    });
  };

  const handleCreateNotary = () => {
    setIsEditMode(false);
    setSelectedNotary(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: '',
      timezone: '',
      license_number: '',
      bio: '',
      iban: '',
      bic: '',
      bank_name: '',
      is_active: true
    });
    setSelectedServiceIds([]);
    setIsModalOpen(true);
  };

  const handleEditNotary = (notary) => {
    setSelectedNotary(notary);
    setIsEditMode(true);
    setFormData({
      full_name: notary.full_name || '',
      email: notary.email || '',
      phone: notary.phone || '',
      address: notary.address || '',
      city: notary.city || '',
      postal_code: notary.postal_code || '',
      country: notary.country || '',
      timezone: notary.timezone || '',
      license_number: notary.license_number || '',
      bio: notary.bio || '',
      iban: notary.iban || '',
      bic: notary.bic || '',
      bank_name: notary.bank_name || '',
      is_active: notary.is_active !== false
    });

    // Fetch notary services
    supabase
      .from('notary_services')
      .select('service_id')
      .eq('notary_id', notary.id)
      .then(({ data }) => {
        if (data) {
          setSelectedServiceIds(data.map(ns => ns.service_id));
        }
      });

    setIsModalOpen(true);
  };

  const handleSaveNotary = async () => {
    try {
      if (!formData.full_name || !formData.email) {
        alert('Please fill in all required fields');
        return;
      }

      let notaryId;

      if (isEditMode && selectedNotary) {
        // Update existing notary
        const { error } = await supabase
          .from('notary')
          .update({
            name: formData.full_name,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            country: formData.country,
            timezone: formData.timezone,
            license_number: formData.license_number,
            bio: formData.bio,
            iban: formData.iban,
            bic: formData.bic,
            bank_name: formData.bank_name,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNotary.id);

        if (error) throw error;
        notaryId = selectedNotary.id;
        alert('Notary updated successfully!');
      } else {
        // Create new notary
        const { data, error } = await supabase
          .from('notary')
          .insert({
            name: formData.full_name,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            country: formData.country,
            timezone: formData.timezone,
            license_number: formData.license_number,
            bio: formData.bio,
            iban: formData.iban,
            bic: formData.bic,
            bank_name: formData.bank_name,
            is_active: formData.is_active
          })
          .select()
          .single();

        if (error) throw error;
        notaryId = data.id;
        alert('Notary created successfully! You can now send an invitation.');
      }

      // Update notary services
      if (notaryId) {
        // Delete existing services
        const { error: deleteError } = await supabase
          .from('notary_services')
          .delete()
          .eq('notary_id', notaryId);

        if (deleteError) throw deleteError;

        // Insert new services
        if (selectedServiceIds.length > 0) {
          const notaryServices = selectedServiceIds.map(serviceId => ({
            notary_id: notaryId,
            service_id: serviceId
          }));

          const { error: insertError } = await supabase
            .from('notary_services')
            .insert(notaryServices);

          if (insertError) throw insertError;
        }
      }

      setIsModalOpen(false);
      await fetchNotaries();
    } catch (error) {
      console.error('Error saving notary:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSendInvitation = async (notary) => {
    try {
      console.log('📧 Sending invitation to notary:', notary.email);
      
      if (notary.user_id) {
        alert('This notary already has an account.');
        return;
      }

      // Check if service role key is available
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        throw new Error('Service Role Key not configured. Please add VITE_SUPABASE_SERVICE_ROLE_KEY to your environment variables in Cloudflare Pages.');
      }

      console.log('✅ Service role key found, proceeding with admin operations...');

      // Check for existing users
      console.log('🔍 Checking for existing users...');
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        throw new Error(`Could not check existing users: ${listError.message}`);
      }

      console.log(`✅ Found ${users?.length || 0} existing users`);

      const existingUser = users?.find(u => u.email === notary.email);
      
      if (existingUser) {
        console.log('✅ Existing user found, linking account...');
        const { error: updateError } = await supabase
          .from('notary')
          .update({ user_id: existingUser.id })
          .eq('id', notary.id);

        if (updateError) {
          console.error('❌ Error updating notary:', updateError);
          throw updateError;
        }
        
        console.log('✅ Account linked successfully');
        alert('Notary account linked successfully! The notary can reset their password from their dashboard if needed.');
        await fetchNotaries();
        return;
      }

      // Determine redirect URL based on environment
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const redirectTo = isProduction 
        ? `https://notary.mynotary.io/auth/set-password`
        : `${window.location.protocol}//${window.location.hostname}:5175/auth/set-password`;
      
      console.log('📧 Sending invitation email to:', notary.email);
      console.log('🔗 Redirect URL:', redirectTo);

      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        notary.email, 
        {
          redirectTo: redirectTo,
          data: {
            full_name: notary.full_name,
            role: 'notary'
          }
        }
      );

      if (inviteError) {
        console.error('❌ Invitation error:', inviteError);
        throw new Error(`Failed to send invitation: ${inviteError.message}\n\nPlease check:\n1. Email service is configured in Supabase\n2. Service role key is correct\n3. Email templates are set up`);
      }

      console.log('✅ Invitation sent successfully:', inviteData);

      if (inviteData?.user?.id) {
        console.log('🔗 Linking user_id to notary record...');
        const { error: updateError } = await supabase
          .from('notary')
          .update({ user_id: inviteData.user.id })
          .eq('id', notary.id);

        if (updateError) {
          console.error('❌ Error updating notary with user_id:', updateError);
          // Don't throw - invitation was sent, just the link failed
          alert(`Invitation sent successfully, but failed to link user_id: ${updateError.message}`);
        } else {
          console.log('✅ User_id linked successfully');
        }
      } else {
        console.warn('⚠️ No user ID in invitation response');
      }

      alert('Notary account created and invitation email sent successfully! The notary will receive an email to set their password.');
      await fetchNotaries();
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      alert(`Error: ${error.message}\n\nTroubleshooting:\n1. Check that VITE_SUPABASE_SERVICE_ROLE_KEY is set in Cloudflare Pages\n2. Verify email service is configured in Supabase\n3. Check Supabase logs for detailed error messages`);
    }
  };

  const handleDeleteNotary = async (notary) => {
    if (!window.confirm(`Are you sure you want to delete ${notary.full_name || notary.name}? This will remove their access and unassign their incomplete submissions.`)) {
      return;
    }

    try {
      const { data: submissions, error: submissionsError } = await supabase
        .from('submission')
        .select('id, status')
        .eq('assigned_notary_id', notary.id)
        .in('status', ['pending', 'confirmed']);

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
      }

      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map(s => s.id);
        const { error: updateError } = await supabase
          .from('submission')
          .update({
            status: 'pending',
            assigned_notary_id: null,
            updated_at: new Date().toISOString()
          })
          .in('id', submissionIds);

        if (updateError) {
          console.error('Error updating submissions:', updateError);
          throw new Error(`Failed to update submissions: ${updateError.message}`);
        }
      }

      if (notary.user_id) {
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(notary.user_id);
        if (deleteUserError) {
          console.error('Error deleting auth user:', deleteUserError);
        }
      }

      const { error: deleteError } = await supabase
        .from('notary')
        .delete()
        .eq('id', notary.id);

      if (deleteError) throw deleteError;

      alert(`Notary deleted successfully. ${submissions?.length || 0} submission(s) have been set back to pending.`);
      await fetchNotaries();
    } catch (error) {
      console.error('Error deleting notary:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notaries</h1>
          <p className="text-gray-600 mt-2">Manage notary accounts and assignments</p>
        </div>
        <button
          onClick={handleCreateNotary}
          className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center"
        >
          <Icon icon="heroicons:plus" className="w-5 h-5 mr-2" />
          Create Notary
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
        <div className="relative">
          <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
            placeholder="Search by name, email, or license number..."
          />
        </div>
      </div>

      {/* Notaries Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">License</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Account</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Account Created</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Last Login</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotaries.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-600">
                  No notaries found
                </td>
              </tr>
            ) : (
              filteredNotaries.map((notary) => (
                <tr key={notary.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    <button
                      onClick={() => navigate(`/notary/${notary.id}`)}
                      className="text-blue-600 hover:text-blue-900 hover:underline"
                    >
                      {notary.full_name || notary.name || 'N/A'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{notary.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{notary.license_number || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      notary.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {notary.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {notary.user_id ? (
                      <span className="text-xs text-green-600 font-semibold">✓ Account Created</span>
                    ) : (
                      <span className="text-xs text-orange-600 font-semibold">No Account</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(notary.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {notary.account_created_at ? formatDateTime(notary.account_created_at) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {notary.last_sign_in_at ? formatDateTime(notary.last_sign_in_at) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditNotary(notary)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Icon icon="heroicons:pencil" className="w-5 h-5" />
                      </button>
                      {!notary.user_id && (
                        <button
                          onClick={() => handleSendInvitation(notary)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Send Invitation"
                        >
                          <Icon icon="heroicons:envelope" className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotary(notary)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Icon icon="heroicons:trash" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Notary' : 'Create Notary'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Address *
                  </label>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(value) => setFormData({ ...formData, address: value })}
                    onAddressSelect={handleAddressSelect}
                    placeholder="Start typing an address..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                    placeholder="Auto-filled from address"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auto-filled from address</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                    placeholder="Auto-filled from address"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auto-filled from address</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                    placeholder="Auto-filled from address"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auto-filled from address</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Timezone *
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    disabled
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                    placeholder="Auto-filled from address (precise timezone)"
                  />
                  <p className="mt-1 text-xs text-gray-500">IANA timezone identifier - Auto-filled from Google Time Zone API (precise based on coordinates)</p>
                </div>
              </div>

              {/* Banking Information */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
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
                      onChange={(e) => setFormData({ ...formData, bic: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="ABCDEFGH"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Competent Services *
                </label>
                <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-white">
                  {availableServices.length === 0 ? (
                    <p className="text-sm text-gray-500">No services available</p>
                  ) : (
                    <div className="space-y-2">
                      {availableServices.map((service) => (
                        <label key={service.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={selectedServiceIds.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServiceIds([...selectedServiceIds, service.id]);
                              } else {
                                setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                              }
                            }}
                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                          />
                          <span className="text-sm font-medium text-gray-900">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Select the services this notary is competent in</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Internal notes about the notary (not visible to notary)"
                />
                <p className="mt-1 text-xs text-gray-500">Internal notes - not visible to the notary</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-semibold text-gray-900">
                  Active
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotary}
                className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                {isEditMode ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotariesList;

