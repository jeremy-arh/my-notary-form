import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import { playNotificationSoundIfNeeded } from '../utils/soundNotification';
import { useToast } from '../contexts/ToastContext';
import MessageEditor from './MessageEditor';

// Lazy load emoji-picker-react to avoid import errors
const EmojiPicker = lazy(() => 
  import('emoji-picker-react').catch(() => {
    console.warn('emoji-picker-react not available');
    return { default: () => null };
  })
);

/**
 * Reusable Chat component for messaging between clients, notaries, and admins
 *
 * @param {string} submissionId - The submission ID for this conversation
 * @param {string} currentUserType - Type of current user: 'client', 'notary', or 'admin'
 * @param {string} currentUserId - ID of the current user
 * @param {string} recipientName - Name of the person you're chatting with (optional)
 */
const Chat = ({ submissionId, currentUserType, currentUserId, recipientName, isFullscreen = false }) => {
  const toast = useToast();
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

    // Close emoji picker when clicking outside
    const handleClickOutside = (event) => {
      if (emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
        const emojiPicker = document.querySelector('.emoji-picker-container');
        if (emojiPicker && !emojiPicker.contains(event.target)) {
          setShowEmojiPicker(false);
        }
      }
    };

    return () => {
      if (chatChannel.current) {
        supabase.removeChannel(chatChannel.current);
      }
    };
  }, [submissionId]);

  useEffect(() => {
    // Close emoji picker when clicking outside
    const handleClickOutside = (event) => {
      if (emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
        const emojiPicker = document.querySelector('.emoji-picker-container');
        if (emojiPicker && !emojiPicker.contains(event.target)) {
          setShowEmojiPicker(false);
        }
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

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
          const newMessage = payload.new;
          setMessages((prev) => [...prev, newMessage]);
          if (newMessage.sender_type !== currentUserType) {
            markMessagesAsRead();
            // Play notification sound if message is not from current user
            const isViewingChat = window.location.pathname.includes('/submission/');
            playNotificationSoundIfNeeded(!isViewingChat);
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

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);

    try {
      const uploadedAttachments = [];

      for (const file of files) {
        // Generate unique file name
        const timestamp = Date.now();
        const fileName = `messages/${submissionId}/${timestamp}_${file.name}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submission-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('submission-documents')
          .getPublicUrl(fileName);

        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size
        });
      }

      setAttachments((prev) => [...prev, ...uploadedAttachments]);
    } catch (error) {
      console.error('Error handling files:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploadingFiles(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper function to extract plain text from HTML
  const getPlainText = (html) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const plainText = getPlainText(newMessage);
    if ((!plainText.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    const messageContent = newMessage.trim() || '(File attachment)';

    try {
      const { error } = await supabase.from('message').insert({
        submission_id: submissionId,
        sender_type: currentUserType,
        sender_id: currentUserId,
        content: messageContent,
        attachments: attachments.length > 0 ? attachments : null
      });

      if (error) throw error;

      console.log('✅ Message sent successfully, now sending email notifications...');

      // Send email notification to recipients (notary and admin)
      try {
        // Get submission info
        const { data: submissionData, error: subError } = await supabase
          .from('submission')
          .select('id, client_id, assigned_notary_id, first_name, last_name')
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

          // Notify notary if assigned
          if (submissionData.assigned_notary_id) {
            const { data: notaryData, error: notaryError } = await supabase
              .from('notary')
              .select('email, full_name, name')
              .eq('id', submissionData.assigned_notary_id)
              .single();

            if (!notaryError && notaryData && notaryData.email) {
              const notaryName = notaryData.full_name || notaryData.name || 'Notary';
              emailPromises.push(
                sendTransactionalEmail(supabase, {
                  email_type: 'message_received',
                  recipient_email: notaryData.email,
                  recipient_name: notaryName,
                  recipient_type: 'notary',
                  data: {
                    submission_id: submissionId,
                    submission_number: submissionNumber,
                    message_preview: messagePreview
                  }
                }).catch(err => {
                  console.error(`Error sending email to notary ${notaryData.email}:`, err);
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
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
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

  // Function to detect and render links
  const renderContentWithLinks = (content) => {
    if (!content) return null;

    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlPattern);

    return parts.map((part, index) => {
      if (urlPattern.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400 hover:text-blue-300 break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
      
      // Calculate position above the button
      let top = rect.top - pickerHeight - margin;
      let left = rect.right - pickerWidth;
      
      // If not enough space above, show below instead
      if (top < 0) {
        top = rect.bottom + margin;
      }
      
      // Ensure it doesn't go off the right edge
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - margin;
      }
      
      // Ensure it doesn't go off the left edge
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
    : "flex flex-col h-full min-h-[500px] max-h-[600px] lg:h-[500px] bg-white rounded-2xl border border-gray-200 overflow-hidden";

  return (
    <div className={containerClass}>
      {/* Chat Header */}
      {!isFullscreen && (
        <div className="bg-[#F3F4F6] px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Icon icon="heroicons:chat-bubble-left-right" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                {recipientName ? `Chat with ${recipientName}` : 'Messages'}
              </h3>
              <p className="text-xs text-gray-600">{messages.length} messages</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto space-y-3 sm:space-y-4 ${isFullscreen ? 'p-4 sm:p-6' : 'p-3 sm:p-6'}`}>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="heroicons:chat-bubble-left-right" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_type === currentUserType;
            const isNotary = message.sender_type === 'notary';
            const isAdmin = message.sender_type === 'admin';
            const messageAttachments = message.attachments || [];

            // Determine message bubble color
            let bubbleClass = 'bg-[#F3F4F6] text-gray-900'; // Default for client
            if (isOwnMessage) {
              bubbleClass = 'bg-black text-white'; // Black for own messages
            } else if (isNotary) {
              bubbleClass = 'bg-indigo-600 text-white'; // Distinct color for notary
            } else if (isAdmin) {
              bubbleClass = 'bg-gray-800 text-white'; // Dark gray for admin
            }

            return (
              <div
                key={message.message_id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] ${bubbleClass} rounded-2xl px-4 py-3`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`text-xs font-semibold ${
                        isOwnMessage ? 'text-gray-300' : 
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
                          isOwnMessage ? 'text-gray-400' : 
                          isNotary ? 'text-indigo-200' : 
                          isAdmin ? 'text-gray-400' : 
                          'text-gray-500'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                      {isOwnMessage && (
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
                  
                  {/* Message content with formatting */}
                  {message.content && message.content !== '(File attachment)' && (
                    <div 
                      className={`text-sm break-words prose prose-sm max-w-none ${
                        isOwnMessage || isNotary || isAdmin ? 'prose-invert' : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: message.content }}
                      style={{
                        color: isOwnMessage || isNotary || isAdmin ? 'white' : '#111827'
                      }}
                    />
                  )}

                  {/* Attachments */}
                  {messageAttachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {messageAttachments.map((attachment, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            isOwnMessage ? 'bg-gray-800' : 
                            isNotary ? 'bg-indigo-700' : 
                            isAdmin ? 'bg-gray-700' : 
                            'bg-white'
                          }`}
                        >
                          <Icon
                            icon="heroicons:paper-clip"
                            className={`w-4 h-4 ${
                              isOwnMessage || isNotary || isAdmin ? 'text-gray-300' : 'text-gray-600'
                            }`}
                          />
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs flex-1 truncate hover:underline ${
                              isOwnMessage ? 'text-blue-300' : 
                              isNotary ? 'text-indigo-200' : 
                              isAdmin ? 'text-blue-300' : 
                              'text-blue-600'
                            }`}
                          >
                            {attachment.name}
                          </a>
                          <span className={`text-xs ${
                            isOwnMessage || isNotary || isAdmin ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatFileSize(attachment.size)}
                          </span>
                        </div>
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
        <div className={`py-2 bg-gray-50 border-t border-gray-200 flex-shrink-0 ${isFullscreen ? 'px-4 sm:px-6' : 'px-3 sm:px-6'}`}>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-white rounded-lg border border-gray-200"
              >
                <Icon icon="heroicons:paper-clip" className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate max-w-[100px] sm:max-w-[150px]">
                  {attachment.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Icon icon="heroicons:x-mark" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className={`bg-[#F3F4F6] border-t border-gray-200 flex-shrink-0 ${isFullscreen ? 'px-4 sm:px-6 py-4' : 'px-3 sm:px-6 py-3 sm:py-4'}`}>
        <div className="flex items-center gap-2">
          {/* File attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles || sending}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 flex-shrink-0"
            title="Attach file"
          >
            {uploadingFiles ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <Icon icon="heroicons:paper-clip" className="w-5 h-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Emoji picker button */}
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={handleEmojiButtonClick}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
            title="Add emoji"
          >
            <Icon icon="heroicons:face-smile" className="w-5 h-5" />
          </button>
          
          {/* Emoji picker portal */}
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
              <Suspense fallback={<div className="p-4 text-gray-500">Loading emoji picker...</div>}>
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  width={352}
                  height={435}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </Suspense>
            </div>,
            document.body
          )}

          <div className="flex-1 min-w-0">
            <MessageEditor
              value={newMessage}
              onChange={setNewMessage}
              placeholder="Type your message..."
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={(!getPlainText(newMessage).trim() && attachments.length === 0) || sending}
            className="btn-glassy px-4 sm:px-6 py-2 sm:py-3 text-white text-sm sm:text-base font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center flex-shrink-0"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Icon icon="heroicons:paper-airplane" className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
