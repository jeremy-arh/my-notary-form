import { useEffect, useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

/**
 * Reusable Chat component for messaging between clients, notaries, and admins
 *
 * @param {string} submissionId - The submission ID for this conversation
 * @param {string} currentUserType - Type of current user: 'client', 'notary', or 'admin'
 * @param {string} currentUserId - ID of the current user
 * @param {string} recipientName - Name of the person you're chatting with (optional)
 */
const Chat = ({ submissionId, currentUserType, currentUserId, recipientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatChannel = useRef(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();

    return () => {
      if (chatChannel.current) {
        supabase.removeChannel(chatChannel.current);
      }
    };
  }, [submissionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('message')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      if (data && data.length > 0) {
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    chatChannel.current = supabase
      .channel(`submission:${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `submission_id=eq.${submissionId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (payload.new.sender_type !== currentUserType) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('message')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('submission_id', submissionId)
        .eq('read', false)
        .neq('sender_type', currentUserType);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const { error } = await supabase.from('message').insert({
        submission_id: submissionId,
        sender_type: currentUserType,
        sender_id: currentUserId,
        content: newMessage.trim()
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
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

  const getSenderLabel = (senderType) => {
    const labels = {
      client: 'You',
      notary: recipientName || 'Notary',
      admin: 'Admin'
    };

    if (senderType === currentUserType) {
      return 'You';
    }

    return labels[senderType] || senderType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-[#F3F4F6] px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mr-3">
            <Icon icon="heroicons:chat-bubble-left-right" className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {recipientName ? `Chat with ${recipientName}` : 'Messages'}
            </h3>
            <p className="text-xs text-gray-600">{messages.length} messages</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="heroicons:chat-bubble-left-right" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_type === currentUserType;

            return (
              <div
                key={message.message_id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] ${
                    isOwnMessage
                      ? 'bg-black text-white'
                      : 'bg-[#F3F4F6] text-gray-900'
                  } rounded-2xl px-4 py-3`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`text-xs font-semibold ${
                        isOwnMessage ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {getSenderLabel(message.sender_type)}
                    </p>
                    <p
                      className={`text-xs ml-3 ${
                        isOwnMessage ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="bg-[#F3F4F6] px-6 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-glassy px-6 py-3 text-white font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Icon icon="heroicons:paper-airplane" className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
