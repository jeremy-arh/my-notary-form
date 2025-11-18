import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import Chat from '../../components/admin/Chat';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

const Messages = () => {
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatFullscreen, setShowChatFullscreen] = useState(false);
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
    setLoading(true);
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
      }
      
      if (currentUser) {
        // Try to get or create admin_user entry
        const { data: admin, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (adminError) {
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

          if (!createError && newAdmin) {
            setAdminInfo(newAdmin);
          } else {
            // Get any admin_user entry as fallback
            const { data: anyAdmin } = await supabase
              .from('admin_user')
              .select('*')
              .limit(1)
              .single();
            
            if (anyAdmin) {
              setAdminInfo(anyAdmin);
            } else {
              setAdminInfo({ id: currentUser.id, first_name: 'Admin', last_name: 'User', email: currentUser.email });
            }
          }
        } else {
          setAdminInfo(admin);
        }
      } else {
        // No user - try to get any admin_user entry (for service role key)
        const { data: anyAdmin } = await supabase
          .from('admin_user')
          .select('*')
          .limit(1)
          .single();
        
        if (anyAdmin) {
          setAdminInfo(anyAdmin);
        }
      }

      // Get all submissions (admin can see all)
      const { data: submissions, error: submissionsError } = await supabase
        .from('submission')
        .select(`
          *,
          client:client_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      if (!submissions || submissions.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each submission, get message count and last message
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

      // Show all submissions (even without messages to allow starting conversations)
      // But prioritize those with messages
      const filteredConversations = conversationsWithMessages;

      // Sort by: first conversations with messages (by last message date), then by submission created date
      filteredConversations.sort((a, b) => {
        // If both have messages, sort by last message date
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
        }
        // Conversations with messages come first
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        // Both without messages, sort by submission created date
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setConversations(filteredConversations);
      setFilteredConversations(filteredConversations);

      // Select first conversation by default if no URL param
      const submissionIdFromUrl = searchParams.get('submission_id');
      if (submissionIdFromUrl) {
        const conversation = filteredConversations.find(c => c.id === submissionIdFromUrl);
        if (conversation) {
          setSelectedConversation(conversation);
        } else if (filteredConversations.length > 0) {
          setSelectedConversation(filteredConversations[0]);
        }
      } else if (filteredConversations.length > 0) {
        setSelectedConversation(filteredConversations[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error(`Erreur lors du chargement des conversations: ${error.message}`);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter conversations based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = conversations.filter((conv) => {
      // Search in client name
      const clientName = `${conv.client?.first_name || conv.first_name} ${conv.client?.last_name || conv.last_name}`.toLowerCase();
      if (clientName.includes(searchLower)) return true;

      // Search in client email
      const clientEmail = (conv.client?.email || conv.email || '').toLowerCase();
      if (clientEmail.includes(searchLower)) return true;

      // Search in submission ID
      if (conv.id.toLowerCase().includes(searchLower)) return true;

      // Search in messages content
      if (conv.messages && conv.messages.length > 0) {
        const hasMatchingMessage = conv.messages.some(msg => 
          msg.content.toLowerCase().includes(searchLower)
        );
        if (hasMatchingMessage) return true;
      }

      return false;
    });

    setFilteredConversations(filtered);
  }, [searchTerm, conversations]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      pending_payment: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'En attente',
      pending_payment: 'Paiement en attente',
      confirmed: 'Confirmé',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
      accepted: 'Accepté',
      rejected: 'Rejeté'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {labels[status] || status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  };

  return (
    <AdminLayout>
      <style>{`
        /* Hide everything on mobile/tablet for messages page */
        @media (max-width: 1023px) {
          aside {
            display: none !important;
          }
          main > div:first-child {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            margin-left: 0 !important;
          }
        }
        /* Hide header on desktop */
        @media (min-width: 1024px) {
          main > div:first-child {
            display: none !important;
          }
        }
      `}</style>
      <div className="fixed inset-0 flex gap-0 bg-white overflow-hidden z-[9999] lg:left-80">
        {/* Conversations List */}
        <div className={`w-full lg:w-80 h-full bg-[#F3F4F6] border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden ${showChatFullscreen ? 'hidden lg:flex' : ''}`}>
          <div className="p-4 border-b border-gray-300 flex-shrink-0 space-y-3">
            <h2 className="font-semibold text-base text-gray-900">Conversations ({filteredConversations.length})</h2>
            {/* Search Bar */}
            <div className="relative">
              <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                placeholder="Rechercher un message, utilisateur ou soumission..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Icon icon="heroicons:chat-bubble-left-right" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 font-semibold text-sm mb-2">
                  {searchTerm ? 'Aucun résultat trouvé' : 'Aucune conversation'}
                </p>
                <p className="text-gray-600 text-xs">
                  {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Les conversations apparaîtront ici une fois qu\'un message aura été envoyé.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    // On mobile, show chat in fullscreen when clicking a conversation
                    const isMobile = window.innerWidth < 1024;
                    if (isMobile) {
                      setShowChatFullscreen(true);
                    }
                  }}
                  className={`p-4 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedConversation?.id === conversation.id ? 'bg-white border-l-4 border-l-black' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {conversation.client?.first_name || conversation.first_name} {conversation.client?.last_name || conversation.last_name}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {conversation.client?.email || conversation.email}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="ml-2 bg-black text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    {getStatusBadge(conversation.status)}
                    {conversation.lastMessage ? (
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessage.created_at)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.created_at)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage ? (
                    <p className="text-xs text-gray-600 mt-2 truncate">
                      {conversation.lastMessage.sender_type === 'admin' ? 'Vous: ' : ''}
                      {conversation.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Aucun message. Démarrez la conversation !
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area - Desktop */}
        <div className={`flex-1 h-full flex flex-col min-w-0 bg-white ${showChatFullscreen ? 'hidden lg:flex' : ''}`}>
          {selectedConversation ? (
            adminInfo?.id ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <Chat
                  submissionId={selectedConversation.id}
                  currentUserType="admin"
                  currentUserId={adminInfo.id}
                  recipientName={`${selectedConversation.client?.first_name || selectedConversation.first_name} ${selectedConversation.client?.last_name || selectedConversation.last_name}`}
                  isFullscreen={true}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Icon icon="heroicons:exclamation-triangle" className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <p className="text-gray-900 font-semibold mb-2">Erreur d'authentification</p>
                <p className="text-gray-600 text-sm">Impossible de charger les informations administrateur. Veuillez rafraîchir la page.</p>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <Icon icon="heroicons:chat-bubble-left-right" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Sélectionnez une conversation pour commencer à discuter</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Fullscreen Chat */}
        {showChatFullscreen && selectedConversation && adminInfo?.id && (
          <div className="fixed inset-0 z-[101] bg-white flex flex-col lg:hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setShowChatFullscreen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <Icon icon="heroicons:arrow-left" className="w-6 h-6 text-gray-900" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-sm text-gray-900 truncate">
                    {selectedConversation.client?.first_name || selectedConversation.first_name} {selectedConversation.client?.last_name || selectedConversation.last_name}
                  </h2>
                  <p className="text-xs text-gray-600 truncate">
                    {selectedConversation.client?.email || selectedConversation.email}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {getStatusBadge(selectedConversation.status)}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Chat
                submissionId={selectedConversation.id}
                currentUserType="admin"
                currentUserId={adminInfo.id}
                recipientName={`${selectedConversation.client?.first_name || selectedConversation.first_name} ${selectedConversation.client?.last_name || selectedConversation.last_name}`}
                isFullscreen={true}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Messages;
