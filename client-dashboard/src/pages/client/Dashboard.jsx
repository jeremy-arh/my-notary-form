import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ClientLayout from '../../components/ClientLayout';
import { supabase } from '../../lib/supabase';

const Dashboard = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClientInfo(client);

      // Get submissions
      console.log('🔍 [NOTARY] Fetching submissions for client:', client.id);
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submission')
        .select(`
          *,
          notary!assigned_notary_id(id, name, email)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      console.log('📋 [NOTARY] Submissions data:', submissionsData);
      console.log('❌ [NOTARY] Submissions error:', submissionsError);

      if (submissionsData && submissionsData.length > 0) {
        submissionsData.forEach((sub, idx) => {
          console.log(`📝 [NOTARY] Submission ${idx + 1}:`, {
            id: sub.id,
            assigned_notary_id: sub.assigned_notary_id,
            notary_object: sub.notary,
            notary_name: sub.notary?.name
          });
        });
      }

      if (submissionsError) throw submissionsError;

      setSubmissions(submissionsData || []);

      // Calculate stats
      const total = submissionsData?.length || 0;
      const pending = submissionsData?.filter(s => s.status === 'pending').length || 0;
      const accepted = submissionsData?.filter(s => s.status === 'accepted').length || 0;
      const rejected = submissionsData?.filter(s => s.status === 'rejected').length || 0;

      setStats({ total, pending, accepted, rejected });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {clientInfo?.first_name}!
          </h1>
          <p className="text-gray-600">Manage your notary service requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:document-text" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Requests</p>
          </div>

          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:clock" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>

          <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:check-circle" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
            <p className="text-sm text-gray-600">Accepted</p>
          </div>

          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <Icon icon="heroicons:x-circle" className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            <p className="text-sm text-gray-600">Rejected</p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Requests</h2>
            <a
              href="http://localhost:5173"
              className="btn-glassy px-6 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
            >
              <Icon icon="heroicons:plus" className="w-4 h-4 inline mr-1" />
              New Request
            </a>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="heroicons:document-text" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No requests yet</p>
              <a
                href="http://localhost:5173"
                className="inline-block btn-glassy px-6 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
              >
                Submit Your First Request
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Appointment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Notary</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-gray-200 hover:bg-white transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {formatDate(submission.created_at)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {formatDate(submission.appointment_date)} at {submission.appointment_time}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {submission.notary?.name || 'Not assigned yet'}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => navigate(`/submission/${submission.id}`)}
                          className="text-black hover:text-gray-700 font-medium text-sm flex items-center"
                        >
                          View Details
                          <Icon icon="heroicons:arrow-right" className="w-4 h-4 ml-1" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};

export default Dashboard;
