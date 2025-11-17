import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import PhoneInputWrapper, { isValidPhoneNumber } from '../../components/PhoneInputWrapper';
import AdminLayout from '../../components/admin/AdminLayout';
import Chat from '../../components/admin/Chat';
import SignatoriesList from '../../components/SignatoriesList';
import DocumentViewer from '../../components/DocumentViewer';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { convertTimeToNotaryTimezone } from '../../utils/timezoneConverter';

const SubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, ConfirmComponent, setLoading: setConfirmLoading, closeConfirm } = useConfirm();
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
  const [signatories, setSignatories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [newComment, setNewComment] = useState({});
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [internalNotes, setInternalNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
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
    signatoriesByDocument: {},
    notary_cost: 0
  });
  const [allServices, setAllServices] = useState([]);
  const [allOptions, setAllOptions] = useState([]);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [phoneErrors, setPhoneErrors] = useState({}); // Store phone errors by docKey_signatoryIndex
  const [emailErrors, setEmailErrors] = useState({}); // Store email errors by docKey_signatoryIndex
  const [isFormValid, setIsFormValid] = useState(false); // Track form validation state
  const [isSaving, setIsSaving] = useState(false); // Track saving state

  useEffect(() => {
    fetchAdminInfo();
    fetchNotaries();
  }, []);

  useEffect(() => {
    if (adminInfo) {
      fetchSubmissionDetail();
    }
  }, [id, adminInfo]);

  // Recalculate price when editFormData changes
  useEffect(() => {
    if (isEditingSubmission && Object.keys(servicesMap).length > 0 && Object.keys(optionsMap).length > 0) {
      const newPrice = calculatePriceHelper(
        editFormData.selectedServices,
        editFormData.serviceDocuments,
        servicesMap,
        optionsMap,
        editFormData.signatoriesByDocument
      );
      setCalculatedPrice(newPrice);
    }
  }, [editFormData, servicesMap, optionsMap, isEditingSubmission]);

  // Auto-switch away from edit tab if submission is cancelled
  useEffect(() => {
    if (submission?.status === 'cancelled' && (activeTab === 'edit' || isEditingSubmission)) {
      setActiveTab('details');
      setIsEditingSubmission(false);
    }
  }, [submission?.status, activeTab, isEditingSubmission]);

  // Validate form whenever editFormData changes
  useEffect(() => {
    if (isEditingSubmission && Object.keys(servicesMap).length > 0) {
      // Validate form inline to avoid dependency issues
      const errors = [];
      
      // Validate basic fields
      if (!editFormData.first_name?.trim()) errors.push('First name');
      if (!editFormData.last_name?.trim()) errors.push('Last name');
      if (!editFormData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email?.trim())) errors.push('Email');
      if (!editFormData.phone?.trim() || !isValidPhoneNumber(editFormData.phone)) errors.push('Phone');
      if (!editFormData.address?.trim()) errors.push('Address');
      if (!editFormData.city?.trim()) errors.push('City');
      if (!editFormData.postal_code?.trim()) errors.push('Postal code');
      if (!editFormData.country?.trim()) errors.push('Country');
      
      // Validate services
      if (!editFormData.selectedServices || editFormData.selectedServices.length === 0) {
        errors.push('Services');
      } else {
        for (const serviceId of editFormData.selectedServices) {
          const documents = editFormData.serviceDocuments[serviceId] || [];
          if (documents.length === 0) {
            errors.push('Documents');
            break;
          }
        }
      }
      
      // Validate signatories
      if (editFormData.selectedServices && editFormData.selectedServices.length > 0) {
        for (const serviceId of editFormData.selectedServices) {
          const documents = editFormData.serviceDocuments[serviceId] || [];
          for (let docIndex = 0; docIndex < documents.length; docIndex++) {
            const docKey = `${serviceId}_${docIndex}`;
            const signatories = editFormData.signatoriesByDocument[docKey];
            if (!signatories || !Array.isArray(signatories) || signatories.length === 0) {
              errors.push('Signatories');
              break;
            } else {
              for (const signatory of signatories) {
                if (!signatory.firstName?.trim() || !signatory.lastName?.trim() || 
                    !signatory.birthDate?.trim() || !signatory.birthCity?.trim() || 
                    !signatory.postalAddress?.trim() || !signatory.email?.trim() || 
                    !signatory.phone?.trim()) {
                  errors.push('Signatory fields');
                  break;
                }
                if (signatory.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatory.email.trim())) {
                  errors.push('Signatory email');
                  break;
                }
                if (signatory.phone && !isValidPhoneNumber(signatory.phone)) {
                  errors.push('Signatory phone');
                  break;
                }
              }
              if (errors.length > 0) break;
            }
          }
          if (errors.length > 0) break;
        }
      }
      
      setIsFormValid(errors.length === 0);
    } else {
      setIsFormValid(false);
    }
  }, [editFormData, servicesMap, isEditingSubmission, phoneErrors, emailErrors]);

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notarized') {
      setActiveTab('notarized');
    } else if (tabParam === 'transactions') {
      setActiveTab('transactions');
    }
  }, [searchParams]);

  // Fetch transactions when transactions tab is active
  useEffect(() => {
    if (activeTab === 'transactions' && id) {
      fetchTransactions();
    }
  }, [activeTab, id]);

  // Fetch timeline when timeline tab is active
  useEffect(() => {
    if (activeTab === 'timeline' && id) {
      fetchTimeline();
    }
  }, [activeTab, id]);

  // Fetch internal notes when notes tab is active
  useEffect(() => {
    if (activeTab === 'notes' && id) {
      fetchInternalNotes();
    }
  }, [activeTab, id]);

  // Initialize Tiptap editor for internal notes
  const noteEditor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  const fetchTransactions = async () => {
    if (!id) return;
    
    setTransactionsLoading(true);
    try {
      // Récupérer la soumission avec ses données de paiement depuis Supabase
      const { data: submissionData, error } = await supabase
        .from('submission')
        .select('id, email, phone, first_name, last_name, created_at, data')
        .eq('id', id)
        .single();

      if (error) throw error;

      const allTransactions = [];
      const paymentData = submissionData?.data?.payment;

      if (paymentData) {
        // Transaction de paiement initiale
        if (paymentData.payment_intent_id && paymentData.amount_paid) {
          const paymentDate = paymentData.paid_at 
            ? new Date(paymentData.paid_at).getTime() / 1000 
            : submissionData.created_at 
              ? new Date(submissionData.created_at).getTime() / 1000 
              : Date.now() / 1000;

          allTransactions.push({
            id: paymentData.payment_intent_id,
            type: 'payment',
            amount: paymentData.amount_paid / 100,
            currency: paymentData.currency || 'usd',
            status: paymentData.payment_status === 'paid' ? 'succeeded' : paymentData.payment_status || 'pending',
            created: paymentDate,
            email: submissionData.email,
            phone: submissionData.phone,
            stripeUrl: paymentData.payment_intent_id 
              ? `https://dashboard.stripe.com/test/payments/${paymentData.payment_intent_id}` 
              : null
          });

          // Paiements supplémentaires
          if (paymentData.additional_payments && Array.isArray(paymentData.additional_payments)) {
            for (const additionalPayment of paymentData.additional_payments) {
              const paymentDate = additionalPayment.created_at 
                ? new Date(additionalPayment.created_at).getTime() / 1000 
                : Date.now() / 1000;

              allTransactions.push({
                id: additionalPayment.payment_intent_id,
                type: 'payment',
                amount: additionalPayment.amount / 100,
                currency: additionalPayment.currency || paymentData.currency || 'usd',
                status: additionalPayment.status || 'succeeded',
                created: paymentDate,
                email: submissionData.email,
                phone: submissionData.phone,
                stripeUrl: additionalPayment.payment_intent_id 
                  ? `https://dashboard.stripe.com/test/payments/${additionalPayment.payment_intent_id}` 
                  : null
              });
            }
          }

          // Remboursements
          if (paymentData.refunds && Array.isArray(paymentData.refunds)) {
            for (const refund of paymentData.refunds) {
              const refundDate = refund.created_at 
                ? new Date(refund.created_at).getTime() / 1000 
                : Date.now() / 1000;

              allTransactions.push({
                id: refund.id || `refund_${paymentData.payment_intent_id}_${refundDate}`,
                type: 'refund',
                amount: refund.amount / 100,
                currency: refund.currency || paymentData.currency || 'usd',
                status: refund.status || 'succeeded',
                created: refundDate,
                reason: refund.reason || null,
                email: submissionData.email,
                phone: submissionData.phone,
                stripeUrl: refund.id 
                  ? `https://dashboard.stripe.com/test/refunds/${refund.id}` 
                  : null
              });
            }
          }
        }
      }

      // Trier par date (plus récent en premier)
      allTransactions.sort((a, b) => b.created - a.created);

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchTimeline = async () => {
    if (!id) return;
    
    setTimelineLoading(true);
    try {
      const { data, error } = await supabase
        .from('submission_activity_log')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTimeline(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      toast.error('Failed to load timeline');
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const fetchInternalNotes = async () => {
    if (!id) return;
    
    setNotesLoading(true);
    try {
      const { data, error } = await supabase
        .from('submission_internal_notes')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInternalNotes(data || []);
    } catch (error) {
      console.error('Error fetching internal notes:', error);
      toast.error('Failed to load internal notes');
      setInternalNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const createTimelineEntry = async (actionType, actionDescription, oldValue = null, newValue = null, metadata = {}) => {
    if (!id || !adminInfo) return;

    try {
      const { error } = await supabase
        .from('submission_activity_log')
        .insert({
          submission_id: id,
          action_type: actionType,
          action_description: actionDescription,
          performed_by_type: 'admin',
          performed_by_id: adminInfo.id,
          old_value: oldValue,
          new_value: newValue,
          metadata: metadata
        });

      if (error) throw error;

      // Refresh timeline if tab is active
      if (activeTab === 'timeline') {
        fetchTimeline();
      }
    } catch (error) {
      console.error('Error creating timeline entry:', error);
    }
  };

  const saveInternalNote = async () => {
    if (!id || !adminInfo || !noteEditor) return;

    const content = noteEditor.getHTML();
    if (!content || content.trim() === '<p></p>') {
      toast.error('Please enter a note');
      return;
    }

    try {
      const { error } = await supabase
        .from('submission_internal_notes')
        .insert({
          submission_id: id,
          content: content,
          created_by_type: 'admin',
          created_by_id: adminInfo.id
        });

      if (error) throw error;

      // Clear editor
      noteEditor.commands.clearContent();
      setIsAddingNote(false);

      // Refresh notes
      fetchInternalNotes();

      // Create timeline entry
      await createTimelineEntry('note_added', 'Internal note added', null, null, { note_preview: content.substring(0, 100) });

      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const deleteInternalNote = async (noteId) => {
    try {
      const { error } = await supabase
        .from('submission_internal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      // Refresh notes
      fetchInternalNotes();

      // Create timeline entry
      await createTimelineEntry('note_deleted', 'Internal note deleted');

      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

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
      // Get signatories from database or submission.data
      let signatoriesData = {};
      
      // Fetch signatories first
      const { data: signatoriesFromDB, error: signatoriesError } = await supabase
        .from('signatories')
        .select('*')
        .eq('submission_id', id)
        .order('created_at', { ascending: true });

      if (!signatoriesError && signatoriesFromDB && signatoriesFromDB.length > 0) {
        // Convert database signatories to editFormData format
        signatoriesFromDB.forEach(sig => {
          if (!signatoriesData[sig.document_key]) {
            signatoriesData[sig.document_key] = [];
          }
          signatoriesData[sig.document_key].push({
            firstName: sig.first_name,
            lastName: sig.last_name,
            birthDate: sig.birth_date,
            birthCity: sig.birth_city,
            postalAddress: sig.postal_address,
            email: sig.email || '',
            phone: sig.phone || ''
          });
        });
      } else {
        // Use signatories from submission.data
        const signatoriesFromData = submissionData.data?.signatoriesByDocument || {};
        Object.entries(signatoriesFromData).forEach(([docKey, sigs]) => {
          if (sigs && sigs.length > 0) {
            signatoriesData[docKey] = sigs.map(sig => ({
              firstName: sig.firstName || sig.first_name,
              lastName: sig.lastName || sig.last_name,
              birthDate: sig.birthDate || sig.birth_date,
              birthCity: sig.birthCity || sig.birth_city,
              postalAddress: sig.postalAddress || sig.postal_address,
              email: sig.email || '',
              phone: sig.phone || ''
            }));
          }
        });
      }

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
        signatoriesByDocument: signatoriesData,
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

      // Set signatories state for display (already fetched above)
      if (signatoriesFromDB && signatoriesFromDB.length > 0) {
        setSignatories(signatoriesFromDB);
      }

      // Calculate initial price (including signatories)
      const initialPrice = calculatePriceHelper(
        submissionData.data?.selectedServices || [], 
        submissionData.data?.serviceDocuments || {}, 
        sMap, 
        oMap,
        signatoriesData
      );
      setCalculatedPrice(initialPrice);
    } catch (error) {
      console.error('Error fetching submission detail:', error);
      toast.error('Error loading submission details');
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
      toast.error('Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Format time in 12-hour format (AM/PM)
  const formatTime12h = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
    } catch (error) {
      return timeString;
    }
  };

  // Convert time from Florida (Eastern Time, UTC-5) to client timezone for display
  const convertTimeToClientTimezone = (time, date, clientTimezone) => {
    if (!time || !date || !clientTimezone) return time;
    
    try {
      // IMPORTANT: The time stored in submission.appointment_time is in Florida time (UTC-5)
      // We need to convert it to the client's timezone for display
      
      // Parse the stored time (Florida time, UTC-5)
      const [floridaHours, floridaMinutes] = time.split(':').map(Number);
      
      // Get client timezone offset
      let clientOffsetHours = 0;
      if (clientTimezone && clientTimezone.startsWith('UTC')) {
        const match = clientTimezone.match(/UTC([+-])(\d+)(?::(\d+))?/);
        if (match) {
          const sign = match[1] === '+' ? 1 : -1;
          const hours = parseInt(match[2], 10);
          const minutes = match[3] ? parseInt(match[3], 10) : 0;
          clientOffsetHours = sign * (hours + minutes / 60);
        }
      }
      
      // Florida is UTC-5
      const floridaOffsetHours = -5;
      
      // Calculate the difference between client timezone and Florida timezone
      const offsetDiff = clientOffsetHours - floridaOffsetHours;
      
      // Convert Florida time to client timezone
      let clientHour = floridaHours + offsetDiff;
      const clientMinutes = floridaMinutes;
      
      // Handle day overflow/underflow
      if (clientHour < 0) {
        clientHour += 24;
      } else if (clientHour >= 24) {
        clientHour -= 24;
      }
      
      // Format in 12-hour format
      const hour = Math.floor(clientHour);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      
      // Format with proper padding for minutes
      return `${displayHour}:${String(clientMinutes).padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error converting time:', error);
      return time;
    }
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
      toast.success('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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
      toast.success('Notary assigned successfully!');
    } catch (error) {
      console.error('Error assigning notary:', error);
      toast.error(`Error: ${error.message}`);
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
      toast.success('Notary removed successfully!');
    } catch (error) {
      console.error('Error removing notary:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Helper function to calculate price (can be called before state is set)
  const calculatePriceHelper = (selectedServices, serviceDocuments, servicesMap, optionsMap, signatoriesByDocument = {}) => {
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
        
        // Add signatories cost (€10 per additional signatory)
        documents.forEach((doc, docIndex) => {
          const docKey = `${serviceId}_${docIndex}`;
          const docSignatories = signatoriesByDocument[docKey];
          if (Array.isArray(docSignatories) && docSignatories.length > 1) {
            // First signatory is included, count additional ones
            total += (docSignatories.length - 1) * 10;
          }
        });
      }
    });
    
    return total;
  };

  // Calculate price based on services, options, and signatories
  const calculatePrice = (selectedServices, serviceDocuments, servicesMap, optionsMap, signatoriesByDocument = {}) => {
    const total = calculatePriceHelper(selectedServices, serviceDocuments, servicesMap, optionsMap, signatoriesByDocument);
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
          `Your appointment has been updated to ${editFormData.appointment_date} at ${formatTime12h(editFormData.appointment_time)} (${editFormData.timezone}).`,
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
          `Appointment for submission #${id.substring(0, 8)} has been updated to ${editFormData.appointment_date} at ${formatTime12h(editFormData.appointment_time)} (${editFormData.timezone}).`,
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
      toast.success('Appointment updated successfully!');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Validate form data before submission
  const validateEditForm = () => {
    const errors = [];

    // Validate basic fields
    if (!editFormData.first_name?.trim()) {
      errors.push('First name is required');
    }
    if (!editFormData.last_name?.trim()) {
      errors.push('Last name is required');
    }
    if (!editFormData.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email.trim())) {
      errors.push('Invalid email format');
    }
    if (!editFormData.phone?.trim()) {
      errors.push('Phone number is required');
    } else if (!isValidPhoneNumber(editFormData.phone)) {
      errors.push('Invalid phone number format');
    }
    if (!editFormData.address?.trim()) {
      errors.push('Address is required');
    }
    if (!editFormData.city?.trim()) {
      errors.push('City is required');
    }
    if (!editFormData.postal_code?.trim()) {
      errors.push('Postal code is required');
    }
    if (!editFormData.country?.trim()) {
      errors.push('Country is required');
    }

    // Validate services and documents
    if (!editFormData.selectedServices || editFormData.selectedServices.length === 0) {
      errors.push('At least one service must be selected');
    } else {
      // Check that each selected service has at least one document
      for (const serviceId of editFormData.selectedServices) {
        const documents = editFormData.serviceDocuments[serviceId] || [];
        if (documents.length === 0) {
          errors.push(`Service "${servicesMap[serviceId]?.name || serviceId}" must have at least one document`);
        }
      }
    }

    // Validate signatories
    if (!editFormData.signatoriesByDocument || Object.keys(editFormData.signatoriesByDocument).length === 0) {
      // Check if there are documents that need signatories
      let hasDocuments = false;
      for (const serviceId of editFormData.selectedServices || []) {
        const documents = editFormData.serviceDocuments[serviceId] || [];
        if (documents.length > 0) {
          hasDocuments = true;
          break;
        }
      }
      if (hasDocuments) {
        errors.push('At least one signatory is required for documents');
      }
    } else {
      // Check that all documents have signatories
      for (const serviceId of editFormData.selectedServices || []) {
        const documents = editFormData.serviceDocuments[serviceId] || [];
        for (let docIndex = 0; docIndex < documents.length; docIndex++) {
          const docKey = `${serviceId}_${docIndex}`;
          const signatories = editFormData.signatoriesByDocument[docKey];
          if (!signatories || !Array.isArray(signatories) || signatories.length === 0) {
            const docName = documents[docIndex]?.name || `Document ${docIndex + 1}`;
            errors.push(`Document "${docName}" must have at least one signatory`);
          } else {
            // Validate each signatory
            signatories.forEach((signatory, sigIndex) => {
              if (!signatory.firstName?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing first name`);
              }
              if (!signatory.lastName?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing last name`);
              }
              if (!signatory.birthDate?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing date of birth`);
              }
              if (!signatory.birthCity?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing birth city`);
              }
              if (!signatory.postalAddress?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing postal address`);
              }
              if (!signatory.email?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing email`);
              } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatory.email.trim())) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" has invalid email format`);
              }
              if (!signatory.phone?.trim()) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" is missing phone number`);
              } else if (!isValidPhoneNumber(signatory.phone)) {
                errors.push(`Signatory ${sigIndex + 1} in document "${documents[docIndex]?.name || docKey}" has invalid phone number format`);
              }
            });
          }
        }
      }
    }

    return errors;
  };

  // Update full submission
  const handleUpdateSubmission = async () => {
    // Validate form before submission
    const validationErrors = validateEditForm();
    if (validationErrors.length > 0) {
      toast.error(`Please fix the following errors:\n${validationErrors.join('\n')}`);
      return;
    }

    setIsSaving(true);
    try {
      // Recalculate price (including signatories)
      const newPrice = calculatePrice(
        editFormData.selectedServices,
        editFormData.serviceDocuments,
        servicesMap,
        optionsMap,
        editFormData.signatoriesByDocument
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
            serviceDocuments: editFormData.serviceDocuments,
            signatoriesByDocument: editFormData.signatoriesByDocument
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

      // Update signatories in database if payment was completed
      const paymentInfo = submission.data?.payment;
      if (paymentInfo && paymentInfo.payment_status === 'paid') {
        // Delete existing signatories
        await supabase
          .from('signatories')
          .delete()
          .eq('submission_id', id);

        // Insert updated signatories
        const signatoryEntries = [];
        Object.entries(editFormData.signatoriesByDocument).forEach(([docKey, signatories]) => {
          if (Array.isArray(signatories)) {
            signatories.forEach((signatory) => {
              if (signatory.firstName && signatory.lastName) {
                signatoryEntries.push({
                  submission_id: id,
                  document_key: docKey,
                  first_name: signatory.firstName,
                  last_name: signatory.lastName,
                  birth_date: signatory.birthDate,
                  birth_city: signatory.birthCity,
                  postal_address: signatory.postalAddress,
                  email: signatory.email || null,
                  phone: signatory.phone || null,
                });
              }
            });
          }
        });

        if (signatoryEntries.length > 0) {
          await supabase
            .from('signatories')
            .insert(signatoryEntries);
        }

        // ALWAYS update Stripe payment when submission is updated
        if (paymentInfo && paymentInfo.payment_status === 'paid') {
          try {
            const oldPrice = parseFloat(submission.total_price) || 0;
            
            const requestBody = {
              submissionId: id,
              newAmount: newPrice,
              oldAmount: oldPrice
              // NO updateMetadataOnly - always calculate and charge/refund if needed
            };
            
            console.log('🔄 [UPDATE-SUBMISSION] Calling update-payment to update PRICE in Stripe');
            console.log('💰 [UPDATE-SUBMISSION] Old price:', oldPrice, 'New price:', newPrice);
            
            let paymentUpdateResult = null;
            let paymentUpdateError = null;
            
            try {
              const { data, error } = await supabase.functions.invoke('update-payment', {
                body: requestBody
              });
              
              paymentUpdateResult = data;
              paymentUpdateError = error;
              
              // If there's an error, try to parse the error message from the response
              if (paymentUpdateError) {
                console.error('❌ [UPDATE-SUBMISSION] Error updating Stripe payment:', paymentUpdateError);
                console.error('❌ [UPDATE-SUBMISSION] Full error object:', paymentUpdateError);
                console.error('❌ [UPDATE-SUBMISSION] Error keys:', Object.keys(paymentUpdateError));
                
                // Try multiple ways to get the error message
                let errorMessage = 'Unknown error';
                
                // Method 1: Check if error has message property
                if (paymentUpdateError.message && paymentUpdateError.message !== 'Edge Function returned a non-2xx status code') {
                  errorMessage = paymentUpdateError.message;
                }
                
                // Method 2: Check if data contains error info (sometimes error is in data when status is 400)
                if (paymentUpdateResult && paymentUpdateResult.error) {
                  errorMessage = typeof paymentUpdateResult.error === 'string' 
                    ? paymentUpdateResult.error 
                    : paymentUpdateResult.error?.error || paymentUpdateResult.error?.message || errorMessage;
                }
                
                // Method 3: Try to get from context if available
                if (errorMessage === 'Unknown error' && paymentUpdateError.context) {
                  console.log('❌ [UPDATE-SUBMISSION] Error context:', paymentUpdateError.context);
                  // Context might contain response body
                  if (paymentUpdateError.context.response) {
                    try {
                      const errorBody = typeof paymentUpdateError.context.response === 'string' 
                        ? JSON.parse(paymentUpdateError.context.response)
                        : paymentUpdateError.context.response;
                      
                      if (errorBody?.error) {
                        errorMessage = typeof errorBody.error === 'string' 
                          ? errorBody.error 
                          : errorBody.error?.error || errorBody.error?.message || errorMessage;
                      } else if (errorBody?.message) {
                        errorMessage = errorBody.message;
                      }
                    } catch (e) {
                      console.warn('Could not parse error response from context:', e);
                    }
                  }
                }
                
                console.error('❌ [UPDATE-SUBMISSION] Final error message:', errorMessage);
                toast.warning(`Submission updated but Stripe sync failed: ${errorMessage}`);
              }
            } catch (invokeError) {
              console.error('❌ [UPDATE-SUBMISSION] Exception calling update-payment:', invokeError);
              paymentUpdateError = invokeError;
              toast.warning(`Submission updated but Stripe sync failed: ${invokeError.message || 'Unknown error'}`);
            }

            if (!paymentUpdateError && paymentUpdateResult?.success) {
              // Only open checkout session if explicitly required AND checkout_url is provided
              if (paymentUpdateResult?.requires_customer_action === true && paymentUpdateResult?.checkout_url) {
                // If checkout session was created, show message and open link
                console.log('🔄 [UPDATE-SUBMISSION] Checkout session required, opening:', paymentUpdateResult.checkout_url);
                toast.warning(`${paymentUpdateResult.message} Opening checkout session...`, 10000);
                // Open checkout session in new tab after a short delay
                setTimeout(() => {
                  window.open(paymentUpdateResult.checkout_url, '_blank');
                }, 1000);
              } else {
                // Payment succeeded automatically - no checkout needed
                console.log('✅ [UPDATE-SUBMISSION] Payment processed automatically, no checkout needed');
                toast.success(`Submission updated! ${paymentUpdateResult.message || 'Stripe payment updated successfully.'}`);
              }
            } else if (!paymentUpdateError && paymentUpdateResult && !paymentUpdateResult.success) {
              // Response received but indicates failure
              const errorMsg = paymentUpdateResult.error || paymentUpdateResult.message || 'Stripe sync failed';
              toast.warning(`Submission updated but Stripe sync failed: ${errorMsg}`);
            }
          } catch (paymentError) {
            console.error('Error calling update-payment function:', paymentError);
            toast.warning('Submission updated but Stripe sync failed. Please update manually in Stripe.');
          }
        }
      }

      setIsEditingSubmission(false);
      await fetchSubmissionDetail();
      
      // Send email to client about submission update
      try {
        const clientEmail = editFormData.email || submission.email;
        const clientName = `${editFormData.first_name || ''} ${editFormData.last_name || ''}`.trim() || 'Client';
        const submissionNumber = id.substring(0, 8);
        
        // Get services names for email
        const servicesNames = (editFormData.selectedServices || [])
          .map(serviceId => servicesMap[serviceId]?.name)
          .filter(Boolean)
          .join(', ');
        
        const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');
        await sendTransactionalEmail(supabase, {
          email_type: 'submission_updated',
          recipient_email: clientEmail,
          recipient_name: clientName,
          recipient_type: 'client',
          data: {
            submission_id: id,
            submission_number: submissionNumber,
            old_price: submission.total_price || 0,
            new_price: newPrice,
            price_changed: Math.abs((submission.total_price || 0) - newPrice) > 0.01,
            services: servicesNames,
            appointment_date: editFormData.appointment_date,
            appointment_time: editFormData.appointment_time,
            timezone: editFormData.timezone,
            updated_fields: {
              personal_info: editFormData.first_name !== submission.first_name || 
                           editFormData.last_name !== submission.last_name ||
                           editFormData.email !== submission.email ||
                           editFormData.phone !== submission.phone,
              address: editFormData.address !== submission.address ||
                      editFormData.city !== submission.city ||
                      editFormData.postal_code !== submission.postal_code ||
                      editFormData.country !== submission.country,
              services: JSON.stringify(editFormData.selectedServices) !== JSON.stringify(submission.data?.selectedServices || []),
              appointment: editFormData.appointment_date !== submission.appointment_date ||
                          editFormData.appointment_time !== submission.appointment_time
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending submission update email:', emailError);
        // Don't block the update if email fails
      }
      
      toast.success('Submission updated successfully! New total price: €' + newPrice.toFixed(2));
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <ConfirmComponent />
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
      <ConfirmComponent />
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
                  setActiveTab('signatories');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'signatories' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Signatories
                {activeTab === 'signatories' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              {submission?.status !== 'cancelled' && (
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
              )}
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
              <button
                onClick={() => {
                  setActiveTab('transactions');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'transactions' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Transactions
                {transactions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {transactions.length}
                  </span>
                )}
                {activeTab === 'transactions' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('timeline');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'timeline' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Timeline
                {activeTab === 'timeline' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('notes');
                  setIsEditingSubmission(false);
                }}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'notes' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Note interne
                {internalNotes.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {internalNotes.length}
                  </span>
                )}
                {activeTab === 'notes' && (
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
                            Notary Cost (€)
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
                                    `The cost for submission #${id.substring(0, 8)} has been updated to €${newCost.toFixed(2)}.`,
                                    'info',
                                    'notary_cost_updated',
                                    { submission_id: id, notary_cost: newCost }
                                  );
                                }
                              } catch (error) {
                                console.error('Error updating notary cost:', error);
                                toast.error(`Error: ${error.message}`);
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
                        <span className="text-gray-600">Client ({submission.timezone}):</span>
                        <span className="font-semibold text-gray-900">
                          {(() => {
                            const [hours, minutes] = submission.appointment_time.split(':').map(Number);
                            const hour = parseInt(hours);
                            const period = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                            return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Florida:</span>
                        <span className="font-semibold text-gray-900">
                          {submission.timezone ? convertTimeToNotaryTimezone(submission.appointment_time, submission.appointment_date, submission.timezone, 'America/New_York') : 'N/A'}
                        </span>
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

                {/* Price Details */}
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      <Icon icon="heroicons:currency-dollar" className="w-5 h-5 text-gray-600" />
                    </div>
                    Price Details
                  </h2>
                  <div className="space-y-3">
                    {selectedServices.length > 0 ? (
                      <>
                        {selectedServices.map((serviceId) => {
                          const service = servicesMap[serviceId];
                          const documents = serviceDocuments[serviceId] || [];
                          if (!service) return null;

                          const serviceTotal = documents.length * (parseFloat(service.base_price) || 0);
                          let signatoriesTotal = 0;
                          
                          // Track count per option for detailed display
                          const optionCounts = {}; // Track count per option

                          // Calculate options total and collect details for this service
                          documents.forEach(doc => {
                            if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                              doc.selectedOptions.forEach(optionId => {
                                const option = optionsMap[optionId];
                                if (option) {
                                  const optionPrice = parseFloat(option.additional_price) || 0;
                                  // Track option count
                                  if (!optionCounts[optionId]) {
                                    optionCounts[optionId] = {
                                      option: option,
                                      count: 0,
                                      total: 0
                                    };
                                  }
                                  optionCounts[optionId].count += 1;
                                  optionCounts[optionId].total += optionPrice;
                                }
                              });
                            }
                          });

                          // Calculate signatories cost for this service
                          documents.forEach((doc, docIndex) => {
                            const docKey = `${serviceId}_${docIndex}`;
                            // Try to get signatories from database first
                            if (signatories.length > 0) {
                              const docSignatories = signatories.filter(sig => sig.document_key === docKey);
                              if (docSignatories.length > 1) {
                                signatoriesTotal += (docSignatories.length - 1) * 10; // €10 per additional signatory
                              }
                            } else {
                              // Use signatories from submission.data
                              const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
                              const docSignatories = signatoriesFromData[docKey];
                              if (Array.isArray(docSignatories) && docSignatories.length > 1) {
                                signatoriesTotal += (docSignatories.length - 1) * 10; // €10 per additional signatory
                              }
                            }
                          });

                          return (
                            <div key={serviceId} className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {documents.length} document{documents.length > 1 ? 's' : ''} × €{parseFloat(service.base_price || 0).toFixed(2)}
                                  </p>
                                </div>
                                <span className="font-bold text-gray-900">€{serviceTotal.toFixed(2)}</span>
                              </div>
                              
                              {/* Options breakdown - detailed */}
                              {Object.keys(optionCounts).length > 0 && (
                                <div className="ml-4 mt-2 pt-2 border-t border-gray-200 space-y-1">
                                  {Object.values(optionCounts).map((optionDetail, idx) => {
                                    const option = optionDetail.option;
                                    return (
                                      <div key={option.option_id || idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 italic">
                                          + {option.name}
                                          {optionDetail.count > 1 && <span className="ml-1">({optionDetail.count} documents)</span>}
                                        </span>
                                        <span className="font-semibold text-gray-700">€{optionDetail.total.toFixed(2)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Signatories breakdown */}
                              {signatoriesTotal > 0 && (
                                <div className="ml-4 mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 italic">+ Additional Signatories</span>
                                    <span className="font-semibold text-gray-700">€{signatoriesTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Total */}
                        <div className="mt-4 pt-4 border-t-2 border-gray-300">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-bold text-gray-900">Total Amount</span>
                            <span className="text-2xl font-bold text-gray-900">
                              €{(() => {
                                let grandTotal = 0;
                                
                                // Calculate services and options costs
                                selectedServices.forEach(serviceId => {
                                  const service = servicesMap[serviceId];
                                  const documents = serviceDocuments[serviceId] || [];
                                  if (service) {
                                    grandTotal += documents.length * (parseFloat(service.base_price) || 0);
                                    documents.forEach(doc => {
                                      if (doc.selectedOptions) {
                                        doc.selectedOptions.forEach(optionId => {
                                          const option = optionsMap[optionId];
                                          if (option) {
                                            grandTotal += parseFloat(option.additional_price) || 0;
                                          }
                                        });
                                      }
                                    });
                                  }
                                });
                                
                                // Calculate additional signatories cost (€10 per additional signatory)
                                if (signatories.length > 0) {
                                  // Group signatories by document_key
                                  const signatoriesByDoc = {};
                                  signatories.forEach(sig => {
                                    if (!signatoriesByDoc[sig.document_key]) {
                                      signatoriesByDoc[sig.document_key] = [];
                                    }
                                    signatoriesByDoc[sig.document_key].push(sig);
                                  });
                                  
                                  // Calculate cost for each document
                                  Object.values(signatoriesByDoc).forEach(docSignatories => {
                                    if (docSignatories.length > 1) {
                                      // First signatory is included, count additional ones
                                      grandTotal += (docSignatories.length - 1) * 10;
                                    }
                                  });
                                } else {
                                  // Use signatories from submission.data (if not yet paid)
                                  const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
                                  Object.values(signatoriesFromData).forEach(docSignatories => {
                                    if (Array.isArray(docSignatories) && docSignatories.length > 1) {
                                      // First signatory is included, count additional ones
                                      grandTotal += (docSignatories.length - 1) * 10;
                                    }
                                  });
                                }
                                
                                return grandTotal.toFixed(2);
                              })()}
                            </span>
                          </div>
                          
                          {/* Stripe Actions */}
                          {submission.data?.payment?.stripe_session_id && (() => {
                            // Extract account ID from Stripe secret key (if available) or use default
                            // Format: sk_test_XXXXX or sk_live_XXXXX
                            // Account ID format: acct_XXXXX
                            const stripeAccountId = 'acct_1SOkkU21pQO5v0OI'; // Default account ID, should be from env
                            const isTestMode = true; // Should be determined from Stripe key or env
                            const env = isTestMode ? 'test' : 'live';
                            
                            // Get payment_intent_id from payment data
                            const paymentIntentId = submission.data?.payment?.payment_intent_id;
                            
                            // Construct Stripe dashboard URL
                            const stripeUrl = paymentIntentId 
                              ? `https://dashboard.stripe.com/${stripeAccountId}/${env}/payments/${paymentIntentId}`
                              : null;
                            
                            return (
                              <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                  onClick={async () => {
                                  const confirmed = await confirm({
                                    title: 'Refund Payment',
                                    message: `Are you sure you want to refund the full payment amount of €${(submission.data.payment.amount_paid / 100).toFixed(2)}? This action cannot be undone.`,
                                    confirmText: 'Refund',
                                    cancelText: 'Cancel',
                                    type: 'danger',
                                  });

                                  if (!confirmed) return;

                                  // Set loading state in confirm dialog
                                  setConfirmLoading(true);

                                  try {
                                    const paymentInfo = submission.data.payment;
                                    if (!paymentInfo.stripe_session_id) {
                                      toast.error('No payment session found');
                                      setConfirmLoading(false);
                                      return;
                                    }

                                    // Retrieve session to get payment intent
                                    const { data: sessionData, error: sessionError } = await supabase.functions.invoke('verify-payment', {
                                      body: { sessionId: paymentInfo.stripe_session_id }
                                    });

                                    if (sessionError) throw sessionError;

                                    // Create full refund
                                    const { data: refundResult, error: refundError } = await supabase.functions.invoke('update-payment', {
                                      body: {
                                        submissionId: id,
                                        newAmount: 0,
                                        oldAmount: paymentInfo.amount_paid / 100
                                      }
                                    });

                                    if (refundError) throw refundError;

                                    if (refundResult?.success) {
                                      // Update submission status to cancelled
                                      const { error: statusError } = await supabase
                                        .from('submission')
                                        .update({
                                          status: 'cancelled',
                                          updated_at: new Date().toISOString()
                                        })
                                        .eq('id', id);

                                      if (statusError) {
                                        console.error('Error updating submission status:', statusError);
                                      }

                                      toast.success(`Payment refunded successfully: ${refundResult.message}`);
                                      await fetchSubmissionDetail();
                                      // Close confirm dialog after successful refund
                                      setConfirmLoading(false);
                                      closeConfirm();
                                    } else {
                                      toast.error('Refund failed');
                                      setConfirmLoading(false);
                                    }
                                  } catch (error) {
                                    console.error('Error refunding payment:', error);
                                    toast.error(`Failed to refund payment: ${error.message}`);
                                    setConfirmLoading(false);
                                  }
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Icon icon="heroicons:arrow-path" className="w-5 h-5" />
                                Refund Payment
                              </button>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-600">No services selected.</p>
                    )}
                  </div>
                </div>
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
                                          <div className="flex items-center gap-1">
                                            <DocumentViewer
                                              fileUrl={doc.public_url}
                                              fileName={doc.name}
                                              fileType={doc.type}
                                              fileSize={doc.size}
                                            />
                                            <button
                                              onClick={() => downloadDocument(doc.public_url, doc.name)}
                                              className="ml-3 text-black hover:text-gray-700 font-medium text-xs flex items-center flex-shrink-0"
                                              title="Télécharger"
                                            >
                                              <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-1" />
                                              Download
                                            </button>
                                          </div>
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

            {/* Signatories Tab */}
            {activeTab === 'signatories' && (() => {
              // Get signatories from database (if payment completed) or from submission.data (if not yet paid)
              const signatoriesFromData = submission?.data?.signatoriesByDocument || {};
              const hasSignatoriesInDB = signatories.length > 0;
              const hasSignatoriesInData = Object.keys(signatoriesFromData).length > 0 && 
                Object.values(signatoriesFromData).some(sigs => sigs && sigs.length > 0);

              if (!hasSignatoriesInDB && !hasSignatoriesInData) {
                return (
                  <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <Icon icon="heroicons:user-group" className="w-5 h-5 text-gray-600" />
                      </div>
                      Signatories
                    </h2>
                    <p className="text-base text-gray-600">No signatories added for this submission.</p>
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
                    postal_address: sig.postal_address,
                    email: sig.email || null,
                    phone: sig.phone || null
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
                      postal_address: sig.postalAddress || sig.postal_address,
                      email: sig.email || null,
                      phone: sig.phone || null
                    }));
                  }
                });
              }

              if (Object.keys(signatoriesByDoc).length === 0) {
                return (
                  <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <Icon icon="heroicons:user-group" className="w-5 h-5 text-gray-600" />
                      </div>
                      Signatories
                    </h2>
                    <p className="text-base text-gray-600">No signatories added for this submission.</p>
                  </div>
                );
              }

              return (
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      <Icon icon="heroicons:user-group" className="w-5 h-5 text-gray-600" />
                    </div>
                    Signatories
                  </h2>
                  <div className="space-y-4">
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
                          showPrices={true}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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
                              <DocumentViewer
                                fileUrl={file.file_url}
                                fileName={file.file_name}
                                fileType={file.file_type || file.mime_type}
                                fileSize={file.file_size}
                              />
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center flex-shrink-0"
                                title="Télécharger"
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

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions Stripe</h2>
                
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-base text-gray-600">Aucune transaction trouvée pour cette soumission.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Montant</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Téléphone</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((tx) => {
                          const formatDate = (timestamp) => {
                            return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          };

                          const formatCurrency = (amount, currency = 'eur') => {
                            return new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(amount);
                          };

                          const getStatusBadge = (status, type) => {
                            const badges = {
                              succeeded: 'bg-green-100 text-green-700',
                              paid: 'bg-green-100 text-green-700',
                              failed: 'bg-red-100 text-red-700',
                              pending: 'bg-gray-100 text-gray-700',
                              processing: 'bg-blue-100 text-blue-700',
                              canceled: 'bg-gray-100 text-gray-700',
                            };

                            const displayStatus = type === 'refund' ? 'REFUND' : (status?.toUpperCase() || 'UNKNOWN');
                            
                            // Use purple color for refunds
                            const badgeClass = type === 'refund' 
                              ? 'bg-purple-100 text-purple-700'
                              : (badges[status] || badges.pending);

                            return (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                                {displayStatus}
                              </span>
                            );
                          };

                          return (
                            <tr key={`${tx.type}-${tx.id}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {tx.type === 'refund' ? 'Remboursement' : 'Paiement'}
                                </div>
                                <div className="text-xs text-gray-600 font-mono">
                                  {tx.id}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className={`text-sm font-semibold ${tx.type === 'refund' ? 'text-red-600' : 'text-gray-900'}`}>
                                  {tx.type === 'refund' ? '-' : ''}{formatCurrency(tx.amount, tx.currency)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {tx.email || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {tx.phone || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getStatusBadge(tx.status, tx.type)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(tx.created)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                {tx.stripeUrl && (
                                  <a
                                    href={tx.stripeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    title="Voir sur Stripe"
                                  >
                                    <Icon icon="heroicons:arrow-top-right-on-square" className="w-4 h-4 mr-1" />
                                    Stripe
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline</h2>
                
                {timelineLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : timeline.length === 0 ? (
                  <p className="text-base text-gray-600">Aucune action enregistrée pour cette soumission.</p>
                ) : (
                  <div className="space-y-4">
                    {timeline.map((entry, index) => {
                      const formatDate = (dateString) => {
                        return new Date(dateString).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      };

                      const getActionIcon = (actionType) => {
                        const icons = {
                          status_changed: 'heroicons:check-circle',
                          notary_assigned: 'heroicons:user-plus',
                          notary_unassigned: 'heroicons:user-minus',
                          appointment_updated: 'heroicons:calendar',
                          note_added: 'heroicons:document-plus',
                          note_deleted: 'heroicons:trash',
                          submission_created: 'heroicons:plus-circle',
                          payment_status_changed: 'heroicons:credit-card',
                          payment_received: 'heroicons:credit-card',
                          price_updated: 'heroicons:currency-dollar',
                          notary_cost_updated: 'heroicons:banknotes',
                          file_uploaded: 'heroicons:document-arrow-up',
                          file_deleted: 'heroicons:document-x-mark',
                          message_sent: 'heroicons:chat-bubble-left-right',
                          default: 'heroicons:information-circle'
                        };
                        return icons[actionType] || icons.default;
                      };

                      const getActionColor = (actionType) => {
                        const colors = {
                          status_changed: 'bg-blue-100 text-blue-700',
                          notary_assigned: 'bg-green-100 text-green-700',
                          notary_unassigned: 'bg-orange-100 text-orange-700',
                          appointment_updated: 'bg-yellow-100 text-yellow-700',
                          note_added: 'bg-purple-100 text-purple-700',
                          note_deleted: 'bg-red-100 text-red-700',
                          submission_created: 'bg-gray-100 text-gray-700',
                          payment_status_changed: 'bg-emerald-100 text-emerald-700',
                          payment_received: 'bg-green-100 text-green-700',
                          price_updated: 'bg-indigo-100 text-indigo-700',
                          notary_cost_updated: 'bg-teal-100 text-teal-700',
                          file_uploaded: 'bg-cyan-100 text-cyan-700',
                          file_deleted: 'bg-red-100 text-red-700',
                          message_sent: 'bg-pink-100 text-pink-700',
                          default: 'bg-gray-100 text-gray-700'
                        };
                        return colors[actionType] || colors.default;
                      };

                      return (
                        <div key={entry.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getActionColor(entry.action_type)} flex items-center justify-center`}>
                            <Icon icon={getActionIcon(entry.action_type)} className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-900">{entry.action_description}</p>
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{formatDate(entry.created_at)}</span>
                            </div>
                            <div className="text-xs text-gray-600 capitalize mb-1">
                              Par {entry.performed_by_type}
                            </div>
                            {entry.old_value && entry.new_value && (
                              <div className="mt-2 text-xs text-gray-600">
                                <span className="line-through text-red-600">{entry.old_value}</span>
                                {' → '}
                                <span className="text-green-600 font-semibold">{entry.new_value}</span>
                              </div>
                            )}
                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                {entry.action_type === 'file_uploaded' && (
                                  <div>
                                    <span className="font-semibold">File:</span> {entry.metadata.file_name}
                                    {entry.metadata.file_size && (
                                      <span className="ml-2">({(entry.metadata.file_size / 1024).toFixed(2)} KB)</span>
                                    )}
                                  </div>
                                )}
                                {entry.action_type === 'file_deleted' && (
                                  <div>
                                    <span className="font-semibold">File:</span> {entry.metadata.file_name}
                                  </div>
                                )}
                                {entry.action_type === 'message_sent' && (
                                  <div>
                                    <span className="font-semibold">Preview:</span> {entry.metadata.message_preview}
                                    {entry.metadata.has_attachments && (
                                      <span className="ml-2 text-blue-600">📎</span>
                                    )}
                                  </div>
                                )}
                                {entry.action_type === 'appointment_updated' && entry.metadata.old_date && (
                                  <div className="space-y-1">
                                    <div>
                                      <span className="font-semibold">Old:</span> {entry.metadata.old_date} {entry.metadata.old_time} ({entry.metadata.old_timezone})
                                    </div>
                                    <div>
                                      <span className="font-semibold">New:</span> {entry.metadata.new_date} {entry.metadata.new_time} ({entry.metadata.new_timezone})
                                    </div>
                                  </div>
                                )}
                                {entry.action_type === 'notary_assigned' && entry.metadata.notary_id && (
                                  <div>
                                    <span className="font-semibold">Notary ID:</span> {entry.metadata.notary_id.substring(0, 8)}...
                                  </div>
                                )}
                                {entry.action_type === 'payment_status_changed' && (
                                  <div className="space-y-1">
                                    {entry.metadata.payment_intent_id && (
                                      <div>
                                        <span className="font-semibold">Payment Intent:</span> {entry.metadata.payment_intent_id.substring(0, 20)}...
                                      </div>
                                    )}
                                    {entry.metadata.amount && (
                                      <div>
                                        <span className="font-semibold">Amount:</span> €{(parseFloat(entry.metadata.amount) / 100).toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Internal Notes Tab */}
            {activeTab === 'notes' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Note interne</h2>
                  {!isAddingNote && (
                    <button
                      onClick={() => setIsAddingNote(true)}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Icon icon="heroicons:plus" className="w-4 h-4" />
                      Ajouter une note
                    </button>
                  )}
                </div>

                {/* Add Note Form */}
                {isAddingNote && noteEditor && (
                  <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
                    <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
                      {/* Toolbar */}
                      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-300 flex-wrap">
                        <button
                          onClick={() => noteEditor.chain().focus().toggleBold().run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('bold') ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          <Icon icon="heroicons:bold" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => noteEditor.chain().focus().toggleItalic().run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('italic') ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          <Icon icon="heroicons:italic" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => noteEditor.chain().focus().toggleBulletList().run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          <Icon icon="heroicons:list-bullet" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => noteEditor.chain().focus().toggleOrderedList().run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          <Icon icon="heroicons:list-numbered" className="w-4 h-4" />
                        </button>
                        <div className="border-l border-gray-300 h-6 mx-1"></div>
                        <button
                          onClick={() => noteEditor.chain().focus().setParagraph().run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('paragraph') ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          <Icon icon="heroicons:document-text" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => noteEditor.chain().focus().toggleHeading({ level: 1 }).run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          H1
                        </button>
                        <button
                          onClick={() => noteEditor.chain().focus().toggleHeading({ level: 2 }).run()}
                          className={`p-2 rounded hover:bg-gray-200 ${noteEditor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
                          type="button"
                        >
                          H2
                        </button>
                      </div>
                      {/* Editor */}
                      <EditorContent editor={noteEditor} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveInternalNote}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingNote(false);
                          noteEditor.commands.clearContent();
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes List */}
                {notesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : internalNotes.length === 0 ? (
                  <p className="text-base text-gray-600">Aucune note interne pour cette soumission.</p>
                ) : (
                  <div className="space-y-4">
                    {internalNotes.map((note) => {
                      const formatDate = (dateString) => {
                        return new Date(dateString).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      };

                      return (
                        <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-xs text-gray-500">
                              Créé le {formatDate(note.created_at)}
                              {note.updated_at !== note.created_at && (
                                <span className="ml-2">• Modifié le {formatDate(note.updated_at)}</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this note?')) {
                                  deleteInternalNote(note.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Icon icon="heroicons:trash" className="w-4 h-4" />
                            </button>
                          </div>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: note.content }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Edit Submission Tab */}
            {submission?.status !== 'cancelled' && activeTab === 'edit' && (
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
                  <div className="space-y-4">
                    {allServices.map((service) => {
                      const isSelected = editFormData.selectedServices.includes(service.service_id);
                      const documents = editFormData.serviceDocuments[service.service_id] || [];
                      const isApostilleService = service.service_id === '473fb677-4dd3-4766-8221-0250ea3440cd';

                      return (
                        <div key={service.id} className="bg-white rounded-xl p-4 border-2 border-gray-200">
                          {/* Service Checkbox */}
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newServiceDocuments = {
                                    ...editFormData.serviceDocuments,
                                    [service.service_id]: editFormData.serviceDocuments[service.service_id] || []
                                  };
                                  
                                  // Ensure at least one signatory per document
                                  const newSignatoriesByDocument = { ...editFormData.signatoriesByDocument };
                                  const docs = newServiceDocuments[service.service_id] || [];
                                  docs.forEach((doc, docIndex) => {
                                    const docKey = `${service.service_id}_${docIndex}`;
                                    if (!newSignatoriesByDocument[docKey] || newSignatoriesByDocument[docKey].length === 0) {
                                      newSignatoriesByDocument[docKey] = [{
                                        firstName: '',
                                        lastName: '',
                                        birthDate: '',
                                        birthCity: '',
                                        postalAddress: '',
                                        email: '',
                                        phone: ''
                                      }];
                                    }
                                  });
                                  
                                  setEditFormData({
                                    ...editFormData,
                                    selectedServices: [...editFormData.selectedServices, service.service_id],
                                    serviceDocuments: newServiceDocuments,
                                    signatoriesByDocument: newSignatoriesByDocument
                                  });
                                } else {
                                  const newSelected = editFormData.selectedServices.filter(id => id !== service.service_id);
                                  const newServiceDocuments = { ...editFormData.serviceDocuments };
                                  const newSignatoriesByDocument = { ...editFormData.signatoriesByDocument };
                                  
                                  // Remove signatories for this service
                                  documents.forEach((doc, docIndex) => {
                                    const docKey = `${service.service_id}_${docIndex}`;
                                    delete newSignatoriesByDocument[docKey];
                                  });
                                  
                                  delete newServiceDocuments[service.service_id];
                                  setEditFormData({
                                    ...editFormData,
                                    selectedServices: newSelected,
                                    serviceDocuments: newServiceDocuments,
                                    signatoriesByDocument: newSignatoriesByDocument
                                  });
                                }
                              }}
                              className="mt-1 w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{service.name}</p>
                              <p className="text-sm font-semibold text-gray-900 mt-2">
                                €{parseFloat(service.base_price || 0).toFixed(2)} per document
                              </p>
                            </div>
                          </label>

                          {/* Documents Management - Only show if service is selected */}
                          {isSelected && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900">Documents ({documents.length})</h3>
                                <label className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                                  <Icon icon="heroicons:plus-circle" className="w-4 h-4 inline mr-1" />
                                  Add Document
                                  <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files);
                                      if (files.length === 0) return;

                                      const convertedFiles = await Promise.all(
                                        files.map(async (file) => {
                                          return new Promise((resolve) => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              resolve({
                                                name: file.name,
                                                size: file.size,
                                                type: file.type,
                                                lastModified: file.lastModified,
                                                dataUrl: reader.result,
                                                selectedOptions: [],
                                              });
                                            };
                                            reader.readAsDataURL(file);
                                          });
                                        })
                                      );

                                      const newServiceDocuments = {
                                        ...editFormData.serviceDocuments,
                                        [service.service_id]: [...documents, ...convertedFiles]
                                      };

                                      // Ensure signatories for new documents
                                      const newSignatoriesByDocument = { ...editFormData.signatoriesByDocument };
                                      convertedFiles.forEach((doc, index) => {
                                        const docIndex = documents.length + index;
                                        const docKey = `${service.service_id}_${docIndex}`;
                                        if (!newSignatoriesByDocument[docKey]) {
                                          newSignatoriesByDocument[docKey] = [{
                                            firstName: '',
                                            lastName: '',
                                            birthDate: '',
                                            birthCity: '',
                                            postalAddress: '',
                                            email: '',
                                            phone: ''
                                          }];
                                        }
                                      });

                                      setEditFormData({
                                        ...editFormData,
                                        serviceDocuments: newServiceDocuments,
                                        signatoriesByDocument: newSignatoriesByDocument
                                      });
                                    }}
                                  />
                                </label>
                              </div>

                              {/* Documents List */}
                              {documents.length > 0 && (
                                <div className="space-y-3">
                                  {documents.map((doc, docIndex) => {
                                    const docOptions = doc.selectedOptions || [];
                                    const docKey = `${service.service_id}_${docIndex}`;

                                    return (
                                      <div key={docIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <Icon icon="heroicons:document-text" className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                              <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                                                <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                                              </div>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              const newServiceDocuments = { ...editFormData.serviceDocuments };
                                              newServiceDocuments[service.service_id] = newServiceDocuments[service.service_id].filter((_, i) => i !== docIndex);
                                              
                                              // Remove signatories for this document
                                              const newSignatoriesByDocument = { ...editFormData.signatoriesByDocument };
                                              delete newSignatoriesByDocument[docKey];
                                              
                                              // Reindex remaining signatories
                                              const remainingDocs = newServiceDocuments[service.service_id];
                                              const reindexedSignatories = {};
                                              Object.keys(newSignatoriesByDocument).forEach(key => {
                                                if (key.startsWith(`${service.service_id}_`)) {
                                                  const oldIndex = parseInt(key.split('_').pop());
                                                  if (oldIndex < docIndex) {
                                                    reindexedSignatories[key] = newSignatoriesByDocument[key];
                                                  } else if (oldIndex > docIndex) {
                                                    const newKey = `${service.service_id}_${oldIndex - 1}`;
                                                    reindexedSignatories[newKey] = newSignatoriesByDocument[key];
                                                  }
                                                } else {
                                                  reindexedSignatories[key] = newSignatoriesByDocument[key];
                                                }
                                              });

                                              if (newServiceDocuments[service.service_id].length === 0) {
                                                delete newServiceDocuments[service.service_id];
                                              }

                                              setEditFormData({
                                                ...editFormData,
                                                serviceDocuments: newServiceDocuments,
                                                signatoriesByDocument: reindexedSignatories
                                              });
                                            }}
                                            className="ml-2 text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                                          >
                                            <Icon icon="heroicons:trash" className="w-4 h-4" />
                                            Remove
                                          </button>
                                        </div>

                                        {/* Options for this document */}
                                        {!isApostilleService && allOptions.length > 0 && (
                                          <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Options:</p>
                                            <div className="space-y-2">
                                              {allOptions.map((option) => (
                                                <label key={option.option_id} className="flex items-center space-x-2 cursor-pointer group">
                                                  <input
                                                    type="checkbox"
                                                    checked={docOptions.includes(option.option_id)}
                                                    onChange={() => {
                                                      const newServiceDocuments = { ...editFormData.serviceDocuments };
                                                      const file = newServiceDocuments[service.service_id][docIndex];
                                                      
                                                      if (!file.selectedOptions) {
                                                        file.selectedOptions = [];
                                                      }
                                                      
                                                      if (file.selectedOptions.includes(option.option_id)) {
                                                        file.selectedOptions = file.selectedOptions.filter(id => id !== option.option_id);
                                                      } else {
                                                        file.selectedOptions = [...file.selectedOptions, option.option_id];
                                                      }
                                                      
                                                      setEditFormData({
                                                        ...editFormData,
                                                        serviceDocuments: newServiceDocuments
                                                      });
                                                    }}
                                                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                                                  />
                                                  <span className="text-xs font-medium text-gray-700 group-hover:text-black transition-colors">
                                                    {option.name}
                                                    <span className="text-gray-500 font-normal ml-1">
                                                      (+€{option.additional_price?.toFixed(2) || '0.00'})
                                                    </span>
                                                  </span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatories Editing */}
                {editFormData.selectedServices.length > 0 && (
                  <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Signatories</h2>
                    <div className="space-y-6">
                      {editFormData.selectedServices.map((serviceId) => {
                        const service = servicesMap[serviceId];
                        const documents = editFormData.serviceDocuments[serviceId] || [];
                        if (!service) return null;

                        return documents.map((doc, docIndex) => {
                          const docKey = `${serviceId}_${docIndex}`;
                          const docSignatories = editFormData.signatoriesByDocument[docKey] || [];
                          
                          return (
                            <div key={docKey} className="bg-white rounded-xl p-4 border border-gray-200">
                              <h3 className="font-semibold text-gray-900 mb-4">
                                {doc.name || `Document ${docIndex + 1}`} - Signatories
                              </h3>
                              <div className="space-y-4">
                                {docSignatories.map((signatory, sigIndex) => (
                                  <div key={sigIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-semibold text-gray-900">
                                        Signatory {sigIndex + 1}
                                        {sigIndex === 0 && <span className="ml-2 text-xs text-gray-500">(included)</span>}
                                        {sigIndex > 0 && <span className="ml-2 text-xs text-orange-600 font-medium">(+€10)</span>}
                                      </span>
                                      {sigIndex > 0 && (
                                        <button
                                          onClick={() => {
                                            const newSignatories = docSignatories.filter((_, i) => i !== sigIndex);
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: newSignatories
                                              }
                                            });
                                          }}
                                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                                        <input
                                          type="text"
                                          value={signatory.firstName || ''}
                                          onChange={(e) => {
                                            const updated = [...docSignatories];
                                            updated[sigIndex] = { ...updated[sigIndex], firstName: e.target.value };
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: updated
                                              }
                                            });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                                        <input
                                          type="text"
                                          value={signatory.lastName || ''}
                                          onChange={(e) => {
                                            const updated = [...docSignatories];
                                            updated[sigIndex] = { ...updated[sigIndex], lastName: e.target.value };
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: updated
                                              }
                                            });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                                        <input
                                          type="date"
                                          value={signatory.birthDate || ''}
                                          onChange={(e) => {
                                            const updated = [...docSignatories];
                                            updated[sigIndex] = { ...updated[sigIndex], birthDate: e.target.value };
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: updated
                                              }
                                            });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Birth City</label>
                                        <input
                                          type="text"
                                          value={signatory.birthCity || ''}
                                          onChange={(e) => {
                                            const updated = [...docSignatories];
                                            updated[sigIndex] = { ...updated[sigIndex], birthCity: e.target.value };
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: updated
                                              }
                                            });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Postal Address</label>
                                        <input
                                          type="text"
                                          value={signatory.postalAddress || ''}
                                          onChange={(e) => {
                                            const updated = [...docSignatories];
                                            updated[sigIndex] = { ...updated[sigIndex], postalAddress: e.target.value };
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: updated
                                              }
                                            });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                                          placeholder="Enter full address"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                                        <input
                                          type="email"
                                          value={signatory.email || ''}
                                          onChange={(e) => {
                                            const updated = [...docSignatories];
                                            updated[sigIndex] = { ...updated[sigIndex], email: e.target.value };
                                            setEditFormData({
                                              ...editFormData,
                                              signatoriesByDocument: {
                                                ...editFormData.signatoriesByDocument,
                                                [docKey]: updated
                                              }
                                            });
                                            
                                            // Validate email in real-time
                                            const errorKey = `${docKey}_${sigIndex}`;
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            if (e.target.value && e.target.value.trim()) {
                                              if (!emailRegex.test(e.target.value.trim())) {
                                                setEmailErrors(prev => ({ ...prev, [errorKey]: 'Please enter a valid email address' }));
                                              } else {
                                                setEmailErrors(prev => {
                                                  const newErrors = { ...prev };
                                                  delete newErrors[errorKey];
                                                  return newErrors;
                                                });
                                              }
                                            } else {
                                              setEmailErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[errorKey];
                                                return newErrors;
                                              });
                                            }
                                          }}
                                          className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 text-sm ${
                                            emailErrors[`${docKey}_${sigIndex}`] 
                                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                                              : 'border-gray-300 focus:ring-black focus:border-black'
                                          }`}
                                          placeholder="email@example.com"
                                        />
                                        {emailErrors[`${docKey}_${sigIndex}`] && (
                                          <p className="mt-1 text-xs text-red-600 flex items-center">
                                            <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                                            <span>{emailErrors[`${docKey}_${sigIndex}`]}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                                        <div className={`flex items-center bg-white border rounded-lg overflow-hidden focus-within:ring-2 pl-2 pr-2 ${
                                          phoneErrors[`${docKey}_${sigIndex}`] 
                                            ? 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500' 
                                            : 'border-gray-300 focus-within:ring-black'
                                        }`}>
                                          <PhoneInputWrapper
                                            international
                                            defaultCountry="US"
                                            value={signatory.phone || ''}
                                            onChange={(value) => {
                                              const updated = [...docSignatories];
                                              updated[sigIndex] = { ...updated[sigIndex], phone: value || '' };
                                              setEditFormData({
                                                ...editFormData,
                                                signatoriesByDocument: {
                                                  ...editFormData.signatoriesByDocument,
                                                  [docKey]: updated
                                                }
                                              });
                                              
                                              // Validate phone number in real-time
                                              const errorKey = `${docKey}_${sigIndex}`;
                                              if (value && value.length > 3) {
                                                if (!isValidPhoneNumber(value)) {
                                                  setPhoneErrors(prev => ({ ...prev, [errorKey]: 'Please enter a valid phone number' }));
                                                } else {
                                                  setPhoneErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[errorKey];
                                                    return newErrors;
                                                  });
                                                }
                                              } else if (value === '' || !value) {
                                                setPhoneErrors(prev => {
                                                  const newErrors = { ...prev };
                                                  delete newErrors[errorKey];
                                                  return newErrors;
                                                });
                                              }
                                            }}
                                            className="phone-input-integrated w-full flex text-sm"
                                            countrySelectProps={{
                                              className: "pr-1 py-2 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs"
                                            }}
                                            numberInputProps={{
                                              className: "flex-1 pl-1 py-2 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm"
                                            }}
                                          />
                                        </div>
                                        {phoneErrors[`${docKey}_${sigIndex}`] && (
                                          <p className="mt-1 text-xs text-red-600 flex items-center">
                                            <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                                            <span>{phoneErrors[`${docKey}_${sigIndex}`]}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    const newSignatory = {
                                      firstName: '',
                                      lastName: '',
                                      birthDate: '',
                                      birthCity: '',
                                      postalAddress: '',
                                      email: '',
                                      phone: ''
                                    };
                                    setEditFormData({
                                      ...editFormData,
                                      signatoriesByDocument: {
                                        ...editFormData.signatoriesByDocument,
                                        [docKey]: [...docSignatories, newSignatory]
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Icon icon="heroicons:plus-circle" className="w-5 h-5" />
                                  Add Signatory (+$10)
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                )}

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
              </div>
            )}
          </div>

          {/* Right Column - Chat or Price Details */}
          <div className="lg:col-span-1">
            {activeTab === 'edit' ? (
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="bg-[#F3F4F6] rounded-2xl p-6 border-2 border-gray-300">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      <Icon icon="heroicons:currency-dollar" className="w-5 h-5 text-gray-600" />
                    </div>
                    Price Details
                  </h2>
                  <div className="space-y-3">
                    {editFormData.selectedServices.length > 0 ? (
                      <>
                        {editFormData.selectedServices.map((serviceId) => {
                          const service = servicesMap[serviceId];
                          const documents = editFormData.serviceDocuments[serviceId] || [];
                          if (!service) return null;

                          const serviceTotal = documents.length * (parseFloat(service.base_price) || 0);
                          let signatoriesTotal = 0;
                          
                          // Track count per option for detailed display
                          const optionCounts = {};

                          // Calculate options total and collect details for this service
                          documents.forEach(doc => {
                            if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                              doc.selectedOptions.forEach(optionId => {
                                const option = optionsMap[optionId];
                                if (option) {
                                  const optionPrice = parseFloat(option.additional_price) || 0;
                                  // Track option count
                                  if (!optionCounts[optionId]) {
                                    optionCounts[optionId] = {
                                      option: option,
                                      count: 0,
                                      total: 0
                                    };
                                  }
                                  optionCounts[optionId].count += 1;
                                  optionCounts[optionId].total += optionPrice;
                                }
                              });
                            }
                          });

                          // Calculate signatories cost for this service
                          documents.forEach((doc, docIndex) => {
                            const docKey = `${serviceId}_${docIndex}`;
                            const docSignatories = editFormData.signatoriesByDocument[docKey];
                            if (Array.isArray(docSignatories) && docSignatories.length > 1) {
                              signatoriesTotal += (docSignatories.length - 1) * 10; // $10 per additional signatory
                            }
                          });

                          return (
                            <div key={serviceId} className="bg-white rounded-xl p-4 border border-gray-200">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {documents.length} document{documents.length > 1 ? 's' : ''} × €{parseFloat(service.base_price || 0).toFixed(2)}
                                  </p>
                                </div>
                                <span className="font-bold text-gray-900">€{serviceTotal.toFixed(2)}</span>
                              </div>
                              
                              {/* Options breakdown - detailed */}
                              {Object.keys(optionCounts).length > 0 && (
                                <div className="ml-4 mt-2 pt-2 border-t border-gray-200 space-y-1">
                                  {Object.values(optionCounts).map((optionDetail, idx) => {
                                    const option = optionDetail.option;
                                    return (
                                      <div key={option.option_id || idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 italic">
                                          + {option.name}
                                          {optionDetail.count > 1 && <span className="ml-1">({optionDetail.count} documents)</span>}
                                        </span>
                                        <span className="font-semibold text-gray-700">€{optionDetail.total.toFixed(2)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Signatories breakdown */}
                              {signatoriesTotal > 0 && (
                                <div className="ml-4 mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 italic">+ Additional Signatories</span>
                                    <span className="font-semibold text-gray-700">€{signatoriesTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Total */}
                        <div className="mt-4 pt-4 border-t-2 border-gray-300">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total Amount</span>
                            <span className="text-2xl font-bold text-gray-900">${calculatedPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-600">No services selected.</p>
                    )}
                  </div>

                  {/* Stripe Actions */}
                  {submission.data?.payment?.stripe_session_id && (() => {
                    // Extract account ID from Stripe secret key (if available) or use default
                    const stripeAccountId = 'acct_1SOkkU21pQO5v0OI'; // Default account ID, should be from env
                    const isTestMode = true; // Should be determined from Stripe key or env
                    const env = isTestMode ? 'test' : 'live';
                    
                    // Get payment_intent_id from payment data, or use stripe_session_id as fallback
                    const paymentIntentId = submission.data?.payment?.payment_intent_id;
                    const sessionId = submission.data?.payment?.stripe_session_id;
                    
                    // Construct Stripe dashboard URL - use payment_intent_id if available, otherwise use session_id
                    const stripeUrl = paymentIntentId 
                      ? `https://dashboard.stripe.com/${stripeAccountId}/${env}/payments/${paymentIntentId}`
                      : sessionId
                        ? `https://dashboard.stripe.com/${stripeAccountId}/${env}/payments/${sessionId}`
                        : null;
                    
                    return null;
                  })()}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 mt-6">
                    <button
                      onClick={handleUpdateSubmission}
                      disabled={!isFormValid || isSaving}
                      className={`btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 w-full flex items-center justify-center gap-2 ${
                        !isFormValid || isSaving ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingSubmission(false);
                        setActiveTab('details');
                        // Reset form data
                        // Get signatories from already loaded data (signatories state or submission.data)
                        let resetSignatoriesData = {};
                        
                        if (signatories.length > 0) {
                          // Convert database signatories to editFormData format
                          signatories.forEach(sig => {
                            if (!resetSignatoriesData[sig.document_key]) {
                              resetSignatoriesData[sig.document_key] = [];
                            }
                            resetSignatoriesData[sig.document_key].push({
                              firstName: sig.first_name,
                              lastName: sig.last_name,
                              birthDate: sig.birth_date,
                              birthCity: sig.birth_city,
                              postalAddress: sig.postal_address,
                              email: sig.email || '',
                              phone: sig.phone || ''
                            });
                          });
                        } else {
                          // Use signatories from submission.data
                          const signatoriesFromData = submission.data?.signatoriesByDocument || {};
                          Object.entries(signatoriesFromData).forEach(([docKey, sigs]) => {
                            if (sigs && sigs.length > 0) {
                              resetSignatoriesData[docKey] = sigs.map(sig => ({
                                firstName: sig.firstName || sig.first_name,
                                lastName: sig.lastName || sig.last_name,
                                birthDate: sig.birthDate || sig.birth_date,
                                birthCity: sig.birthCity || sig.birth_city,
                                postalAddress: sig.postalAddress || sig.postal_address,
                                email: sig.email || '',
                                phone: sig.phone || ''
                              }));
                            }
                          });
                        }

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
                          signatoriesByDocument: resetSignatoriesData,
                          notary_cost: submission.notary_cost || 0
                        });
                        const initialPrice = calculatePriceHelper(
                          submission.data?.selectedServices || [],
                          submission.data?.serviceDocuments || {},
                          servicesMap,
                          optionsMap,
                          resetSignatoriesData
                        );
                        setCalculatedPrice(initialPrice);
                      }}
                      className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors w-full"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubmissionDetail;

