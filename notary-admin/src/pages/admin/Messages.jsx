import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import Chat from '../../components/admin/Chat';
import { supabase } from '../../lib/supabase';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [userSubmissions, setUserSubmissions] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchAdminAndConversations();
  }, []);

  // Handle URL params after conversations are loaded
  useEffect(() => {
    const submissionId = searchParams.get('submission_id');
    if (submissionId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === submissionId);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [searchParams, conversations]);

  const fetchAdminAndConversations = async () => {
    try {
      // Get current admin - handle errors silently when using service role key
      let currentUser = null;
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          currentUser = user;
        }
      } catch (error) {
        // Silently handle AuthSessionMissingError when using service role key
        // This is expected behavior
      }
      
      if (!currentUser) {
        // Try getSession as fallback
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            currentUser = session.user;
          }
        } catch (error) {
          // Silently handle - service role key doesn't have sessions
        }
      }
      
      if (currentUser) {
        console.log('👤 Current user:', currentUser.id, currentUser.email);
      } else {
        // Using service role key - no user session needed
        console.log('🔑 Using service role key (no user session required)');
      }

      // Try to get or create admin_user entry (only if we have a user)
      if (currentUser) {
        const { data: admin, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (adminError) {
          console.error('Admin not found in admin_user table:', adminError);
          console.log('Attempting to create admin_user entry for user:', currentUser.id);
          
          // Try to create admin_user entry if it doesn't exist
          const { data: newAdmin, error: createError } = await supabase
            .from('admin_user')
            .insert({
              user_id: currentUser.id,
              first_name: 'Admin',
              last_name: 'User',
              email: currentUser.email || 'admin@example.com',
              role: 'super_admin'
            })
            .select()
            .single();

          if (createError) {
            console.error('Could not create admin_user:', createError);
            console.warn('⚠️ Continuing without admin_user entry (service role key bypasses RLS)');
            // Create a temporary admin object for message sending
            // We'll use the first admin_user entry or create a dummy one
            const { data: anyAdmin } = await supabase
              .from('admin_user')
              .select('*')
              .limit(1)
              .single();
            
            if (anyAdmin) {
              setAdminInfo(anyAdmin);
            } else {
              // Last resort: use user.id as admin id (might not work with RLS)
              setAdminInfo({ id: currentUser.id, first_name: 'Admin', last_name: 'User', email: currentUser.email });
            }
          } else {
            console.log('Successfully created admin_user:', newAdmin);
            setAdminInfo(newAdmin);
          }
        } else {
          console.log('Found admin_user:', admin);
          setAdminInfo(admin);
        }
      } else {
        // No user - try to get any admin_user entry (for service role key)
        console.log('⚠️ No user available, fetching first admin_user entry...');
        const { data: anyAdmin } = await supabase
          .from('admin_user')
          .select('*')
          .limit(1)
          .single();
        
        if (anyAdmin) {
          console.log('Using first admin_user entry:', anyAdmin);
          setAdminInfo(anyAdmin);
        } else {
          console.warn('⚠️ No admin_user entries found. Message sending might fail.');
        }
      }

      // Get all submissions (admin can see all)
      console.log('📥 Fetching all submissions...');
      const { data: submissions, error: submissionsError } = await supabase
        .from('submission')
        .select(`
          *,
          client:client_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('❌ Error fetching submissions:', submissionsError);
        throw submissionsError;
      }

      console.log(`✅ Found ${submissions?.length || 0} submissions`);

      if (!submissions || submissions.length === 0) {
        console.log('⚠️ No submissions found');
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each submission, get message count and last message
      console.log('📨 Fetching messages for each submission...');
      const conversationsWithMessages = await Promise.all(
        submissions.map(async (submission) => {
          try {
            const { data: messages, error: messagesError } = await supabase
              .from('message')
              .select('*')
              .eq('submission_id', submission.id)
              .order('created_at', { ascending: false });

            if (messagesError) {
              console.error(`Error fetching messages for submission ${submission.id}:`, messagesError);
            }

            const unreadCount = messages?.filter(m => !m.read && m.sender_type !== 'admin').length || 0;
            const lastMessage = messages?.[0] || null;

            return {
              ...submission,
              messages: messages || [],
              messageCount: messages?.length || 0,
              unreadCount,
              lastMessage
            };
          } catch (error) {
            console.error(`Error processing submission ${submission.id}:`, error);
            return {
              ...submission,
              messages: [],
              messageCount: 0,
              unreadCount: 0,
              lastMessage: null
            };
          }
        })
      );

      console.log(`✅ Processed ${conversationsWithMessages.length} conversations`);

      // Filter to only show conversations with at least one message
      const filteredConversations = conversationsWithMessages.filter(conv => conv.messageCount > 0);

      // Sort by last message date (most recent first)
      filteredConversations.sort((a, b) => {
        if (!a.lastMessage || !b.lastMessage) return 0;
        return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
      });

      console.log(`📋 Setting ${filteredConversations.length} conversations`);
      setConversations(filteredConversations);

      // Select first conversation by default if no URL param
      const submissionIdFromUrl = searchParams.get('submission_id');
      if (submissionIdFromUrl) {
        const conversation = filteredConversations.find(c => c.id === submissionIdFromUrl);
        if (conversation) {
          console.log('✅ Found conversation from URL param:', submissionIdFromUrl);
          setSelectedConversation(conversation);
        } else if (filteredConversations.length > 0) {
          console.log('⚠️ Conversation from URL not found, selecting first');
          setSelectedConversation(filteredConversations[0]);
        }
      } else if (filteredConversations.length > 0) {
        console.log('✅ Selecting first conversation by default');
        setSelectedConversation(filteredConversations[0]);
      } else {
        console.log('⚠️ No conversations to select');
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      alert(`Erreur lors du chargement des conversations: ${error.message}`);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data: clients, error } = await supabase
        .from('client')
        .select('id, first_name, last_name, email')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableUsers(clients || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
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
    }
  };

  const handleStartConversation = async () => {
    if (!selectedSubmissionId) {
      alert('Veuillez sélectionner une soumission');
      return;
    }

    // Navigate to messages with this submission selected
    navigate(`/messages?submission_id=${selectedSubmissionId}`);
    setShowNewConversationModal(false);
    setSelectedUserId('');
    setSelectedSubmissionId('');
    setUserSubmissions([]);
    
    // Refresh conversations
    await fetchAdminAndConversations();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
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
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
            <p className="text-gray-600">Communiquer avec les utilisateurs</p>
          </div>
          <button
            onClick={() => {
              setShowNewConversationModal(true);
              fetchAvailableUsers();
            }}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold flex items-center gap-2"
          >
            <Icon icon="heroicons:plus" className="w-5 h-5" />
            Nouvelle conversation
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-[#F3F4F6] rounded-2xl p-12 text-center">
            <Icon icon="heroicons:chat-bubble-left-right" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-2">Aucune conversation</p>
            <p className="text-gray-600">Les conversations apparaîtront ici. Vous pouvez également créer une nouvelle conversation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="lg:col-span-1 bg-[#F3F4F6] rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-300">
                <h2 className="font-semibold text-gray-900">Conversations ({conversations.length})</h2>
              </div>
              <div className="overflow-y-auto max-h-[600px]">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedConversation?.id === conversation.id ? 'bg-white border-l-4 border-l-black' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {conversation.client?.first_name || conversation.first_name} {conversation.client?.last_name || conversation.last_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{conversation.client?.email || conversation.email}</p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="ml-2 bg-black text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(conversation.status)}
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 mt-2 truncate">
                        {conversation.lastMessage.sender_type === 'admin' ? 'Vous: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                    {conversation.messageCount === 0 && (
                      <p className="text-sm text-gray-400 mt-2 italic">Aucun message</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedConversation ? (
                <div>
                  {/* Conversation Header */}
                  <div className="bg-[#F3F4F6] rounded-2xl p-4 mb-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg">
                          {selectedConversation.client?.first_name} {selectedConversation.client?.last_name}
                        </h2>
                        <p className="text-sm text-gray-600">{selectedConversation.client?.email}</p>
                      </div>
                      {getStatusBadge(selectedConversation.status)}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Appointment:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {new Date(selectedConversation.appointment_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {selectedConversation.appointment_time}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/submission/${selectedConversation.id}`)}
                        className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Icon icon="heroicons:document-text" className="w-5 h-5" />
                        Voir la soumission complète
                      </button>
                    </div>
                  </div>

                  {/* Chat Component */}
                  {adminInfo?.id ? (
                    <Chat
                      submissionId={selectedConversation.id}
                      currentUserType="admin"
                      currentUserId={adminInfo.id}
                      recipientName={`${selectedConversation.client?.first_name || selectedConversation.first_name} ${selectedConversation.client?.last_name || selectedConversation.last_name}`}
                      clientFirstName={selectedConversation.client?.first_name || selectedConversation.first_name}
                      clientLastName={selectedConversation.client?.last_name || selectedConversation.last_name}
                    />
                  ) : (
                    <div className="bg-[#F3F4F6] rounded-2xl p-12 text-center border border-gray-200">
                      <Icon icon="heroicons:exclamation-triangle" className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <p className="text-gray-900 font-semibold mb-2">Erreur d'authentification</p>
                      <p className="text-gray-600 text-sm">Impossible de charger les informations administrateur. Veuillez rafraîchir la page.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#F3F4F6] rounded-2xl p-12 text-center h-[600px] flex items-center justify-center border border-gray-200">
                  <div>
                    <Icon icon="heroicons:chat-bubble-left-right" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Conversation Modal */}
        {showNewConversationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Nouvelle conversation</h2>
                <button
                  onClick={() => {
                    setShowNewConversationModal(false);
                    setSelectedUserId('');
                    setSelectedSubmissionId('');
                    setUserSubmissions([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Sélectionner un utilisateur *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setSelectedSubmissionId('');
                      if (e.target.value) {
                        fetchUserSubmissions(e.target.value);
                      } else {
                        setUserSubmissions([]);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="">-- Sélectionner un utilisateur --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedUserId && userSubmissions.length > 0 && (
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
                )}
                {selectedUserId && userSubmissions.length === 0 && (
                  <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <p className="text-sm text-yellow-800">Cet utilisateur n'a aucune soumission.</p>
                  </div>
                )}
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
                      setShowNewConversationModal(false);
                      setSelectedUserId('');
                      setSelectedSubmissionId('');
                      setUserSubmissions([]);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Messages;
