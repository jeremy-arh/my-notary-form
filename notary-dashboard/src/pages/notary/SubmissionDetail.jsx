import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Chat from '../../components/Chat';
import SignatoriesList from '../../components/SignatoriesList';
import DocumentViewer from '../../components/DocumentViewer';
import { supabase } from '../../lib/supabase';
import { convertTimeToNotaryTimezone } from '../../utils/timezoneConverter';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, ConfirmComponent } = useConfirm();
  const [submission, setSubmission] = useState(null);
  const [notaryId, setNotaryId] = useState(null);
  const [notaryTimezone, setNotaryTimezone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [documents, setDocuments] = useState([]);
  const [notarizedFiles, setNotarizedFiles] = useState([]);
  const [fileComments, setFileComments] = useState({});
  const [signatories, setSignatories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isUnassigned, setIsUnassigned] = useState(false);
  const [newComment, setNewComment] = useState({});

  useEffect(() => {
    fetchNotaryInfo();
  }, []);

  useEffect(() => {
    if (notaryId) {
      fetchSubmissionDetail();
    }
  }, [id, notaryId]);

  const fetchNotaryInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: notary, error } = await supabase
        .from('notary')
        .select('id, timezone')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching notary info:', error);
        setLoading(false);
        return;
      }
      
      if (notary) {
        setNotaryId(notary.id);
        setNotaryTimezone(notary.timezone || 'UTC');
      } else {
        console.error('Notary not found for user');
        setLoading(false);
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching notary info:', error);
      setLoading(false);
    }
  };

  const fetchSubmissionDetail = async () => {
    if (!notaryId) {
      console.error('Notary ID not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, try to get the submission assigned to this notary
      let { data: submissionData, error: submissionError } = await supabase
        .from('submission')
        .select('*')
        .eq('id', id)
        .eq('assigned_notary_id', notaryId)
        .single();

      // If not found, check if submission exists but is not assigned
      if (submissionError && submissionError.code === 'PGRST116') {
        const { data: unassignedSubmission, error: unassignedError } = await supabase
          .from('submission')
          .select('*')
          .eq('id', id)
          .single();

        if (unassignedError) {
          throw new Error('Submission not found');
        }

        if (unassignedSubmission && !unassignedSubmission.assigned_notary_id) {
          // Submission exists but is not assigned - allow viewing for acceptance
          submissionData = unassignedSubmission;
          submissionError = null;
          setIsUnassigned(true);
        } else {
          throw new Error('This submission is assigned to another notary');
        }
      }

      if (submissionError) throw submissionError;
      
      if (!submissionData) {
        throw new Error('Submission not found');
      }

      setSubmission(submissionData);

      // Fetch documents
      const { data: docsData } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', id);

      setDocuments(docsData || []);

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*');

      const sMap = {};
      if (servicesData) {
        servicesData.forEach(service => {
          sMap[service.service_id] = service;
        });
      }
      setServicesMap(sMap);

      // Fetch options
      const { data: optionsData } = await supabase
        .from('options')
        .select('*');

      const oMap = {};
      if (optionsData) {
        optionsData.forEach(option => {
          oMap[option.option_id] = option;
        });
      }
      setOptionsMap(oMap);

      // Fetch notarized files
      const { data: notarizedFilesData, error: notarizedFilesError } = await supabase
        .from('notarized_files')
        .select('*')
        .eq('submission_id', id)
        .order('uploaded_at', { ascending: false });

      if (!notarizedFilesError && notarizedFilesData) {
        setNotarizedFiles(notarizedFilesData || []);
        
        // Fetch comments for each file
        const fileIds = (notarizedFilesData || []).map(f => f.id);
        if (fileIds.length > 0) {
          const { data: commentsData, error: commentsError } = await supabase
            .from('file_comments')
            .select('*')
            .in('file_id', fileIds)
            .order('created_at', { ascending: true });

          if (!commentsError && commentsData) {
            const commentsMap = {};
            commentsData.forEach(comment => {
              if (!commentsMap[comment.file_id]) {
                commentsMap[comment.file_id] = [];
              }
              commentsMap[comment.file_id].push(comment);
            });
            setFileComments(commentsMap);
          }
        }
      }

      // Fetch signatories
      const { data: signatoriesData, error: signatoriesError } = await supabase
        .from('signatories')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: true });

      if (!signatoriesError && signatoriesData) {
        setSignatories(signatoriesData || []);
      }
    } catch (error) {
      console.error('Error fetching submission detail:', error);
      const errorMessage = error.message || 'Error loading submission details';
      toast.error(errorMessage);
      setLoading(false);
      // Don't navigate immediately, let user see the error
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (publicUrl, fileName) => {
    try {
      const response = await fetch(publicUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pending'
      },
      confirmed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Confirmed'
      },
      completed: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Completed'
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Cancelled'
      }
    };

    const config = statusConfig[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status?.replace('_', ' ') || 'Unknown'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const updateStatus = async (newStatus) => {
    try {
      // Check if trying to mark as completed before appointment date
      if (newStatus === 'completed') {
        const appointmentDate = new Date(submission.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate > today) {
          toast.warning('You cannot mark this submission as completed before the appointment date.');
          return;
        }
      }

      const { error } = await supabase
        .from('submission')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setSubmission({ ...submission, status: newStatus });
      toast.success('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAcceptSubmission = async () => {
    try {
      // Check if submission is still available
      const { data: checkSubmission, error: checkError } = await supabase
        .from('submission')
        .select('assigned_notary_id')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;

      if (checkSubmission.assigned_notary_id) {
        toast.warning('This submission has already been accepted by another notary.');
        navigate('/dashboard');
        return;
      }

      // Assign to this notary
      const { error } = await supabase
        .from('submission')
        .update({ 
          assigned_notary_id: notaryId,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Submission accepted successfully!');
      setIsUnassigned(false);
      setSubmission({ ...submission, assigned_notary_id: notaryId, status: 'confirmed' });
    } catch (error) {
      console.error('Error accepting submission:', error);
      toast.error(`Failed to accept submission: ${error.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !notaryId) return;

    setUploading(true);

    try {
      for (const file of files) {
        // Generate unique file name
        const timestamp = Date.now();
        const fileName = `notarized/${id}/${timestamp}_${file.name}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submission-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('submission-documents')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { data: fileData, error: fileError } = await supabase
          .from('notarized_files')
          .insert({
            submission_id: id,
            notary_id: notaryId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            storage_path: fileName
          })
          .select()
          .single();

        if (fileError) {
          console.error('Error saving file metadata:', fileError);
          toast.error(`Failed to save file metadata for ${file.name}: ${fileError.message}`);
          continue;
        }

        // Add to local state
        setNotarizedFiles(prev => [fileData, ...prev]);

        // Create notification for client
        try {
          // Get client_id from submission and fetch client user_id
          const clientId = submission.client_id;
          if (clientId) {
            // Fetch client to get user_id
            const { data: clientData, error: clientError } = await supabase
              .from('client')
              .select('user_id, id')
              .eq('id', clientId)
              .single();

            if (!clientError && clientData) {
              // Get client email and name
              const { data: clientInfo, error: clientInfoError } = await supabase
                .from('client')
                .select('email, first_name, last_name')
                .eq('id', clientId)
                .single();

              if (!clientInfoError && clientInfo && clientInfo.email) {
                const clientName = `${clientInfo.first_name || ''} ${clientInfo.last_name || ''}`.trim() || 'Client';
                const submissionNumber = id.substring(0, 8);

                // Send transactional email
                const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');
                await sendTransactionalEmail(supabase, {
                  email_type: 'notarized_file_uploaded',
                  recipient_email: clientInfo.email,
                  recipient_name: clientName,
                  recipient_type: 'client',
                  data: {
                    submission_id: id,
                    submission_number: submissionNumber,
                    file_name: file.name,
                    file_url: fileData.file_url
                  }
                });

                // Also create notification (for in-app notifications)
                try {
                  await supabase.rpc('create_notification', {
                    p_user_id: clientData.id,
                    p_user_type: 'client',
                    p_title: 'New Notarized Document',
                    p_message: `A new notarized document "${file.name}" has been uploaded for your submission.`,
                    p_type: 'success',
                    p_action_type: 'notarized_file_uploaded',
                    p_action_data: JSON.stringify({
                      submission_id: id,
                      file_id: fileData.id,
                      file_name: file.name
                    }),
                    p_send_email: false
                  });
                } catch (notifError) {
                  console.error('Error creating notification:', notifError);
                }
              }
            }
          }
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      toast.success('Files uploaded successfully!');
      
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async (fileId) => {
    const comment = newComment[fileId]?.trim();
    if (!comment || !notaryId) return;

    try {
      const { data: commentData, error: commentError } = await supabase
        .from('file_comments')
        .insert({
          file_id: fileId,
          submission_id: id,
          commenter_type: 'notary',
          commenter_id: notaryId,
          comment: comment
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Add to local state
      setFileComments(prev => ({
        ...prev,
        [fileId]: [...(prev[fileId] || []), commentData]
      }));

      // Clear comment input
      setNewComment(prev => ({
        ...prev,
        [fileId]: ''
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    }
  };

  const handleDeleteFile = async (fileId, storagePath) => {
    const confirmed = await confirm({
      title: 'Delete File',
      message: 'Are you sure you want to delete this file? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('submission-documents')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete file from database (comments will be deleted automatically due to ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('notarized_files')
        .delete()
        .eq('id', fileId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setNotarizedFiles(prev => prev.filter(file => file.id !== fileId));
      
      // Remove comments from local state
      setFileComments(prev => {
        const newComments = { ...prev };
        delete newComments[fileId];
        return newComments;
      });

      // Remove comment input from local state
      setNewComment(prev => {
        const newComment = { ...prev };
        delete newComment[fileId];
        return newComment;
      });

      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(`Failed to delete file: ${error.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <Icon icon="heroicons:exclamation-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-900 text-lg font-semibold mb-2">Submission not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-glassy px-6 py-2 text-white font-semibold rounded-full"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const selectedServices = submission.data?.selectedServices || [];
  const serviceDocuments = submission.data?.serviceDocuments || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <ConfirmComponent />
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-sm sm:text-base text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <Icon icon="heroicons:arrow-left" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Submission Details</h1>
            <p className="text-xs sm:text-base text-gray-600">Submitted on {formatDate(submission.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {isUnassigned ? (
              <button
                onClick={handleAcceptSubmission}
                className="btn-glassy px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center w-full sm:w-auto justify-center"
              >
                <Icon icon="heroicons:check" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Accept Submission
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {getStatusBadge(submission.status)}
                {submission.status !== 'completed' && (() => {
                  // Check if appointment date has passed
                  const appointmentDate = new Date(submission.appointment_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  appointmentDate.setHours(0, 0, 0, 0);
                  const canComplete = appointmentDate <= today;
                  
                  return (
                    <button
                      onClick={() => updateStatus('completed')}
                      disabled={!canComplete}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${
                        canComplete
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={canComplete ? "Mark appointment as completed" : "Cannot mark as completed before appointment date"}
                    >
                      <Icon icon="heroicons:check-circle" className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Mark as Completed</span>
                      <span className="sm:hidden">Complete</span>
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Tabs */}
          <div className="flex space-x-4 sm:space-x-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'details' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'documents' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Services & Documents
              {activeTab === 'documents' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('signatories')}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'signatories' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Signatories
              {activeTab === 'signatories' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
            {!isUnassigned && (
              <button
                onClick={() => setActiveTab('notarized')}
                className={`pb-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'notarized' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notarized Files
                {activeTab === 'notarized' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            )}
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Client Information (without email/phone) */}
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Client Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{submission.first_name} {submission.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold text-gray-900">{submission.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-semibold text-gray-900">{submission.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Postal Code</p>
                    <p className="font-semibold text-gray-900">{submission.postal_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Country</p>
                    <p className="font-semibold text-gray-900">{submission.country}</p>
                  </div>
                </div>
              </div>

              {/* Appointment */}
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Appointment</h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Date:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{formatDate(submission.appointment_date)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Your timezone:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">
                      {convertTimeToNotaryTimezone(
                        submission.appointment_time, 
                        submission.appointment_date, 
                        submission.timezone || 'America/New_York', 
                        notaryTimezone || 'UTC'
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Client timezone:</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">
                      {submission.appointment_time && submission.timezone
                        ? (() => {
                            const [hours, minutes] = submission.appointment_time.split(':').map(Number);
                            const hour = parseInt(hours);
                            const period = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                            return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
                          })()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {submission.notes && (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Notes</h2>
                  <p className="text-sm sm:text-base text-gray-700">{submission.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Services & Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4 sm:space-y-6">
              {selectedServices.length > 0 && (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <Icon icon="heroicons:check-badge" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </div>
                    <span className="text-base sm:text-xl">Services & Documents</span>
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {selectedServices.map((serviceId) => {
                      const service = servicesMap[serviceId];
                      const documents = serviceDocuments[serviceId] || [];

                      if (!service) return null;

                      return (
                        <div key={serviceId} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-gray-900">{service.name}</h3>
                              <p className="text-xs sm:text-sm text-gray-700 mt-1 sm:mt-2">
                                {documents.length} document{documents.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Documents for this service */}
                          {documents.length > 0 && (
                            <div className="mt-3 sm:mt-4 space-y-2 pl-3 sm:pl-4 border-l-2 border-gray-200">
                              {documents.map((doc, index) => {
                                const docOptions = doc.selectedOptions || [];

                                return (
                                  <div key={index} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <Icon icon="heroicons:document-text" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 mr-2 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{doc.name}</p>
                                          <p className="text-[10px] sm:text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                      </div>
                                      {doc.public_url && (
                                        <div className="flex items-center gap-1">
                                          <DocumentViewer
                                            fileUrl={doc.public_url}
                                            fileName={doc.name}
                                            fileType={doc.type}
                                            fileSize={doc.size}
                                          />
                                          <button
                                            onClick={() => downloadDocument(doc.public_url, doc.name)}
                                            className="ml-2 text-black hover:text-gray-700 font-medium text-[10px] sm:text-xs flex items-center flex-shrink-0"
                                            title="Télécharger"
                                          >
                                            <Icon icon="heroicons:arrow-down-tray" className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                            <span className="hidden sm:inline">Download</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Options for this document */}
                                    {docOptions.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Options:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {docOptions.map((optionId) => {
                                            const option = optionsMap[optionId];
                                            if (!option) return null;

                                            return (
                                              <span
                                                key={optionId}
                                                className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800"
                                              >
                                                <Icon icon={option.icon || "heroicons:plus-circle"} className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                                <span className="truncate max-w-[100px] sm:max-w-none">{option.name}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Signatories Tab */}
          {activeTab === 'signatories' && (() => {
            // Get signatories from database (if payment completed) or from submission.data (if not yet paid)
            const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
            const hasSignatoriesInDB = signatories.length > 0;
            const hasSignatoriesInData = Object.keys(signatoriesFromData).length > 0 && 
              Object.values(signatoriesFromData).some(sigs => sigs && sigs.length > 0);

            if (!hasSignatoriesInDB && !hasSignatoriesInData) {
              return (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </div>
                    <span className="text-base sm:text-xl">Signatories</span>
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">No signatories added for this submission.</p>
                </div>
              );
            }

            // Convert database signatories to the format expected by SignatoriesList
            const signatoriesByDoc = {};
            const serviceDocuments = submission?.data?.serviceDocuments || {};
            const selectedServices = submission?.data?.selectedServices || [];
            
            if (hasSignatoriesInDB) {
              // Use database signatories (after payment)
              signatories.forEach(sig => {
                if (!signatoriesByDoc[sig.document_key]) {
                  signatoriesByDoc[sig.document_key] = [];
                }
                signatoriesByDoc[sig.document_key].push({
                  first_name: sig.first_name,
                  last_name: sig.last_name,
                  birth_date: sig.birth_date,
                  birth_city: sig.birth_city,
                  postal_address: sig.postal_address
                });
              });
            } else {
              // Use signatories from submission.data (before payment)
              Object.entries(signatoriesFromData).forEach(([docKey, sigs]) => {
                if (sigs && sigs.length > 0) {
                  signatoriesByDoc[docKey] = sigs.map(sig => ({
                    first_name: sig.firstName || sig.first_name,
                    last_name: sig.lastName || sig.last_name,
                    birth_date: sig.birthDate || sig.birth_date,
                    birth_city: sig.birthCity || sig.birth_city,
                    postal_address: sig.postalAddress || sig.postal_address
                  }));
                }
              });
            }

            if (Object.keys(signatoriesByDoc).length === 0) {
              return (
                <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </div>
                    <span className="text-base sm:text-xl">Signatories</span>
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">No signatories added for this submission.</p>
                </div>
              );
            }

            return (
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <Icon icon="heroicons:user-group" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="text-base sm:text-xl">Signatories</span>
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {Object.entries(signatoriesByDoc).map(([docKey, docSignatories]) => {
                    // Extract serviceId and docIndex from docKey (format: "serviceId_docIndex")
                    const [serviceId, docIndex] = docKey.split('_');
                    const documents = serviceDocuments[serviceId] || [];
                    const document = documents[parseInt(docIndex)] || {};
                    const documentName = document.name || `Document ${parseInt(docIndex) + 1}`;

                    return (
                      <SignatoriesList
                        key={docKey}
                        signatories={docSignatories}
                        documentKey={docKey}
                        documentName={documentName}
                        showPrices={false}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Notarized Files Tab */}
          {activeTab === 'notarized' && !isUnassigned && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Notarized Files</h2>
                
                {/* Upload Section */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Upload Notarized Documents
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-black p-2"
                  />
                  {uploading && (
                    <p className="text-sm text-gray-600 mt-2">Uploading files...</p>
                  )}
                </div>

                {/* Files List */}
                {notarizedFiles.length === 0 ? (
                  <p className="text-sm sm:text-base text-gray-600">No notarized files uploaded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {notarizedFiles.map((file) => (
                      <div key={file.id} className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start flex-1 min-w-0">
                            <Icon icon="heroicons:document-text" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mr-3 flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-1">{file.file_name}</h3>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {formatFileSize(file.file_size)} • Uploaded on {formatDate(file.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <DocumentViewer
                              fileUrl={file.file_url}
                              fileName={file.file_name}
                              fileType={file.file_type}
                              fileSize={file.file_size}
                            />
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 text-xs sm:text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center flex-shrink-0"
                              title="Télécharger"
                            >
                              <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-2" />
                              Download
                            </a>
                            <button
                              onClick={() => handleDeleteFile(file.id, file.storage_path)}
                              className="px-3 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center flex-shrink-0"
                              title="Delete file"
                            >
                              <Icon icon="heroicons:trash" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Comments</h4>
                          
                          {/* Existing Comments */}
                          {fileComments[file.id] && fileComments[file.id].length > 0 && (
                            <div className="space-y-3 mb-4">
                              {fileComments[file.id].map((comment) => (
                                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-900 capitalize">
                                      {comment.commenter_type}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{comment.comment}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newComment[file.id] || ''}
                              onChange={(e) => setNewComment(prev => ({
                                ...prev,
                                [file.id]: e.target.value
                              }))}
                              placeholder="Add a comment..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(file.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleAddComment(file.id)}
                              className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Chat */}
        {!isUnassigned && (
          <div className="lg:col-span-1">
            <div className="bg-[#F3F4F6] rounded-2xl p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Messages</h2>
              {notaryId && (
                <Chat
                  submissionId={id}
                  currentUserType="notary"
                  currentUserId={notaryId}
                  recipientName={`${submission.first_name} ${submission.last_name}`}
                  clientFirstName={submission.first_name}
                  clientLastName={submission.last_name}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionDetail;

