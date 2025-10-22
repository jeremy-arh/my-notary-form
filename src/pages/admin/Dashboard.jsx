import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingSubmissions: 0,
    acceptedSubmissions: 0,
    rejectedSubmissions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all submissions
      const { data: submissions, error } = await supabase
        .from('submission')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (submissions) {
        // Calculate stats
        const pending = submissions.filter(s => s.status === 'pending').length;
        const accepted = submissions.filter(s => s.status === 'accepted').length;
        const rejected = submissions.filter(s => s.status === 'rejected').length;

        // Calculate revenue (simple calculation based on base fee)
        const totalRev = accepted * 75; // Base fee

        // Calculate monthly revenue
        const currentMonth = new Date().getMonth();
        const monthlyRev = submissions
          .filter(s => {
            const submissionMonth = new Date(s.created_at).getMonth();
            return submissionMonth === currentMonth && s.status === 'accepted';
          })
          .length * 75;

        setStats({
          totalSubmissions: submissions.length,
          pendingSubmissions: pending,
          acceptedSubmissions: accepted,
          rejectedSubmissions: rejected,
          totalRevenue: totalRev,
          monthlyRevenue: monthlyRev
        });

        setRecentSubmissions(submissions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: 'heroicons:document-text',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Pending',
      value: stats.pendingSubmissions,
      icon: 'heroicons:clock',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Accepted',
      value: stats.acceptedSubmissions,
      icon: 'heroicons:check-circle',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Rejected',
      value: stats.rejectedSubmissions,
      icon: 'heroicons:x-circle',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    }
  ];

  const revenueCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: 'heroicons:currency-dollar',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: 'heroicons:chart-bar',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-200 text-gray-700',
      accepted: 'bg-gray-200 text-gray-700',
      rejected: 'bg-gray-200 text-gray-700'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon icon={card.icon} className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <span className="text-3xl font-bold text-gray-900">{card.value}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600">{card.title}</h3>
            </div>
          ))}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {revenueCards.map((card, index) => (
            <div
              key={index}
              className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">{card.title}</h3>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-16 h-16 ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon icon={card.icon} className={`w-8 h-8 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Submissions */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Submissions</h2>
          <div className="space-y-3">
            {recentSubmissions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No submissions yet</p>
            ) : (
              recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = '/admin/submissions'}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {submission.first_name} {submission.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{submission.email}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{formatDate(submission.created_at)}</span>
                      {getStatusBadge(submission.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
