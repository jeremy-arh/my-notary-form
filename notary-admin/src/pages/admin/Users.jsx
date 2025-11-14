import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState(null);
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, statusFilter, dateFilter]);

  const fetchUsers = async () => {
    try {
      // Récupérer les users depuis la table client
      // Note: Pour accéder à auth.users, vous devrez utiliser une Edge Function avec service role key
      const { data: clients, error } = await supabase
        .from('client')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformer les clients en format user
      const formattedUsers = (clients || []).map(client => ({
        id: client.id,
        email: client.email,
        created_at: client.created_at,
        last_sign_in_at: client.updated_at,
        stripe_customer_id: client.stripe_customer_id,
        user_metadata: {
          first_name: client.first_name,
          last_name: client.last_name
        }
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Si la table client n'existe pas, on peut aussi récupérer depuis les soumissions
      try {
        const { data: submissions, error: subError } = await supabase
          .from('submission')
          .select('email, first_name, last_name, created_at')
          .order('created_at', { ascending: false });

        if (subError) throw subError;

        // Créer une liste unique d'utilisateurs basée sur les emails
        const uniqueUsers = {};
        (submissions || []).forEach(sub => {
          if (sub.email && !uniqueUsers[sub.email]) {
            uniqueUsers[sub.email] = {
              id: sub.email, // Utiliser email comme ID temporaire
              email: sub.email,
              created_at: sub.created_at,
              last_sign_in_at: sub.created_at,
              user_metadata: {
                first_name: sub.first_name,
                last_name: sub.last_name
              }
            };
          }
        });

        setUsers(Object.values(uniqueUsers));
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_metadata?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_metadata?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(user => new Date(user.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          filtered = filtered.filter(user => new Date(user.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          filtered = filtered.filter(user => new Date(user.created_at) >= filterDate);
          break;
        default:
          break;
      }
    }

    setFilteredUsers(filtered);
  };

  const fetchUserSubmissions = async (clientId) => {
    try {
      const { data: submissions, error } = await supabase
        .from('submission')
        .select('id, first_name, last_name, appointment_date, created_at, status')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserSubmissions(submissions || []);
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      setUserSubmissions([]);
    }
  };

  const handleOpenMessageModal = async (user) => {
    setSelectedUserForMessage(user);
    setMessageModalOpen(true);
    setSelectedSubmissionId('');
    await fetchUserSubmissions(user.id);
  };

  const toast = useToast();
  
  const handleStartConversation = () => {
    if (!selectedSubmissionId) {
      toast.warning('Please select a submission');
      return;
    }
    navigate(`/messages?submission_id=${selectedSubmissionId}`);
    setMessageModalOpen(false);
    setSelectedUserForMessage(null);
    setSelectedSubmissionId('');
    setUserSubmissions([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600 mt-2">Gérer tous les utilisateurs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Recherche
              </label>
              <div className="relative">
                <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Rechercher par email ou nom..."
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Période
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button className="w-full px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold">
                <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5 inline mr-2" />
                Exporter CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:users" className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Aujourd'hui</p>
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(u => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return new Date(u.created_at) >= today;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:calendar" className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ce mois</p>
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(u => {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return new Date(u.created_at) >= monthAgo;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Icon icon="heroicons:chart-bar" className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Inscription
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
                  
                  if (paginatedUsers.length === 0) {
                    return (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-600">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    );
                  }
                  
                  return paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {user.user_metadata?.first_name || 'N/A'} {user.user_metadata?.last_name || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {user.stripe_customer_id && (
                            <a
                              href={`https://dashboard.stripe.com/test/customers/${user.stripe_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Voir sur Stripe Dashboard"
                            >
                              <Icon icon="heroicons:arrow-top-right-on-square" className="w-5 h-5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleOpenMessageModal(user)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Envoyer un message"
                          >
                            <Icon icon="heroicons:chat-bubble-left-right" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {(() => {
          const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          
          if (totalPages <= 1) return null;
          
          return (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg ${
                          currentPage === page
                            ? 'bg-black text-white'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}

        {/* Message Modal */}
        {messageModalOpen && selectedUserForMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Message à {selectedUserForMessage.user_metadata?.first_name} {selectedUserForMessage.user_metadata?.last_name}
                </h2>
                <button
                  onClick={() => {
                    setMessageModalOpen(false);
                    setSelectedUserForMessage(null);
                    setSelectedSubmissionId('');
                    setUserSubmissions([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                {userSubmissions.length > 0 ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Sélectionner une soumission *</label>
                      <select
                        value={selectedSubmissionId}
                        onChange={(e) => setSelectedSubmissionId(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      >
                        <option value="">-- Sélectionner une soumission --</option>
                        {userSubmissions.map((submission) => (
                          <option key={submission.id} value={submission.id}>
                            {submission.first_name} {submission.last_name} - {new Date(submission.created_at).toLocaleDateString('fr-FR')} ({submission.status})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={handleStartConversation}
                        disabled={!selectedSubmissionId}
                        className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Démarrer la conversation
                      </button>
                      <button
                        onClick={() => {
                          setMessageModalOpen(false);
                          setSelectedUserForMessage(null);
                          setSelectedSubmissionId('');
                          setUserSubmissions([]);
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                      >
                        Annuler
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <p className="text-sm text-yellow-800">Cet utilisateur n'a aucune soumission.</p>
                    <button
                      onClick={() => {
                        setMessageModalOpen(false);
                        setSelectedUserForMessage(null);
                        setSelectedSubmissionId('');
                        setUserSubmissions([]);
                      }}
                      className="mt-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                    >
                      Fermer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Users;

