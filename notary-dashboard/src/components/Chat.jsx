import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../lib/supabase';
import { playNotificationSoundIfNeeded } from '../utils/soundNotification';
import { useToast } from '../contexts/ToastContext';
import MessageEditor from './MessageEditor';

const Chat = ({ submissionId, currentUserType, currentUserId, recipientName, clientFirstName, clientLastName, isFullscreen = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const messagesEndRef = useRef(null);
  const chatChannel = useRef(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);

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
    if (showEmojiPicker) {
      const handleClickOutside = (event) => {
        if (emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
          const emojiPicker = document.querySelector('.emoji-picker-container');
          if (emojiPicker && !emojiPicker.contains(event.target)) {
            setShowEmojiPicker(false);
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to extract plain text from HTML
  const getPlainText = (html) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
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

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${submissionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message',
        filter: `submission_id=eq.${submissionId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
          
          // Play notification sound if message is not from current user
          if (newMessage.sender_type !== currentUserType) {
            markMessagesAsRead();
            // Check if user is on messages page (we assume they are if Chat component is mounted)
            // For notary dashboard, we'll play sound if not viewing this specific conversation
            const isViewingMessages = window.location.pathname.includes('/messages');
            playNotificationSoundIfNeeded(!isViewingMessages);
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.message_id === payload.new.message_id ? payload.new : m));
        }
      })
      .subscribe();

    chatChannel.current = channel;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toast = useToast();
  
  const sendMessage = async () => {
    const plainText = getPlainText(newMessage);
    if (!plainText.trim() && attachments.length === 0) return;
    if (!currentUserId) {
      toast.error('User ID not available');
      return;
    }

    setSending(true);
    const messageContent = newMessage.trim() || '(File attachment)';

    try {
      const { error } = await supabase
        .from('message')
        .insert({
          submission_id: submissionId,
          sender_type: currentUserType,
          sender_id: currentUserId,
          content: messageContent,
          attachments: attachments.length > 0 ? attachments : [],
          read: false
        });

      if (error) throw error;

      console.log('✅ Message sent successfully, now sending email notifications...');

      // Send email notification to recipients (client and admin)
      try {
        // Get submission info
        const { data: submissionData, error: subError } = await supabase
          .from('submission')
          .select('id, client_id, first_name, last_name')
          .eq('id', submissionId)
          .single();

        if (!subError && submissionData) {
          const submissionNumber = submissionId.substring(0, 8);
          const plainTextPreview = getPlainText(messageContent);
          const messagePreview = plainTextPreview.length > 100 
            ? plainTextPreview.substring(0, 100) + '...' 
            : plainTextPreview;

          const { sendTransactionalEmail } = await import('../utils/sendTransactionalEmail');

          // Prepare email promises for parallel sending
          const emailPromises = [];

          // Notify client
          if (submissionData.client_id) {
            const { data: clientData, error: clientError } = await supabase
              .from('client')
              .select('email, first_name, last_name')
              .eq('id', submissionData.client_id)
              .single();

            if (!clientError && clientData && clientData.email) {
              const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
              emailPromises.push(
                sendTransactionalEmail(supabase, {
                  email_type: 'message_received',
                  recipient_email: clientData.email,
                  recipient_name: clientName,
                  recipient_type: 'client',
                  data: {
                    submission_id: submissionId,
                    submission_number: submissionNumber,
                    message_preview: messagePreview
                  }
                }).catch(err => {
                  console.error(`Error sending email to client ${clientData.email}:`, err);
                  return { success: false, error: err.message };
                })
              );
            }
          }

          // Notify all admins
          const { data: adminData, error: adminError } = await supabase
            .from('admin_user')
            .select('email, first_name, last_name');

          if (!adminError && adminData && adminData.length > 0) {
            for (const admin of adminData) {
              if (admin.email) {
                const adminName = `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin';
                emailPromises.push(
                  sendTransactionalEmail(supabase, {
                    email_type: 'message_received',
                    recipient_email: admin.email,
                    recipient_name: adminName,
                    recipient_type: 'admin',
                    data: {
                      submission_id: submissionId,
                      submission_number: submissionNumber,
                      message_preview: messagePreview
                    }
                  }).catch(err => {
                    console.error(`Error sending email to admin ${admin.email}:`, err);
                    return { success: false, error: err.message };
                  })
                );
              }
            }
          }

          // Send all emails in parallel
          if (emailPromises.length > 0) {
            const results = await Promise.all(emailPromises);
            let successCount = 0;
            let failCount = 0;
            
            results.forEach((result, index) => {
              if (result && !result.success) {
                console.error(`❌ Failed to send email ${index + 1}:`, result.error);
                failCount++;
              } else if (result && result.success) {
                console.log(`✅ Email sent successfully ${index + 1}`);
                successCount++;
              }
            });
            
            if (failCount > 0) {
              console.warn(`⚠️ ${failCount} email(s) failed to send out of ${emailPromises.length}`);
              toast.error(`${failCount} email(s) n'ont pas pu être envoyés`);
            } else if (successCount > 0) {
              console.log(`✅ All ${successCount} email(s) sent successfully`);
            }
          } else {
            console.warn('⚠️ No email recipients found for message notification');
          }
        } else {
          console.warn('⚠️ Could not fetch submission data for email notification');
        }
      } catch (emailError) {
        console.error('❌ Error sending message email notification:', emailError);
        console.error('❌ Error details:', emailError.message, emailError.stack);
        // Don't block message sending if email fails
      }

      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);

    try {
      const uploadedAttachments = [];

      for (const file of files) {
        const fileName = `${submissionId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submission-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('submission-documents')
          .getPublicUrl(fileName);

        uploadedAttachments.push({
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type
        });
      }

      setAttachments(prev => [...prev, ...uploadedAttachments]);
    } catch (error) {
      console.error('Error handling files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
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

  const getSenderLabel = (senderType) => {
    if (senderType === currentUserType) {
      return 'You';
    }

    if (senderType === 'notary') {
      return 'Notary';
    }

    if (senderType === 'admin') {
      return 'Admin';
    }

    if (senderType === 'client') {
      // Show client name for client messages
      if (clientFirstName && clientLastName) {
        return `${clientFirstName} ${clientLastName}`;
      }
      return 'Client';
    }

    return senderType;
  };

  const renderMessageContent = (content) => {
    if (!content) return '';
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleEmojiButtonClick = () => {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      const pickerHeight = 435;
      const pickerWidth = 352;
      const margin = 8;
      
      let top = rect.top - pickerHeight - margin;
      let left = rect.right - pickerWidth;
      
      if (top < 0) {
        top = rect.bottom + margin;
      }
      
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - margin;
      }
      
      if (left < 0) {
        left = margin;
      }
      
      setEmojiPickerPosition({ top, left });
    }
    setShowEmojiPicker(!showEmojiPicker);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const containerClass = isFullscreen 
    ? "flex flex-col h-full bg-white overflow-hidden"
    : "flex flex-col h-full min-h-[500px] max-h-[600px] lg:h-[600px] bg-white rounded-xl";

  return (
    <div className={containerClass}>
      {/* Messages */}
      <div className={`flex-1 overflow-y-auto space-y-3 sm:space-y-4 ${isFullscreen ? 'p-4 sm:p-6' : 'p-3 sm:p-4'}`}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isNotary = message.sender_type === 'notary';
            const isClient = message.sender_type === 'client';
            const isAdmin = message.sender_type === 'admin';
            const isOwnMessage = message.sender_type === currentUserType;

            // Determine message bubble color
            let bubbleClass = 'bg-gray-100 text-gray-900'; // Default for client
            if (isNotary) {
              bubbleClass = 'bg-indigo-600 text-white'; // Distinct color for notary
            } else if (isAdmin) {
              bubbleClass = 'bg-black text-white'; // Black for admin
            }

            return (
              <div
                key={message.message_id}
                className={`flex ${isNotary ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${bubbleClass} rounded-xl p-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`text-xs font-semibold ${
                        isNotary ? 'text-indigo-100' : 
                        isAdmin ? 'text-gray-300' : 
                        'text-gray-600'
                      }`}
                    >
                      {getSenderLabel(message.sender_type)}
                    </p>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs ${
                          isNotary ? 'text-indigo-200' : 
                          isAdmin ? 'text-gray-400' : 
                          'text-gray-500'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                      {isNotary && (
                        <Icon
                          icon={message.read ? "heroicons:check-circle" : "heroicons:check"}
                          className={`w-4 h-4 ${
                            message.read ? 'text-blue-400' : 'text-gray-400'
                          }`}
                          title={message.read ? 'Message lu' : 'Message envoyé'}
                        />
                      )}
                    </div>
                  </div>
                  <div 
                    className={`text-sm break-words prose prose-sm max-w-none ${
                      isNotary || isAdmin ? 'prose-invert' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: message.content }}
                    style={{
                      color: isNotary || isAdmin ? 'white' : '#111827'
                    }}
                  />
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block text-xs underline ${
                            isNotary ? 'text-indigo-200' : 
                            isAdmin ? 'text-blue-300' : 
                            'text-blue-600'
                          }`}
                        >
                          📎 {att.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className={`py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 ${isFullscreen ? 'px-4 sm:px-6' : 'px-4'}`}>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, index) => (
              <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <Icon icon="heroicons:paper-clip" className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{att.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Icon icon="heroicons:x-mark" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`border-t border-gray-200 flex-shrink-0 ${isFullscreen ? 'px-4 sm:px-6 py-4' : 'p-3 sm:p-4'}`}>
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            ref={emojiButtonRef}
            type="button"
            onClick={handleEmojiButtonClick}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
            title="Add emoji"
          >
            <Icon icon="heroicons:face-smile" className="w-5 h-5" />
          </button>
          
          {showEmojiPicker && createPortal(
            <div
              className="emoji-picker-container fixed z-[9999] shadow-2xl rounded-lg overflow-hidden bg-white"
              style={{
                top: `${emojiPickerPosition.top}px`,
                left: `${emojiPickerPosition.left}px`,
                width: '352px',
                height: '435px'
              }}
            >
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                width={352}
                height={435}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
              />
            </div>,
            document.body
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 flex-shrink-0"
            title="Attach file"
          >
            {uploadingFiles ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <Icon icon="heroicons:paper-clip" className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <MessageEditor
              value={newMessage}
              onChange={setNewMessage}
              placeholder="Type a message..."
              disabled={sending}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={sending || (!getPlainText(newMessage).trim() && attachments.length === 0)}
            className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Envoyer"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Icon icon="heroicons:paper-airplane" className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

