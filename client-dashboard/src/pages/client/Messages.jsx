import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ClientLayout from '../../components/ClientLayout';
import Chat from '../../components/Chat';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

const Messages = () => {
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchClientAndConversations();
  }, []);

  const fetchClientAndConversations = async () => {
    setLoading(true);
    try {
      // Get current user and client info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      setClientInfo(client);

      // Get all submissions for this client
      const { data: submissions, error: submissionsError } = await supabase
        .from('submission')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        throw submissionsError;
      }

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

            const unreadCount = messages?.filter(m => !m.read && m.sender_type !== 'client').length || 0;
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

      // Filter to only show conversations with at least one message
      const filteredConversations = conversationsWithMessages.filter(conv => conv.messageCount > 0);

      // Sort by last message date (most recent first)
      filteredConversations.sort((a, b) => {
        if (!a.lastMessage || !b.lastMessage) return 0;
        return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
      });

      setConversations(filteredConversations);

      // Select first conversation by default
      if (filteredConversations.length > 0) {
        setSelectedConversation(filteredConversations[0]);
        // On mobile, show chat in fullscreen when selecting first conversation
        if (window.innerWidth < 1024) {
          setShowChatFullscreen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error(`Error loading conversations: ${error.message}`);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [showChatFullscreen, setShowChatFullscreen] = useState(false);

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
      pending: 'Pending',
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
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

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0 bg-white">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Your conversations</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 sm:p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors border border-gray-300 hover:border-gray-400 lg:shadow-sm"
          title="Close Messages"
          aria-label="Close messages"
        >
          <Icon icon="heroicons:x-mark" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-gray-900" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Icon icon="heroicons:chat-bubble-left-right" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-2">No conversations</p>
            <p className="text-gray-600">Conversations will appear here once a message has been sent.</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Conversations List */}
            <div className={`w-full sm:w-96 lg:w-[400px] border-r border-gray-200 flex flex-col flex-shrink-0 ${showChatFullscreen ? 'hidden lg:flex' : ''}`}>
              <div className="p-4 border-b border-gray-300 flex-shrink-0">
                <h2 className="font-semibold text-base text-gray-900">Conversations ({conversations.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conversation) => (
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
                          Submission #{conversation.id.substring(0, 8)}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {new Date(conversation.created_at).toLocaleDateString('en-US')}
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
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-xs text-gray-600 mt-2 truncate">
                        {conversation.lastMessage.sender_type === 'client' ? 'You: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area - Desktop */}
            <div className={`flex-1 flex flex-col min-w-0 ${showChatFullscreen ? 'hidden lg:flex' : ''}`}>
              {selectedConversation ? (
                clientInfo?.id ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Chat
                      submissionId={selectedConversation.id}
                      currentUserType="client"
                      currentUserId={clientInfo.id}
                      recipientName="Support"
                      isFullscreen={true}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Icon icon="heroicons:exclamation-triangle" className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <p className="text-gray-900 font-semibold mb-2">Authentication error</p>
                    <p className="text-gray-600 text-sm">Unable to load client information. Please refresh the page.</p>
                  </div>
                )
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Icon icon="heroicons:chat-bubble-left-right" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Fullscreen Chat */}
            {showChatFullscreen && selectedConversation && clientInfo?.id && (
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
                        Submission #{selectedConversation.id.substring(0, 8)}
                      </h2>
                      <p className="text-xs text-gray-600 truncate">
                        {new Date(selectedConversation.created_at).toLocaleDateString('en-US')}
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
                    currentUserType="client"
                    currentUserId={clientInfo.id}
                    recipientName="Support"
                    isFullscreen={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

