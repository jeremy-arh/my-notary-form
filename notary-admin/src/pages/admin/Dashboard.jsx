import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Line, Pie } from 'react-chartjs-2';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import '../../lib/chartConfig'; // Register Chart.js components
import { defaultChartOptions } from '../../lib/chartConfig';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingSubmissions: 0,
    confirmedSubmissions: 0,
    inProgressSubmissions: 0,
    completedSubmissions: 0,
    cancelledSubmissions: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageOrderValue: 0
  });
  const [chartData, setChartData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status colors matching the badge colors
  const STATUS_COLORS = {
    'Pending': '#FCD34D',      // yellow-300
    'Confirmed': '#34D399',    // green-400
    'In Progress': '#60A5FA',  // blue-400
    'Completed': '#A78BFA',    // purple-400
    'Cancelled': '#F87171'     // red-400
  };
  
  // Prepare line chart data
  const lineChartData = {
    labels: chartData.map(item => item.date),
    datasets: [
      {
        label: 'Submissions',
        data: chartData.map(item => item.submissions),
        borderColor: '#3B82F6', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
        yAxisID: 'y'
      },
      {
        label: 'Revenue ($)',
        data: chartData.map(item => item.revenue),
        borderColor: '#10B981', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
        yAxisID: 'y1'
      }
    ]
  };

  const lineChartOptions = {
    ...defaultChartOptions,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        ...defaultChartOptions.plugins.tooltip,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Revenue')) {
                label += '$' + context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      x: {
        ...defaultChartOptions.scales.x,
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        ...defaultChartOptions.scales.y,
        position: 'left',
        title: {
          display: true,
          text: 'Submissions',
          font: {
            size: 12,
            weight: '600'
          },
          color: '#3B82F6'
        },
        grid: {
          color: 'rgba(59, 130, 246, 0.1)'
        },
        ticks: {
          color: '#3B82F6'
        }
      },
      y1: {
        ...defaultChartOptions.scales.y,
        position: 'right',
        title: {
          display: true,
          text: 'Revenue ($)',
          font: {
            size: 12,
            weight: '600'
          },
          color: '#10B981'
        },
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: '#10B981',
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  // Prepare pie chart data
  const pieChartData = {
    labels: statusDistribution.map(item => item.name),
    datasets: [
      {
        data: statusDistribution.map(item => item.value),
        backgroundColor: statusDistribution.map(item => STATUS_COLORS[item.name] || '#9CA3AF'),
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverOffset: 8
      }
    ]
  };

  const pieChartOptions = {
    ...defaultChartOptions,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const dataset = data.datasets[0];
              const total = dataset.data.reduce((a, b) => a + b, 0);
              return data.labels.map((label, i) => {
                const value = dataset.data[i];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor,
                  lineWidth: dataset.borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        ...defaultChartOptions.plugins.tooltip,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch submissions
      const { data: submissions, error: subError } = await supabase
        .from('submission')
        .select('*, data')
        .order('created_at', { ascending: false });

      if (subError) throw subError;

      // Fetch users
      const { data: clients, error: clientError } = await supabase
        .from('client')
        .select('id');

      const totalUsers = clients?.length || 0;

      if (submissions) {
        // Calculate stats
        const pending = submissions.filter(s => s.status === 'pending').length;
        const confirmed = submissions.filter(s => s.status === 'confirmed').length;
        const completed = submissions.filter(s => s.status === 'completed').length;
        const cancelled = submissions.filter(s => s.status === 'cancelled').length;

        // Calculate revenue from payment data
        let totalRev = 0;
        let monthlyRev = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        submissions.forEach(sub => {
          const payment = sub.data?.payment;
          if (payment && payment.amount_paid) {
            const amount = payment.amount_paid / 100; // Convert from cents
            totalRev += amount;
            
            const subDate = new Date(sub.created_at);
            if (subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear) {
              monthlyRev += amount;
            }
          } else if (sub.total_price) {
            totalRev += parseFloat(sub.total_price);
            const subDate = new Date(sub.created_at);
            if (subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear) {
              monthlyRev += parseFloat(sub.total_price);
            }
          }
        });

        const avgOrderValue = submissions.length > 0 ? totalRev / submissions.length : 0;

        setStats({
          totalSubmissions: submissions.length,
          pendingSubmissions: pending,
          confirmedSubmissions: confirmed,
          completedSubmissions: completed,
          cancelledSubmissions: cancelled,
          totalUsers,
          totalRevenue: totalRev,
          monthlyRevenue: monthlyRev,
          averageOrderValue: avgOrderValue
        });

        // Prepare chart data (last 30 days)
        const last30Days = eachDayOfInterval({
          start: subDays(new Date(), 29),
          end: new Date()
        });

        const chartDataMap = last30Days.map(date => {
          const daySubmissions = submissions.filter(sub => {
            const subDate = new Date(sub.created_at);
            return format(subDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          });

          let dayRevenue = 0;
          daySubmissions.forEach(sub => {
            const payment = sub.data?.payment;
            if (payment && payment.amount_paid) {
              dayRevenue += payment.amount_paid / 100;
            } else if (sub.total_price) {
              dayRevenue += parseFloat(sub.total_price);
            }
          });

          return {
            date: format(date, 'MMM dd'),
            submissions: daySubmissions.length,
            revenue: dayRevenue
          };
        });

        setChartData(chartDataMap);

        // Status distribution
        setStatusDistribution([
          { name: 'Pending', value: pending },
          { name: 'Confirmed', value: confirmed },
          { name: 'Completed', value: completed },
          { name: 'Cancelled', value: cancelled }
        ]);

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
      title: 'Total Users',
      value: stats.totalUsers,
      icon: 'heroicons:users',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Pending',
      value: stats.pendingSubmissions,
      icon: 'heroicons:clock',
      color: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Completed',
      value: stats.completedSubmissions,
      icon: 'heroicons:check-circle',
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    }
  ];

  const revenueCards = [
    {
      title: 'Total Revenue',
      value: `€${stats.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'heroicons:currency-dollar',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Monthly Revenue',
      value: `€${stats.monthlyRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'heroicons:chart-bar',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Average Order Value',
      value: `€${stats.averageOrderValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'heroicons:calculator',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600'
    }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      pending_payment: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Pending',
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.pending}`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
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
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Vue d'ensemble complète de votre activité</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="bg-[#F3F4F6] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${card.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon icon={card.icon} className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 ml-2">{card.value}</span>
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600">{card.title}</h3>
            </div>
          ))}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {revenueCards.map((card, index) => (
            <div
              key={index}
              className="bg-[#F3F4F6] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2">{card.title}</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{card.value}</p>
                </div>
                <div className={`w-12 h-12 sm:w-16 sm:h-16 ${card.color} rounded-xl flex items-center justify-center flex-shrink-0 ml-3`}>
                  <Icon icon={card.icon} className={`w-6 h-6 sm:w-8 sm:h-8 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Submissions & Revenue Chart */}
          <div className="bg-[#F3F4F6] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Submissions & Revenue (30 derniers jours)</h2>
            <div className="overflow-x-auto">
              <div style={{ height: '250px', minWidth: '300px' }} className="sm:h-[300px]">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-[#F3F4F6] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Distribution des statuts</h2>
            <div className="overflow-x-auto">
              <div style={{ height: '250px', minWidth: '300px' }} className="sm:h-[300px]">
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-[#F3F4F6] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Soumissions récentes</h2>
          <div className="space-y-3">
            {recentSubmissions.length === 0 ? (
              <p className="text-gray-600 text-center py-8 text-sm sm:text-base">Aucune soumission</p>
            ) : (
              recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = '/submissions'}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {submission.first_name} {submission.last_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{submission.email}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:space-x-4">
                      <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{formatDate(submission.created_at)}</span>
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
