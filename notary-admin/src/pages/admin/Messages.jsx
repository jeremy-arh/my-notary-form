import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import Chat from '../../components/admin/Chat';
import { supabase } from '../../lib/supabase';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [notaryInfo, setNotaryInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotaryAndConversations();
  }, []);

  const fetchNotaryAndConversations = async () => {
    try {
      // Get current notary
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notary, error: notaryError } = await supabase
        .from('notary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (notaryError) throw notaryError;
      setNotaryInfo(notary);

      // Get submissions assigned to this notary with messages
      const { data: submissions, error: submissionsError } = await supabase
        .from('submission')
        .select(`
          *,
          client:client_id(id, first_name, last_name, email)
        `)
        .eq('assigned_notary_id', notary.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // For each submission, get message count and last message
      const conversationsWithMessages = await Promise.all(
        submissions.map(async (submission) => {
          const { data: messages } = await supabase
            .from('message')
            .select('*')
            .eq('submission_id', submission.id)
            .order('created_at', { ascending: false });

          const unreadCount = messages?.filter(m => !m.read && m.sender_type !== 'notary').length || 0;
          const lastMessage = messages?.[0] || null;

          return {
            ...submission,
            messages: messages || [],
            messageCount: messages?.length || 0,
            unreadCount,
            lastMessage
          };
        })
      );

      // Sort by last message date (most recent first)
      conversationsWithMessages.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
      });

      setConversations(conversationsWithMessages);

      // Select first conversation by default
      if (conversationsWithMessages.length > 0) {
        setSelectedConversation(conversationsWithMessages[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">Chat with your clients</p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-[#F3F4F6] rounded-2xl p-12 text-center">
            <Icon icon="heroicons:chat-bubble-left-right" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-2">No conversations yet</p>
            <p className="text-gray-600">Conversations will appear here when clients message you.</p>
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
                          {conversation.client?.first_name} {conversation.client?.last_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{conversation.client?.email}</p>
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
                        {conversation.lastMessage.sender_type === 'notary' ? 'You: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                    {conversation.messageCount === 0 && (
                      <p className="text-sm text-gray-400 mt-2 italic">No messages yet</p>
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
                    </div>
                  </div>

                  {/* Chat Component */}
                  <Chat
                    submissionId={selectedConversation.id}
                    currentUserType="notary"
                    currentUserId={notaryInfo?.id}
                    recipientName={`${selectedConversation.client?.first_name} ${selectedConversation.client?.last_name}`}
                  />
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
      </div>
    </AdminLayout>
  );
};

export default Messages;
