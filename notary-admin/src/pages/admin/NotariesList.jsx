import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';

const NotariesList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, ConfirmComponent } = useConfirm();
  const [notaries, setNotaries] = useState([]);
  const [filteredNotaries, setFilteredNotaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotaries();
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
      toast.error(`Error loading notaries: ${error.message}. Please check: Database connection, RLS policies, Service role key configuration`);
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


  const handleCreateNotary = () => {
    navigate('/notary/new');
  };

  const handleEditNotary = (notary) => {
    navigate(`/notary/edit/${notary.id}`);
  };


  const handleSendInvitation = async (notary) => {
    try {
      console.log('📧 Sending invitation to notary:', notary.email);
      
      if (notary.user_id) {
        toast.info('This notary already has an account.');
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
        toast.success('Notary account linked successfully! The notary can reset their password from their dashboard if needed.');
        await fetchNotaries();
        return;
      }

      // Determine redirect URL based on environment
      // Check for environment variable first, then fallback to hostname detection
      const notaryDashboardUrl = import.meta.env.VITE_NOTARY_DASHBOARD_URL;
      let redirectTo;
      
      if (notaryDashboardUrl) {
        // Use environment variable if set (recommended for production)
        redirectTo = `${notaryDashboardUrl}/auth/set-password`;
      } else {
        // Fallback to hostname detection
        const isProduction = window.location.hostname !== 'localhost' 
          && window.location.hostname !== '127.0.0.1'
          && !window.location.hostname.includes('localhost');
        
        if (isProduction) {
          // Production: use the actual domain (detected from current hostname or default)
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          // If admin dashboard is on admin.mynotary.io, notary should be on notary.mynotary.io
          const notaryHostname = hostname.replace('admin.', 'notary.');
          redirectTo = `${protocol}//${notaryHostname}/auth/set-password`;
        } else {
          // Development: use localhost with port
          redirectTo = `http://localhost:5175/auth/set-password`;
        }
      }
      
      console.log('📧 Sending invitation email to:', notary.email);
      console.log('🔗 Redirect URL:', redirectTo);
      console.log('🌐 Current hostname:', window.location.hostname);
      console.log('🔧 VITE_NOTARY_DASHBOARD_URL:', notaryDashboardUrl || 'Not set');

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
          toast.warning(`Invitation sent successfully, but failed to link user_id: ${updateError.message}`);
        } else {
          console.log('✅ User_id linked successfully');
        }
      } else {
        console.warn('⚠️ No user ID in invitation response');
      }

      toast.success('Notary account created and invitation email sent successfully! The notary will receive an email to set their password.');
      await fetchNotaries();
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      toast.error(`Error: ${error.message}. Troubleshooting: Check that VITE_SUPABASE_SERVICE_ROLE_KEY is set in Cloudflare Pages, Verify email service is configured in Supabase, Check Supabase logs for detailed error messages`);
    }
  };

  const handleDeleteNotary = async (notary) => {
    const confirmed = await confirm({
      title: 'Delete Notary',
      message: `Are you sure you want to delete ${notary.full_name || notary.name}? This will remove their access and unassign their incomplete submissions.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) {
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

      toast.success(`Notary deleted successfully. ${submissions?.length || 0} submission(s) have been set back to pending.`);
      await fetchNotaries();
    } catch (error) {
      console.error('Error deleting notary:', error);
      toast.error(`Error: ${error.message}`);
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
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
      <ConfirmComponent />
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

    </div>
  );
};

export default NotariesList;

