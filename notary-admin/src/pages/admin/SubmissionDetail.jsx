import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import Chat from '../../components/admin/Chat';
import { supabase } from '../../lib/supabase';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [notaries, setNotaries] = useState([]);
  const [selectedNotaryId, setSelectedNotaryId] = useState('');
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);
  const [notarizedFiles, setNotarizedFiles] = useState([]);
  const [fileComments, setFileComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [editFormData, setEditFormData] = useState({
    appointment_date: '',
    appointment_time: '',
    timezone: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    notes: '',
    selectedServices: [],
    serviceDocuments: {},
    notary_cost: 0
  });
  const [allServices, setAllServices] = useState([]);
  const [allOptions, setAllOptions] = useState([]);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    fetchAdminInfo();
    fetchNotaries();
  }, []);

  useEffect(() => {
    if (adminInfo) {
      fetchSubmissionDetail();
    }
  }, [id, adminInfo]);

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notarized') {
      setActiveTab('notarized');
    }
  }, [searchParams]);

  const fetchAdminInfo = async () => {
    try {
      // Try to get user (may fail with service role key)
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (error) {
        // Silently handle - service role key doesn't have user session
      }

      // Check if admin_user exists
      if (userId) {
        const { data: admin, error } = await supabase
          .from('admin_user')
          .select('id, user_id')
          .eq('user_id', userId)
          .single();

        if (admin) {
          setAdminInfo(admin);
        } else {
          // Create admin_user entry if it doesn't exist
          const { data: newAdmin, error: createError } = await supabase
            .from('admin_user')
            .insert({ user_id: userId })
            .select()
            .single();

          if (createError) {
            console.error('Error creating admin_user:', createError);
          } else {
            setAdminInfo(newAdmin);
          }
        }
      } else {
        // If no user (service role key), create or get a default admin entry
        const { data: existingAdmin } = await supabase
          .from('admin_user')
          .select('id')
          .limit(1)
          .single();

        if (existingAdmin) {
          setAdminInfo(existingAdmin);
        } else {
          // Create a default admin entry (you may need to adjust this)
          const { data: newAdmin } = await supabase
            .from('admin_user')
            .insert({ user_id: null })
            .select()
            .single();

          if (newAdmin) {
            setAdminInfo(newAdmin);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
    }
  };

  const fetchNotaries = async () => {
    try {
      const { data, error } = await supabase
        .from('notary')
        .select('id, full_name, email, is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setNotaries(data || []);
    } catch (error) {
      console.error('Error fetching notaries:', error);
    }
  };

  const fetchSubmissionDetail = async () => {
    try {
      setLoading(true);
      
      let { data: submissionData, error: submissionError } = await supabase
        .from('submission')
        .select(`
          *,
          client:client_id(first_name, last_name),
          notary:assigned_notary_id(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (submissionError) throw submissionError;
      if (!submissionData) throw new Error('Submission not found');

      setSubmission(submissionData);
      setSelectedNotaryId(submissionData.assigned_notary_id || '');

      // Initialize edit form data
      setEditFormData({
        appointment_date: submissionData.appointment_date || '',
        appointment_time: submissionData.appointment_time || '',
        timezone: submissionData.timezone || '',
        first_name: submissionData.first_name || '',
        last_name: submissionData.last_name || '',
        email: submissionData.email || '',
        phone: submissionData.phone || '',
        address: submissionData.address || '',
        city: submissionData.city || '',
        postal_code: submissionData.postal_code || '',
        country: submissionData.country || '',
        notes: submissionData.notes || '',
        selectedServices: submissionData.data?.selectedServices || [],
        serviceDocuments: submissionData.data?.serviceDocuments || {},
        notary_cost: submissionData.notary_cost || 0
      });

      // Fetch documents
      const { data: docsData } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', id);

      setDocuments(docsData || []);

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
        .select('*')
        .eq('is_active', true);

      const oMap = {};
      if (optionsData) {
        optionsData.forEach(option => {
          oMap[option.option_id] = option;
        });
      }
      setOptionsMap(oMap);
      setAllOptions(optionsData || []);

      // Fetch all services for editing
      const { data: allServicesData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      setAllServices(allServicesData || []);

      // Calculate initial price
      const initialPrice = calculatePriceHelper(submissionData.data?.selectedServices || [], submissionData.data?.serviceDocuments || {}, sMap, oMap);
      setCalculatedPrice(initialPrice);
    } catch (error) {
      console.error('Error fetching submission detail:', error);
      alert('Error loading submission details');
      navigate('/submissions');
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
      alert('Failed to download document');
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
      pending_payment: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        label: 'Pending Payment'
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
      const oldStatus = submission.status;
      const { error } = await supabase
        .from('submission')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      // Notifications are automatically created by database trigger, but we can also create them manually if needed
      // The trigger will handle it, but we can add additional notifications here if needed
      
      setSubmission({ ...submission, status: newStatus });
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleAssignNotary = async () => {
    if (!selectedNotaryId) return;

    try {
      const { error } = await supabase
        .from('submission')
        .update({
          assigned_notary_id: selectedNotaryId,
          status: submission.status === 'pending' ? 'confirmed' : submission.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Send email to client about notary assignment
      try {
        // Get client information
        const { data: clientData, error: clientError } = await supabase
          .from('client')
          .select('email, first_name, last_name')
          .eq('id', submission.client_id)
          .single();

        // Get notary information
        const { data: notaryData, error: notaryError } = await supabase
          .from('notary')
          .select('full_name, name')
          .eq('id', selectedNotaryId)
          .single();

        if (!clientError && clientData && clientData.email && !notaryError && notaryData) {
          const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
          const notaryName = notaryData.full_name || notaryData.name || 'Notary';
          const submissionNumber = id.substring(0, 8);

          const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');
          await sendTransactionalEmail(supabase, {
            email_type: 'notary_assigned',
            recipient_email: clientData.email,
            recipient_name: clientName,
            recipient_type: 'client',
            data: {
              submission_id: id,
              submission_number: submissionNumber,
              notary_name: notaryName
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending notary assignment email:', emailError);
        // Don't block the assignment if email fails
      }

      // Refresh submission data
      await fetchSubmissionDetail();
      alert('Notary assigned successfully!');
    } catch (error) {
      console.error('Error assigning notary:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleRemoveNotary = async () => {
    try {
      const { error } = await supabase
        .from('submission')
        .update({
          assigned_notary_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Create notification
      await createNotification(
        submission.client_id,
        'client',
        'Notary Removed',
        'The notary has been removed from your submission.',
        'warning',
        'notary_removed',
        { submission_id: id }
      );

      // Refresh submission data
      await fetchSubmissionDetail();
      alert('Notary removed successfully!');
    } catch (error) {
      console.error('Error removing notary:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Helper function to calculate price (can be called before state is set)
  const calculatePriceHelper = (selectedServices, serviceDocuments, servicesMap, optionsMap) => {
    let total = 0;
    
    selectedServices.forEach(serviceId => {
      const service = servicesMap[serviceId];
      const documents = serviceDocuments[serviceId] || [];
      
      if (service) {
        // Add service cost (base_price × number of documents)
        total += documents.length * (parseFloat(service.base_price) || 0);
        
        // Add options cost
        documents.forEach(doc => {
          if (doc.selectedOptions && doc.selectedOptions.length > 0) {
            doc.selectedOptions.forEach(optionId => {
              const option = optionsMap[optionId];
              if (option) {
                total += parseFloat(option.additional_price) || 0;
              }
            });
          }
        });
      }
    });
    
    return total;
  };

  // Calculate price based on services and options
  const calculatePrice = (selectedServices, serviceDocuments, servicesMap, optionsMap) => {
    let total = 0;
    
    selectedServices.forEach(serviceId => {
      const service = servicesMap[serviceId];
      const documents = serviceDocuments[serviceId] || [];
      
      if (service) {
        // Add service cost (base_price × number of documents)
        total += documents.length * (parseFloat(service.base_price) || 0);
        
        // Add options cost
        documents.forEach(doc => {
          if (doc.selectedOptions && doc.selectedOptions.length > 0) {
            doc.selectedOptions.forEach(optionId => {
              const option = optionsMap[optionId];
              if (option) {
                total += parseFloat(option.additional_price) || 0;
              }
            });
          }
        });
      }
    });
    
    setCalculatedPrice(total);
    return total;
  };

  const handleAddComment = async (fileId) => {
    const comment = newComment[fileId]?.trim();
    if (!comment || !adminInfo) return;

    try {
      const { data: commentData, error: commentError } = await supabase
        .from('file_comments')
        .insert({
          file_id: fileId,
          submission_id: id,
          commenter_type: 'admin',
          commenter_id: adminInfo.id,
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
      alert('Failed to add comment. Please try again.');
    }
  };

  const handleDeleteFile = async (fileId, storagePath) => {
    if (!window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
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

      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Failed to delete file: ${error.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Create notification helper
  const createNotification = async (userId, userType, title, message, type = 'info', actionType = null, actionData = null) => {
    try {
      const { error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_user_type: userType,
        p_title: title,
        p_message: message,
        p_type: type,
        p_action_type: actionType,
        p_action_data: actionData,
        p_created_by: adminInfo?.id || null,
        p_created_by_type: 'admin'
      });
      
      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Update appointment
  const handleUpdateAppointment = async () => {
    try {
      const { error } = await supabase
        .from('submission')
        .update({
          appointment_date: editFormData.appointment_date,
          appointment_time: editFormData.appointment_time,
          timezone: editFormData.timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Create notifications
      if (submission.client_id) {
        await createNotification(
          submission.client_id,
          'client',
          'Appointment Updated',
          `Your appointment has been updated to ${editFormData.appointment_date} at ${editFormData.appointment_time} (${editFormData.timezone}).`,
          'info',
          'appointment_updated',
          {
            submission_id: id,
            appointment_date: editFormData.appointment_date,
            appointment_time: editFormData.appointment_time,
            timezone: editFormData.timezone
          }
        );
      }

      if (submission.assigned_notary_id) {
        await createNotification(
          submission.assigned_notary_id,
          'notary',
          'Appointment Updated',
          `Appointment for submission #${id.substring(0, 8)} has been updated to ${editFormData.appointment_date} at ${editFormData.appointment_time} (${editFormData.timezone}).`,
          'info',
          'appointment_updated',
          {
            submission_id: id,
            appointment_date: editFormData.appointment_date,
            appointment_time: editFormData.appointment_time,
            timezone: editFormData.timezone
          }
        );
      }

      setIsEditingAppointment(false);
      await fetchSubmissionDetail();
      alert('Appointment updated successfully!');
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Update full submission
  const handleUpdateSubmission = async () => {
    try {
      // Recalculate price
      const newPrice = calculatePrice(
        editFormData.selectedServices,
        editFormData.serviceDocuments,
        servicesMap,
        optionsMap
      );

      // Update submission
      const { error: updateError } = await supabase
        .from('submission')
        .update({
          appointment_date: editFormData.appointment_date,
          appointment_time: editFormData.appointment_time,
          timezone: editFormData.timezone,
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          email: editFormData.email,
          phone: editFormData.phone,
          address: editFormData.address,
          city: editFormData.city,
          postal_code: editFormData.postal_code,
          country: editFormData.country,
          notes: editFormData.notes,
          total_price: newPrice,
          notary_cost: parseFloat(editFormData.notary_cost) || 0,
          data: {
            ...submission.data,
            selectedServices: editFormData.selectedServices,
            serviceDocuments: editFormData.serviceDocuments
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update submission_services
      // First, delete existing
      await supabase
        .from('submission_services')
        .delete()
        .eq('submission_id', id);

      // Then, insert new ones
      if (editFormData.selectedServices.length > 0) {
        const serviceRecords = editFormData.selectedServices.map(serviceId => {
          const service = allServices.find(s => s.service_id === serviceId);
          return service ? {
            submission_id: id,
            service_id: service.id
          } : null;
        }).filter(Boolean);

        if (serviceRecords.length > 0) {
          await supabase
            .from('submission_services')
            .insert(serviceRecords);
        }
      }

      // Create notifications
      if (submission.client_id) {
        await createNotification(
          submission.client_id,
          'client',
          'Submission Updated',
          'Your submission has been updated by an administrator. Please review the changes.',
          'info',
          'submission_modified',
          { submission_id: id, new_price: newPrice }
        );
      }

      if (submission.assigned_notary_id) {
        await createNotification(
          submission.assigned_notary_id,
          'notary',
          'Submission Updated',
          `Submission #${id.substring(0, 8)} has been updated by an administrator.`,
          'info',
          'submission_modified',
          { submission_id: id }
        );
      }

      setIsEditingSubmission(false);
      await fetchSubmissionDetail();
      alert('Submission updated successfully! New total price: $' + newPrice.toFixed(2));
    } catch (error) {
      console.error('Error updating submission:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!submission) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Icon icon="heroicons:exclamation-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-semibold mb-2">Submission not found</p>
          <button
            onClick={() => navigate('/submissions')}
            className="btn-glassy px-6 py-2 text-white font-semibold rounded-full"
          >
            Back to Submissions
          </button>
        </div>
      </AdminLayout>
    );
  }

  const selectedServices = submission.data?.selectedServices || [];
  const serviceDocuments = submission.data?.serviceDocuments || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/submissions')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <Icon icon="heroicons:arrow-left" className="w-5 h-5 mr-2" />
            Back to Submissions
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Submission Details</h1>
              <p className="text-gray-600">Submitted on {formatDate(submission.created_at)}</p>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(submission.status)}
              <select
                value={submission.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="pending">Pending</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex space-x-6 border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab('details');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'details' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Details
                {activeTab === 'details' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('documents');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'documents' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Services & Documents
                {activeTab === 'documents' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('edit');
                  setIsEditingSubmission(true);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'edit' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Edit Submission
                {activeTab === 'edit' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('notarized');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'notarized' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notarized Documents
                {notarizedFiles.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {notarizedFiles.length}
                  </span>
                )}
                {activeTab === 'notarized' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Client Information */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Client Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-semibold text-gray-900">{submission.first_name} {submission.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{submission.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold text-gray-900">{submission.phone || 'N/A'}</p>
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

                {/* Notary Assignment */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Notary Assignment</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Assign Notary
                      </label>
                      <select
                        value={selectedNotaryId}
                        onChange={(e) => setSelectedNotaryId(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      >
                        <option value="">-- Select a notary --</option>
                        {notaries.map((notary) => (
                          <option key={notary.id} value={notary.id}>
                            {notary.full_name} {notary.email ? `(${notary.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAssignNotary}
                        disabled={!selectedNotaryId}
                        className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submission.assigned_notary_id ? 'Update Assignment' : 'Assign Notary'}
                      </button>
                      {submission.assigned_notary_id && (
                        <button
                          onClick={handleRemoveNotary}
                          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors"
                        >
                          Remove Notary
                        </button>
                      )}
                    </div>
                    {submission.notary && (
                      <div className="mt-4 p-4 bg-white rounded-xl space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">Currently Assigned:</p>
                          <p className="font-semibold text-gray-900">{submission.notary.full_name}</p>
                          {submission.notary.email && (
                            <p className="text-sm text-gray-600">{submission.notary.email}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Notary Cost ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={submission.notary_cost || 0}
                            onChange={async (e) => {
                              const newCost = parseFloat(e.target.value) || 0;
                              try {
                                const { error } = await supabase
                                  .from('submission')
                                  .update({ notary_cost: newCost, updated_at: new Date().toISOString() })
                                  .eq('id', id);
                                
                                if (error) throw error;
                                
                                setSubmission({ ...submission, notary_cost: newCost });
                                
                                // Create notification for notary
                                if (submission.assigned_notary_id) {
                                  await createNotification(
                                    submission.assigned_notary_id,
                                    'notary',
                                    'Notary Cost Updated',
                                    `The cost for submission #${id.substring(0, 8)} has been updated to $${newCost.toFixed(2)}.`,
                                    'info',
                                    'notary_cost_updated',
                                    { submission_id: id, notary_cost: newCost }
                                  );
                                }
                              } catch (error) {
                                console.error('Error updating notary cost:', error);
                                alert(`Error: ${error.message}`);
                              }
                            }}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                            placeholder="0.00"
                          />
                          <p className="mt-1 text-xs text-gray-500">Cost paid to the notary for this submission</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointment */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Appointment</h2>
                    {!isEditingAppointment && !isEditingSubmission && (
                      <button
                        onClick={() => setIsEditingAppointment(true)}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold flex items-center"
                      >
                        <Icon icon="heroicons:pencil" className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                    )}
                  </div>
                  {isEditingAppointment ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Date</label>
                        <input
                          type="date"
                          value={editFormData.appointment_date}
                          onChange={(e) => setEditFormData({ ...editFormData, appointment_date: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Time</label>
                        <input
                          type="time"
                          value={editFormData.appointment_time}
                          onChange={(e) => setEditFormData({ ...editFormData, appointment_time: e.target.value })}
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Timezone</label>
                        <input
                          type="text"
                          value={editFormData.timezone}
                          onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })}
                          placeholder="e.g., UTC+1"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateAppointment}
                          className="btn-glassy px-6 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingAppointment(false);
                            setEditFormData({
                              ...editFormData,
                              appointment_date: submission.appointment_date,
                              appointment_time: submission.appointment_time,
                              timezone: submission.timezone
                            });
                          }}
                          className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-semibold text-gray-900">{formatDate(submission.appointment_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-semibold text-gray-900">{submission.appointment_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Timezone:</span>
                        <span className="font-semibold text-gray-900">{submission.timezone}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {submission.notes && (
                  <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
                    <p className="text-gray-700">{submission.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Services & Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {selectedServices.length > 0 && (
                  <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <Icon icon="heroicons:check-badge" className="w-5 h-5 text-gray-600" />
                      </div>
                      Services & Documents
                    </h2>
                    <div className="space-y-4">
                      {selectedServices.map((serviceId) => {
                        const service = servicesMap[serviceId];
                        const documents = serviceDocuments[serviceId] || [];

                        if (!service) return null;

                        return (
                          <div key={serviceId} className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                                <p className="text-sm text-gray-700 mt-2">
                                  {documents.length} document{documents.length > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            {/* Documents for this service */}
                            {documents.length > 0 && (
                              <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-200">
                                {documents.map((doc, index) => {
                                  const docOptions = doc.selectedOptions || [];

                                  return (
                                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1">
                                          <Icon icon="heroicons:document-text" className="w-5 h-5 text-gray-600 mr-2 flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                                          </div>
                                        </div>
                                        {doc.public_url && (
                                          <button
                                            onClick={() => downloadDocument(doc.public_url, doc.name)}
                                            className="ml-3 text-black hover:text-gray-700 font-medium text-xs flex items-center flex-shrink-0"
                                          >
                                            <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-1" />
                                            Download
                                          </button>
                                        )}
                                      </div>

                                      {/* Options for this document */}
                                      {docOptions.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <p className="text-xs text-gray-600 mb-1">Options:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {docOptions.map((optionId) => {
                                              const option = optionsMap[optionId];
                                              if (!option) return null;

                                              return (
                                                <span
                                                  key={optionId}
                                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                  <Icon icon={option.icon || "heroicons:plus-circle"} className="w-3 h-3 mr-1" />
                                                  {option.name}
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

            {/* Notarized Files Tab */}
            {activeTab === 'notarized' && (
              <div className="space-y-6">
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Notarized Documents</h2>
                  
                  {/* Files List */}
                  {notarizedFiles.length === 0 ? (
                    <p className="text-base text-gray-600">No notarized documents have been uploaded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {notarizedFiles.map((file) => (
                        <div key={file.id} className="bg-white rounded-xl p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start flex-1 min-w-0">
                              <Icon icon="heroicons:document-text" className="w-6 h-6 text-gray-600 mr-3 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-gray-900 mb-1">{file.file_name}</h3>
                                <p className="text-sm text-gray-500">
                                  {formatFileSize(file.file_size)} • Uploaded on {formatDate(file.uploaded_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center flex-shrink-0"
                              >
                                <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-2" />
                                Download
                              </a>
                              <button
                                onClick={() => handleDeleteFile(file.id, file.storage_path)}
                                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center flex-shrink-0"
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

            {/* Edit Submission Tab */}
            {activeTab === 'edit' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">
                    <Icon icon="heroicons:exclamation-triangle" className="w-5 h-5 inline mr-2" />
                    <strong>Warning:</strong> Modifying this submission will recalculate the total price based on current service and option prices.
                  </p>
                </div>

                {/* Personal Information */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
                      <input
                        type="text"
                        value={editFormData.first_name}
                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={editFormData.last_name}
                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Address</label>
                      <input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
                      <input
                        type="text"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Postal Code</label>
                      <input
                        type="text"
                        value={editFormData.postal_code}
                        onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
                      <input
                        type="text"
                        value={editFormData.country}
                        onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Appointment */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Appointment</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Date</label>
                      <input
                        type="date"
                        value={editFormData.appointment_date}
                        onChange={(e) => setEditFormData({ ...editFormData, appointment_date: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Time</label>
                      <input
                        type="time"
                        value={editFormData.appointment_time}
                        onChange={(e) => setEditFormData({ ...editFormData, appointment_time: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Timezone</label>
                      <input
                        type="text"
                        value={editFormData.timezone}
                        onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })}
                        placeholder="e.g., UTC+1"
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Services Selection */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Services</h2>
                  <div className="space-y-3">
                    {allServices.map((service) => (
                      <label key={service.id} className="flex items-start space-x-3 bg-white rounded-xl p-4 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={editFormData.selectedServices.includes(service.service_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({
                                ...editFormData,
                                selectedServices: [...editFormData.selectedServices, service.service_id],
                                serviceDocuments: {
                                  ...editFormData.serviceDocuments,
                                  [service.service_id]: editFormData.serviceDocuments[service.service_id] || []
                                }
                              });
                            } else {
                              const newSelected = editFormData.selectedServices.filter(id => id !== service.service_id);
                              const newServiceDocuments = { ...editFormData.serviceDocuments };
                              delete newServiceDocuments[service.service_id];
                              setEditFormData({
                                ...editFormData,
                                selectedServices: newSelected,
                                serviceDocuments: newServiceDocuments
                              });
                            }
                            // Recalculate price
                            setTimeout(() => {
                              const newPrice = calculatePriceHelper(
                                e.target.checked 
                                  ? [...editFormData.selectedServices, service.service_id]
                                  : editFormData.selectedServices.filter(id => id !== service.service_id),
                                e.target.checked
                                  ? { ...editFormData.serviceDocuments, [service.service_id]: editFormData.serviceDocuments[service.service_id] || [] }
                                  : (() => {
                                      const newDocs = { ...editFormData.serviceDocuments };
                                      delete newDocs[service.service_id];
                                      return newDocs;
                                    })(),
                                servicesMap,
                                optionsMap
                              );
                              setCalculatedPrice(newPrice);
                            }, 0);
                          }}
                          className="mt-1 w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <p className="text-sm font-semibold text-gray-900 mt-2">
                            ${parseFloat(service.base_price || 0).toFixed(2)} per document
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notary Cost */}
                {submission.assigned_notary_id && (
                  <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Notary Cost</h2>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Cost Paid to Notary ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.notary_cost || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, notary_cost: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-gray-500">Cost paid to the assigned notary for this submission</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Price Summary */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border-2 border-gray-300">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Price Summary</h2>
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total Price:</span>
                      <span className="text-2xl font-bold text-gray-900">${calculatedPrice.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Price calculated based on current service and option prices
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateSubmission}
                    className="btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 flex-1"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingSubmission(false);
                      setActiveTab('details');
                      // Reset form data
                      setEditFormData({
                        appointment_date: submission.appointment_date || '',
                        appointment_time: submission.appointment_time || '',
                        timezone: submission.timezone || '',
                        first_name: submission.first_name || '',
                        last_name: submission.last_name || '',
                        email: submission.email || '',
                        phone: submission.phone || '',
                        address: submission.address || '',
                        city: submission.city || '',
                        postal_code: submission.postal_code || '',
                        country: submission.country || '',
                        notes: submission.notes || '',
                        selectedServices: submission.data?.selectedServices || [],
                        serviceDocuments: submission.data?.serviceDocuments || {},
                        notary_cost: submission.notary_cost || 0
                      });
                      const initialPrice = calculatePriceHelper(
                        submission.data?.selectedServices || [],
                        submission.data?.serviceDocuments || {},
                        servicesMap,
                        optionsMap
                      );
                      setCalculatedPrice(initialPrice);
                    }}
                    className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
              {adminInfo && submission.client && (
                <Chat
                  submissionId={id}
                  currentUserType="admin"
                  currentUserId={adminInfo.id}
                  recipientName={submission.client ? `${submission.client.first_name} ${submission.client.last_name}` : 'Client'}
                  clientFirstName={submission.client?.first_name}
                  clientLastName={submission.client?.last_name}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubmissionDetail;

