import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { playNotificationSoundIfNeeded } from '../../utils/soundNotification';
import MessageEditor from './MessageEditor';

/**
 * Reusable Chat component for messaging between clients, notaries, and admins
 *
 * @param {string} submissionId - The submission ID for this conversation
 * @param {string} currentUserType - Type of current user: 'client', 'notary', or 'admin'
 * @param {string} currentUserId - ID of the current user
 * @param {string} recipientName - Name of the person you're chatting with (optional)
 * @param {string} clientFirstName - First name of the client (optional)
 * @param {string} clientLastName - Last name of the client (optional)
 * @param {boolean} isFullscreen - Whether the chat should take full height (optional)
 */
const Chat = ({ submissionId, currentUserType, currentUserId, recipientName, clientFirstName, clientLastName, isFullscreen = false }) => {
  const toast = useToast();
  const [clientInfo, setClientInfo] = useState(null);
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
    fetchClientInfo();
    fetchMessages();
    subscribeToMessages();

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

  const fetchClientInfo = async () => {
    try {
      const { data: submission } = await supabase
        .from('submission')
        .select(`
          *,
          client:client_id(id, first_name, last_name, email)
        `)
        .eq('id', submissionId)
        .single();

      if (submission?.client) {
        setClientInfo(submission.client);
      } else if (submission) {
        // Fallback to submission fields
        setClientInfo({
          first_name: submission.first_name,
          last_name: submission.last_name,
          email: submission.email
        });
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
    }
  };

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
            const isViewingMessages = window.location.pathname.includes('/messages');
            playNotificationSoundIfNeeded(!isViewingMessages);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    const plainText = getPlainText(newMessage);
    if ((!plainText.trim() && attachments.length === 0) || sending) return;

    if (!currentUserId) {
      console.error('No currentUserId provided');
      toast.error('Error: Missing user ID. Please refresh the page.');
      return;
    }

    setSending(true);
    const messageContent = newMessage.trim() || '(File attachment)';

    try {
      const { data, error } = await supabase.from('message').insert({
        submission_id: submissionId,
        sender_type: currentUserType,
        sender_id: currentUserId,
        content: messageContent,
        attachments: attachments.length > 0 ? attachments : null
      }).select();

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      console.log('✅ Message sent successfully, now sending email notifications...');

      // Send email notification to recipients (client, notary, and admins)
      try {
        // Get submission info
        console.log('📧 Fetching submission data for email notification, submissionId:', submissionId);
        const { data: submissionData, error: subError } = await supabase
          .from('submission')
          .select('id, client_id, assigned_notary_id, first_name, last_name, email')
          .eq('id', submissionId)
          .single();

        if (subError) {
          console.error('❌ Error fetching submission data:', subError);
        }

        if (!subError && submissionData) {
          console.log('✅ Submission data fetched:', {
            id: submissionData.id,
            client_id: submissionData.client_id,
            assigned_notary_id: submissionData.assigned_notary_id
          });

          const submissionNumber = submissionId.substring(0, 8);
          const plainTextPreview = getPlainText(messageContent);
          const messagePreview = plainTextPreview.length > 100 
            ? plainTextPreview.substring(0, 100) + '...' 
            : plainTextPreview;

          const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');

          // Prepare email promises for parallel sending
          const emailPromises = [];

          // Notify client
          let clientEmail = null;
          let clientName = 'Client';

          if (submissionData.client_id) {
            console.log('📧 Fetching client data, client_id:', submissionData.client_id);
            const { data: clientData, error: clientError } = await supabase
              .from('client')
              .select('email, first_name, last_name')
              .eq('id', submissionData.client_id)
              .single();

            if (clientError) {
              console.error('❌ Error fetching client data:', clientError);
            }

            if (!clientError && clientData) {
              console.log('✅ Client data fetched:', {
                email: clientData.email,
                first_name: clientData.first_name,
                last_name: clientData.last_name
              });

              if (clientData.email) {
                clientEmail = clientData.email;
                clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
              }
            }
          }

          // Fallback: use email from submission if no client_id
          if (!clientEmail && submissionData.email) {
            console.log('📧 Using email from submission directly:', submissionData.email);
            clientEmail = submissionData.email;
            clientName = `${submissionData.first_name || ''} ${submissionData.last_name || ''}`.trim() || 'Client';
          }

          if (clientEmail) {
            console.log('📧 Adding client to email queue:', clientEmail);
            emailPromises.push(
              sendTransactionalEmail(supabase, {
                email_type: 'message_received',
                recipient_email: clientEmail,
                recipient_name: clientName,
                recipient_type: 'client',
                data: {
                  submission_id: submissionId,
                  submission_number: submissionNumber,
                  message_preview: messagePreview
                }
              }).catch(err => {
                console.error(`❌ Error sending email to client ${clientEmail}:`, err);
                return { success: false, error: err.message };
              })
            );
          } else {
            console.warn('⚠️ No client email found (neither from client_id nor submission.email)');
          }

          // Notify notary if assigned
          if (submissionData.assigned_notary_id) {
            console.log('📧 Fetching notary data, assigned_notary_id:', submissionData.assigned_notary_id);
            const { data: notaryData, error: notaryError } = await supabase
              .from('notary')
              .select('email, full_name, name')
              .eq('id', submissionData.assigned_notary_id)
              .single();

            if (notaryError) {
              console.error('❌ Error fetching notary data:', notaryError);
            }

            if (!notaryError && notaryData) {
              console.log('✅ Notary data fetched:', {
                email: notaryData.email,
                full_name: notaryData.full_name,
                name: notaryData.name
              });

              if (notaryData.email) {
                const notaryName = notaryData.full_name || notaryData.name || 'Notary';
                console.log('📧 Adding notary to email queue:', notaryData.email);
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
                    console.error(`❌ Error sending email to notary ${notaryData.email}:`, err);
                    return { success: false, error: err.message };
                  })
                );
              } else {
                console.warn('⚠️ Notary data found but no email address');
              }
            } else {
              console.warn('⚠️ No notary data found for assigned_notary_id:', submissionData.assigned_notary_id);
            }
          } else {
            console.warn('⚠️ No assigned_notary_id in submission data');
          }

          // Always notify all admins when a message is sent
          console.log('📧 Fetching all admin users for notification');
          const { data: adminData, error: adminError } = await supabase
            .from('admin_user')
            .select('email, first_name, last_name');

          if (adminError) {
            console.error('❌ Error fetching admin data:', adminError);
          }

          if (!adminError && adminData && adminData.length > 0) {
            console.log(`✅ Found ${adminData.length} admin(s) to notify`);
            for (const admin of adminData) {
              if (admin.email) {
                const adminName = `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin';
                console.log('📧 Adding admin to email queue:', admin.email);
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
                    console.error(`❌ Error sending email to admin ${admin.email}:`, err);
                    return { success: false, error: err.message };
                  })
                );
              }
            }
          } else {
            console.warn('⚠️ No admin users found in database');
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
      const errorMessage = error.message || 'Unknown error';
      toast.error(`Failed to send message: ${errorMessage}. Please check that you have the necessary permissions.`);
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
      const firstName = clientInfo?.first_name || clientFirstName || 'Client';
      const lastName = clientInfo?.last_name || clientLastName || '';
      return `${firstName} ${lastName}`.trim();
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
    : "flex flex-col h-[500px] bg-white rounded-2xl border border-gray-200 overflow-hidden";

  return (
    <div className={containerClass}>
      {/* Chat Header - Only show when not fullscreen */}
      {!isFullscreen && (
        <div className="bg-[#F3F4F6] px-6 py-4 border-b border-gray-200 flex-shrink-0">
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
      )}

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
            const isNotary = message.sender_type === 'notary';
            const isClient = message.sender_type === 'client';
            const messageAttachments = message.attachments || [];

            // Determine message bubble color
            let bubbleClass = 'bg-[#F3F4F6] text-gray-900'; // Default for client
            if (isOwnMessage) {
              bubbleClass = 'bg-black text-white'; // Black for own messages (admin)
            } else if (isNotary) {
              bubbleClass = 'bg-indigo-600 text-white'; // Distinct color for notary
            } else if (isClient) {
              bubbleClass = 'bg-gray-100 text-gray-900'; // Light gray for client
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
                        isOwnMessage || isNotary ? 'prose-invert' : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: message.content }}
                      style={{
                        color: isOwnMessage || isNotary ? 'white' : '#111827'
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
                            'bg-white'
                          }`}
                        >
                          <Icon
                            icon="heroicons:paper-clip"
                            className={`w-4 h-4 ${
                              isOwnMessage || isNotary ? 'text-gray-300' : 'text-gray-600'
                            }`}
                          />
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs flex-1 truncate hover:underline ${
                              isOwnMessage ? 'text-blue-300' : 
                              isNotary ? 'text-indigo-200' : 
                              'text-blue-600'
                            }`}
                          >
                            {attachment.name}
                          </a>
                          <span className={`text-xs ${
                            isOwnMessage || isNotary ? 'text-gray-400' : 'text-gray-500'
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
        <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-gray-200"
              >
                <Icon icon="heroicons:paper-clip" className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-700 truncate max-w-[150px]">
                  {attachment.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon icon="heroicons:x-mark" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="bg-[#F3F4F6] px-6 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {/* File attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles || sending}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
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
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
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
