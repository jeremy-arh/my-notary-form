import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CRM = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get('tab') || 'clients'; // 'clients' or 'submissions'
  
  // Clients state
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsSearchTerm, setClientsSearchTerm] = useState('');
  const [clientsCurrentPage, setClientsCurrentPage] = useState(1);
  const clientsItemsPerPage = 10;
  
  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsSearchTerm, setSubmissionsSearchTerm] = useState('');
  const [submissionsStatusFilter, setSubmissionsStatusFilter] = useState('all');
  const [submissionsViewMode, setSubmissionsViewMode] = useState('table'); // 'table' or 'kanban'
  const [submissionsCurrentPage, setSubmissionsCurrentPage] = useState(1);
  const submissionsItemsPerPage = 10;
  const [activeId, setActiveId] = useState(null);
  
  // Funnel status order (from highest to lowest - left to right in kanban)
  const funnelStatusOrder = [
    'payment_completed',
    'payment_pending',
    'summary_viewed',
    'personal_info_completed',
    'delivery_method_selected',
    'documents_uploaded',
    'services_selected',
    'started'
  ];
  
  const funnelStatusLabels = {
    'started': 'Démarrage',
    'services_selected': 'Services sélectionnés',
    'documents_uploaded': 'Documents uploadés',
    'delivery_method_selected': 'Méthode de livraison',
    'personal_info_completed': 'Infos personnelles',
    'summary_viewed': 'Résumé consulté',
    'payment_pending': 'Paiement en attente',
    'payment_completed': 'Paiement effectué'
  };
  
  // Kanban columns - ordered from highest to lowest funnel status
  const [kanbanColumns, setKanbanColumns] = useState(() => {
    const columns = {};
    funnelStatusOrder.forEach(status => {
      columns[status] = {
        id: status,
        title: funnelStatusLabels[status] || status,
        submissions: []
      };
    });
    return columns;
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (activeSubTab === 'clients') {
      fetchClients();
    } else if (activeSubTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab === 'clients') {
      filterClients();
      setClientsCurrentPage(1);
    }
  }, [clients, clientsSearchTerm]);

  useEffect(() => {
    if (activeSubTab === 'submissions') {
      filterSubmissions();
      setSubmissionsCurrentPage(1);
    }
  }, [submissions, submissionsSearchTerm, submissionsStatusFilter]);

  useEffect(() => {
    if (activeSubTab === 'submissions' && submissionsViewMode === 'kanban') {
      organizeKanban();
    }
  }, [filteredSubmissions, submissionsViewMode, activeSubTab]);

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const { data: clientsData, error: clientsError } = await supabase
        .from('client')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      const clientsWithSubmissions = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count: submissionsCount } = await supabase
            .from('submission')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            submissions_count: submissionsCount || 0,
            last_login: client.updated_at
          };
        })
      );

      setClients(clientsWithSubmissions);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setClientsLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    if (clientsSearchTerm) {
      filtered = filtered.filter(client =>
        client.email?.toLowerCase().includes(clientsSearchTerm.toLowerCase()) ||
        client.first_name?.toLowerCase().includes(clientsSearchTerm.toLowerCase()) ||
        client.last_name?.toLowerCase().includes(clientsSearchTerm.toLowerCase())
      );
    }

    setFilteredClients(filtered);
  };

  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const { data, error } = await supabase
        .from('submission')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Erreur lors du chargement des submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    if (submissionsStatusFilter !== 'all') {
      filtered = filtered.filter(s => s && s.status === submissionsStatusFilter);
    }

    if (submissionsSearchTerm) {
      const searchLower = submissionsSearchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.email?.toLowerCase().includes(searchLower) ||
        s.first_name?.toLowerCase().includes(searchLower) ||
        s.last_name?.toLowerCase().includes(searchLower) ||
        s.id?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSubmissions(filtered);
  };

  const organizeKanban = () => {
    const organized = { ...kanbanColumns };
    Object.keys(organized).forEach(key => {
      organized[key].submissions = [];
    });

    filteredSubmissions.forEach(submission => {
      let status = submission.funnel_status || 'started';
      // Redirect submission_completed to payment_completed since we removed that column
      if (status === 'submission_completed') {
        status = 'payment_completed';
      }
      if (organized[status]) {
        organized[status].submissions.push(submission);
      } else {
        organized['started'].submissions.push(submission);
      }
    });

    setKanbanColumns(organized);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    let sourceColumn = null;
    let submission = null;
    let sourceIndex = -1;

    Object.keys(kanbanColumns).forEach(columnId => {
      const index = kanbanColumns[columnId].submissions.findIndex(s => s.id === activeId);
      if (index !== -1) {
        sourceColumn = columnId;
        submission = kanbanColumns[columnId].submissions[index];
        sourceIndex = index;
      }
    });

    if (!submission) return;

    let targetColumn = null;
    if (overId.startsWith('column-')) {
      targetColumn = overId.replace('column-', '');
    } else {
      Object.keys(kanbanColumns).forEach(columnId => {
        if (kanbanColumns[columnId].submissions.some(s => s.id === overId)) {
          targetColumn = columnId;
        }
      });
    }

    if (!targetColumn || sourceColumn === targetColumn) return;

    const newColumns = { ...kanbanColumns };
    newColumns[sourceColumn].submissions = newColumns[sourceColumn].submissions.filter(s => s.id !== submission.id);
    newColumns[targetColumn].submissions.push(submission);
    setKanbanColumns(newColumns);

    try {
      const { error } = await supabase
        .from('submission')
        .update({ funnel_status: targetColumn })
        .eq('id', submission.id);

      if (error) throw error;

      setSubmissions(prevSubmissions =>
        prevSubmissions.map(s => s.id === submission.id ? { ...s, funnel_status: targetColumn } : s)
      );

      toast.success('Statut du funnel mis à jour');
    } catch (error) {
      console.error('Error updating funnel status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
      organizeKanban();
    }
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

  const handleSubTabChange = (tab) => {
    setSearchParams({ tab });
  };

  if (activeSubTab === 'clients' && clientsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  if (activeSubTab === 'submissions' && submissionsLoading) {
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
      <div className="space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
            <p className="text-gray-600 mt-2">Gérer vos clients et submissions</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleSubTabChange('clients')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeSubTab === 'clients' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Clients
              {activeSubTab === 'clients' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            <button
              onClick={() => handleSubTabChange('submissions')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeSubTab === 'submissions' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Submissions
              {activeSubTab === 'submissions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          </nav>
        </div>

        {/* Clients Tab Content */}
        {activeSubTab === 'clients' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Recherche
                  </label>
                  <div className="relative">
                    <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={clientsSearchTerm}
                      onChange={(e) => setClientsSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="Rechercher par email ou nom..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date d'inscription
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Dernière connexion
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Submissions
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const startIndex = (clientsCurrentPage - 1) * clientsItemsPerPage;
                      const endIndex = startIndex + clientsItemsPerPage;
                      const paginatedClients = filteredClients.slice(startIndex, endIndex);
                      
                      if (paginatedClients.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-gray-600">
                              Aucun client trouvé
                            </td>
                          </tr>
                        );
                      }
                      
                      return paginatedClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">
                              {client.first_name || 'N/A'} {client.last_name || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {client.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(client.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(client.last_login)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {client.submissions_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => navigate(`/crm/client/${client.id}`)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Voir les détails"
                            >
                              <Icon icon="heroicons:eye" className="w-5 h-5" />
                            </button>
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
              const totalPages = Math.ceil(filteredClients.length / clientsItemsPerPage);
              const startIndex = (clientsCurrentPage - 1) * clientsItemsPerPage;
              const endIndex = startIndex + clientsItemsPerPage;
              
              if (totalPages <= 1) return null;
              
              return (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} clients
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setClientsCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={clientsCurrentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (clientsCurrentPage <= 3) {
                          page = i + 1;
                        } else if (clientsCurrentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = clientsCurrentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setClientsCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg ${
                              clientsCurrentPage === page
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
                      onClick={() => setClientsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={clientsCurrentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Submissions Tab Content */}
        {activeSubTab === 'submissions' && (
          <div className="space-y-6">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSubmissionsViewMode('table')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  submissionsViewMode === 'table'
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Icon icon="heroicons:table-cells" className="w-5 h-5 inline mr-2" />
                Table
              </button>
              <button
                onClick={() => setSubmissionsViewMode('kanban')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  submissionsViewMode === 'kanban'
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Icon icon="heroicons:squares-2x2" className="w-5 h-5 inline mr-2" />
                Kanban
              </button>
            </div>

            {/* Filters */}
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Recherche
                  </label>
                  <div className="relative">
                    <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={submissionsSearchTerm}
                      onChange={(e) => setSubmissionsSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="Rechercher par email, nom ou ID..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Statut
                  </label>
                  <select
                    value={submissionsStatusFilter}
                    onChange={(e) => setSubmissionsStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending_payment">Paiement en attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Complété</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table View */}
            {submissionsViewMode === 'table' && (
              <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Funnel Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const startIndex = (submissionsCurrentPage - 1) * submissionsItemsPerPage;
                        const endIndex = startIndex + submissionsItemsPerPage;
                        const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);
                        
                        if (paginatedSubmissions.length === 0) {
                          return (
                            <tr>
                              <td colSpan="7" className="px-6 py-12 text-center text-gray-600">
                                Aucune submission trouvée
                              </td>
                            </tr>
                          );
                        }
                        
                        return paginatedSubmissions.map((submission) => (
                          <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {submission.id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900">
                                {submission.first_name || 'N/A'} {submission.last_name || ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {submission.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                submission.status === 'completed' ? 'bg-green-100 text-green-800' :
                                submission.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-800' :
                                submission.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {submission.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {funnelStatusLabels[submission.funnel_status] || submission.funnel_status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(submission.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => navigate(`/submission/${submission.id}`)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Voir les détails"
                              >
                                <Icon icon="heroicons:eye" className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kanban View */}
            {submissionsViewMode === 'kanban' && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="w-full overflow-x-auto overflow-y-visible pb-4" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-4 min-w-max px-1">
                    {funnelStatusOrder.map((status) => {
                      const column = kanbanColumns[status];
                      if (!column) return null;
                      return <KanbanColumn key={column.id} column={column} />;
                    })}
                  </div>
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500">
                      {kanbanColumns[Object.keys(kanbanColumns).find(key => 
                        kanbanColumns[key].submissions.some(s => s.id === activeId)
                      )]?.submissions.find(s => s.id === activeId)?.first_name || 'Submission'}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Pagination - Only for table view */}
            {submissionsViewMode === 'table' && (() => {
              const totalPages = Math.ceil(filteredSubmissions.length / submissionsItemsPerPage);
              const startIndex = (submissionsCurrentPage - 1) * submissionsItemsPerPage;
              const endIndex = startIndex + submissionsItemsPerPage;
              
              if (totalPages <= 1) return null;
              
              return (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1} à {Math.min(endIndex, filteredSubmissions.length)} sur {filteredSubmissions.length} submissions
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSubmissionsCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={submissionsCurrentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (submissionsCurrentPage <= 3) {
                          page = i + 1;
                        } else if (submissionsCurrentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = submissionsCurrentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setSubmissionsCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg ${
                              submissionsCurrentPage === page
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
                      onClick={() => setSubmissionsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={submissionsCurrentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Kanban Column Component
const KanbanColumn = ({ column }) => {
  const { setNodeRef } = useSortable({
    id: `column-${column.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-80 min-w-[280px] max-w-[320px] bg-[#F3F4F6] rounded-2xl border border-gray-200 p-4"
    >
      <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
        <span>{column.title}</span>
        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-lg text-sm">
          {column.submissions.length}
        </span>
      </h3>
      <SortableContext items={column.submissions.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {column.submissions.map((submission) => (
            <KanbanCard key={submission.id} submission={submission} />
          ))}
          {column.submissions.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              Aucune submission
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// Kanban Card Component
const KanbanCard = ({ submission }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: submission.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking on the drag handle
    if (e.target.closest('.drag-handle')) {
      return;
    }
    navigate(`/submission/${submission.id}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-gray-900 mb-1">
            {submission.first_name} {submission.last_name}
          </div>
          <div className="text-sm text-gray-600 mb-2">{submission.email}</div>
        </div>
        {/* Drag handle - separate from click */}
        <div
          {...attributes}
          {...listeners}
          className="drag-handle ml-2 p-1 cursor-move hover:bg-gray-100 rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon="heroicons:bars-3" className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{submission.status}</span>
        <span className="text-blue-600">Voir →</span>
      </div>
    </div>
  );
};

export default CRM;
