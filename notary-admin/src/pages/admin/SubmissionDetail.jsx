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
  const [emails, setEmails] = useState([]);
  const [sms, setSms] = useState([]);
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [editFormData, setEditFormData] = useState({
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
  }, []);

  useEffect(() => {
    if (adminInfo) {
      fetchSubmissionDetail();
    }
  }, [id, adminInfo]);

  // Validate form whenever editFormData changes
  useEffect(() => {
    if (false && Object.keys(servicesMap).length > 0) {
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
  }, [editFormData, servicesMap, phoneErrors, emailErrors]);

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

  // Fetch emails when emails tab is active
  useEffect(() => {
    if (activeTab === 'emails' && submission?.email) {
      fetchEmails();
    }
  }, [activeTab, submission?.email]);

  // Fetch SMS when sms tab is active
  useEffect(() => {
    if (activeTab === 'sms' && id) {
      fetchSMS();
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

  const fetchEmails = async () => {
    if (!submission?.email && !submission?.id) return;
    
    try {
      // Récupérer TOUS les emails envoyés pour cette submission
      const { data: emailsData, error: emailsError } = await supabase
        .from('email_sent')
        .select('*')
        .or(`submission_id.eq.${submission.id},email.eq.${submission.email || ''}`)
        .order('sent_at', { ascending: false });

      if (emailsError) throw emailsError;

      // Format emails for display
      const formattedEmails = (emailsData || []).map(email => {
        // Determine status based on events
        let status = 'sent';
        if (email.dropped_at) status = 'dropped';
        else if (email.bounced_at) status = 'bounced';
        else if (email.spam_reported_at) status = 'spam';
        else if (email.unsubscribed_at) status = 'unsubscribed';
        else if (email.delivered_at) status = 'delivered';
        else if (email.sent_at) status = 'sent';

        // Determine type label
        let typeLabel = email.email_type;
        if (email.email_type?.startsWith('abandoned_cart_')) {
          typeLabel = 'Séquence de relance';
        } else if (email.email_type === 'payment_success') {
          typeLabel = 'Confirmation de paiement';
        } else if (email.email_type === 'payment_failed') {
          typeLabel = 'Échec de paiement';
        } else if (email.email_type === 'notarized_file_uploaded') {
          typeLabel = 'Fichier notarisé';
        } else if (email.email_type === 'message_received') {
          typeLabel = 'Message reçu';
        } else if (email.email_type === 'submission_updated') {
          typeLabel = 'Mise à jour de soumission';
        } else {
          typeLabel = email.email_type || 'Transactionnel';
        }

        return {
          id: email.id,
          type: email.email_type?.startsWith('abandoned_cart_') ? 'sequence' : 'transactional',
          typeLabel: typeLabel,
          subject: email.subject,
          html_content: email.html_content,
          sent_at: email.sent_at,
          delivered_at: email.delivered_at,
          opened_at: email.opened_at,
          clicked_at: email.clicked_at,
          clicked_url: email.clicked_url,
          bounced_at: email.bounced_at,
          bounce_reason: email.bounce_reason,
          status: status,
          sequence_step: email.email_type?.startsWith('abandoned_cart_') 
            ? email.email_type.replace('abandoned_cart_', '') 
            : null,
        };
      });

      setEmails(formattedEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Erreur lors du chargement des emails');
    }
  };

  const fetchSMS = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('sms_sent')
        .select('*')
        .eq('submission_id', id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const formattedSMS = (data || []).map(sms => {
        let typeLabel = sms.sms_type;
        if (sms.sms_type?.startsWith('abandoned_cart_')) {
          typeLabel = 'Séquence de relance';
        } else if (sms.sms_type === 'notification') {
          typeLabel = 'Notification';
        } else {
          typeLabel = sms.sms_type || 'Autre';
        }

        // Determine status based on timestamps
        let status = 'sent';
        if (sms.failed_at) status = 'failed';
        else if (sms.delivered_at) status = 'delivered';
        else if (sms.sent_at) status = 'sent';
        else status = 'pending';

        return {
          ...sms,
          typeLabel: typeLabel,
          status: status,
        };
      });

      setSms(formattedSMS);
    } catch (error) {
      console.error('Error fetching SMS:', error);
      toast.error('Erreur lors du chargement des SMS');
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

  const fetchSubmissionDetail = async () => {
    try {
      setLoading(true);
      
      let { data: submissionData, error: submissionError } = await supabase
        .from('submission')
        .select(`
          *,
          client:client_id(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (submissionError) throw submissionError;
      if (!submissionData) throw new Error('Submission not found');

      setSubmission(submissionData);

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
        first_name: submissionData.first_name || '',
        last_name: submissionData.last_name || '',
        email: submissionData.email || '',
        phone: submissionData.phone || '',
        address: submissionData.address || '',
        city: submissionData.city || '',
        postal_code: submissionData.postal_code || '',
        country: submissionData.country || '',
        notes: submissionData.notes || '',
        selectedServices: submissionData.data?.selectedServices || submissionData.data?.selected_services || [],
        serviceDocuments: submissionData.data?.serviceDocuments || submissionData.data?.documents || {},
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

      // Get services and documents from submission.data
      const selectedServicesFromData = submissionData.data?.selectedServices || submissionData.data?.selected_services || [];
      let serviceDocumentsFromData = submissionData.data?.serviceDocuments || submissionData.data?.documents || {};

      // Merge documents from submission_files with documents from submission.data to get public_url
      if (docsData && docsData.length > 0) {
        // Create a map of documents by name for quick lookup (normalize names for matching)
        const docsByName = {};
        docsData.forEach(doc => {
          const fileName = doc.file_name || doc.name;
          if (fileName) {
            // Normalize filename for matching (remove path, lowercase)
            const normalizedName = fileName.toLowerCase().trim();
            docsByName[normalizedName] = doc;
            // Also store with original case
            docsByName[fileName] = doc;
          }
        });

        // Update serviceDocumentsFromData with public_url from submission_files
        Object.keys(serviceDocumentsFromData).forEach(serviceId => {
          const documents = serviceDocumentsFromData[serviceId] || [];
          if (Array.isArray(documents)) {
            serviceDocumentsFromData[serviceId] = documents.map(doc => {
              const fileName = doc.name || doc.file_name;
              if (!fileName) return doc;
              
              // Try exact match first
              let fileFromDB = docsByName[fileName];
              // Try normalized match
              if (!fileFromDB) {
                fileFromDB = docsByName[fileName.toLowerCase().trim()];
              }
              
              if (fileFromDB && fileFromDB.file_url) {
                return {
                  ...doc,
                  public_url: fileFromDB.file_url,
                  url: fileFromDB.file_url,
                  file_url: fileFromDB.file_url,
                  // Keep original dataUrl if no public_url exists
                  dataUrl: doc.dataUrl || (fileFromDB.file_url ? undefined : doc.dataUrl)
                };
              }
              return doc;
            });
          }
        });
        
        console.log('📄 [SubmissionDetail] Merged documents:', {
          docsFromDB: docsData.length,
          servicesWithDocs: Object.keys(serviceDocumentsFromData).length,
          mergedDocs: serviceDocumentsFromData
        });
        
        // Update submissionData.data with merged documents
        if (!submissionData.data) {
          submissionData.data = {};
        }
        submissionData.data.serviceDocuments = serviceDocumentsFromData;
        submissionData.data.selectedServices = selectedServicesFromData;
      }

      // Fetch only the services that are in submission.data
      let sMap = {};
      if (selectedServicesFromData.length > 0) {
      const { data: servicesData } = await supabase
        .from('services')
          .select('*')
          .in('service_id', selectedServicesFromData);

      if (servicesData) {
        servicesData.forEach(service => {
          sMap[service.service_id] = service;
        });
        }
      }
      setServicesMap(sMap);

      // Get all option IDs from documents in submission.data
      const optionIds = new Set();
      Object.values(serviceDocumentsFromData).forEach((documents) => {
        if (Array.isArray(documents)) {
          documents.forEach(doc => {
            if (doc.selectedOptions && Array.isArray(doc.selectedOptions)) {
              doc.selectedOptions.forEach(optionId => optionIds.add(optionId));
            }
          });
        }
      });

      // Fetch only the options that are in submission.data
      let oMap = {};
      if (optionIds.size > 0) {
      const { data: optionsData } = await supabase
        .from('options')
        .select('*')
          .in('option_id', Array.from(optionIds));

      if (optionsData) {
        optionsData.forEach(option => {
          oMap[option.option_id] = option;
        });
      }
      setAllOptions(optionsData || []);
      } else {
        setAllOptions([]);
      }
      setOptionsMap(oMap);

      // Fetch all services for editing (if needed)
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
        selectedServicesFromData, 
        serviceDocumentsFromData, 
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
    if (!dateString) return 'N/A';
    try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (error) {
      return 'N/A';
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

  const selectedServices = submission.data?.selectedServices || submission.data?.selected_services || [];
  const serviceDocuments = submission.data?.serviceDocuments || submission.data?.documents || {};

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
              <button
                onClick={() => {
                  setActiveTab('notarized');
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
              <button
                onClick={() => {
                  setActiveTab('emails');
                }}
                className={`pb-3 text-sm font-medium transition-colors relative flex items-center ${
                  activeTab === 'emails' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon icon="heroicons:envelope" className="w-5 h-5 mr-2" />
                Emails
                {emails.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                    {emails.length}
                  </span>
                )}
                {activeTab === 'emails' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('sms');
                }}
                className={`pb-3 text-sm font-medium transition-colors relative flex items-center ${
                  activeTab === 'sms' ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon icon="heroicons:chat-bubble-left-right" className="w-5 h-5 mr-2" />
                SMS
                {sms.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                    {sms.length}
                  </span>
                )}
                {activeTab === 'sms' && (
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

                          // Signatories are global for the entire submission, not per service/document
                          // Don't show signatories cost per service

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
                                
                                // Calculate additional signatories cost (€10 per additional signatory) - global for entire submission
                                if (signatories.length > 0) {
                                  // Get unique signatories (they're global, not per document)
                                  const uniqueSignatories = new Set();
                                  signatories.forEach(sig => {
                                    const key = `${sig.first_name}_${sig.last_name}_${sig.birth_date}`;
                                    uniqueSignatories.add(key);
                                  });
                                  
                                  const uniqueCount = uniqueSignatories.size;
                                  if (uniqueCount > 1) {
                                    // First signatory is included, count additional ones
                                    grandTotal += (uniqueCount - 1) * 10;
                                  }
                                } else {
                                  // Use signatories from submission.data (if not yet paid)
                                  // Support both new format (signatories array) and old format (signatoriesByDocument)
                                  const signatoriesFromData = submission?.data?.signatories || submission?.data?.signatoriesByDocument || {};
                                  if (Array.isArray(signatoriesFromData)) {
                                    // New format: global signatories
                                    if (signatoriesFromData.length > 1) {
                                      grandTotal += (signatoriesFromData.length - 1) * 10;
                                    }
                                  } else {
                                    // Old format: signatoriesByDocument - count unique signatories across all documents
                                    const uniqueSignatories = new Set();
                                    Object.values(signatoriesFromData).forEach(docSignatories => {
                                      if (Array.isArray(docSignatories)) {
                                        docSignatories.forEach(sig => {
                                          const key = `${sig.firstName || sig.first_name}_${sig.lastName || sig.last_name}_${sig.birthDate || sig.birth_date}`;
                                          uniqueSignatories.add(key);
                                        });
                                      }
                                    });
                                    const uniqueCount = uniqueSignatories.size;
                                    if (uniqueCount > 1) {
                                      grandTotal += (uniqueCount - 1) * 10;
                                    }
                                  }
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
                                  // Get file URL from various possible fields
                                  const fileUrl = doc.public_url || doc.dataUrl || doc.url || doc.file_url;
                                  // Get file name
                                  const fileName = doc.name || doc.file_name;
                                  // Get file type
                                  const fileType = doc.type || doc.file_type || doc.mime_type;
                                  // Get file size
                                  const fileSize = doc.size || doc.file_size;

                                  return (
                                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1">
                                          <Icon icon="heroicons:document-text" className="w-5 h-5 text-gray-600 mr-2 flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 text-sm truncate">{fileName}</p>
                                            <p className="text-xs text-gray-500">{fileSize ? (fileSize / 1024).toFixed(2) + ' KB' : 'Size unknown'}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                          {fileUrl ? (
                                            <>
                                            <DocumentViewer
                                                fileUrl={fileUrl}
                                                fileName={fileName}
                                                fileType={fileType}
                                                fileSize={fileSize}
                                            />
                                            <button
                                                onClick={() => {
                                                  if (doc.dataUrl && !doc.public_url && !doc.url && !doc.file_url) {
                                                    // Handle dataUrl (base64) download
                                                    const link = document.createElement('a');
                                                    link.href = doc.dataUrl;
                                                    link.download = fileName;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                  } else {
                                                    downloadDocument(fileUrl, fileName);
                                                  }
                                                }}
                                                className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center flex-shrink-0"
                                              title="Télécharger"
                                            >
                                                <Icon icon="heroicons:arrow-down-tray" className="w-4 h-4 mr-2" />
                                              Download
                                            </button>
                                            </>
                                          ) : (
                                            <span className="text-xs text-gray-400">No file available</span>
                                        )}
                                        </div>
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
              // Support both new format (signatories array) and old format (signatoriesByDocument)
              const signatoriesFromData = submission?.data?.signatories || submission?.data?.signatoriesByDocument || {};
              const hasSignatoriesInDB = signatories.length > 0;
              
              // Check if signatories exist in data
              let hasSignatoriesInData = false;
              
              if (Array.isArray(signatoriesFromData)) {
                // New format: global signatories array
                hasSignatoriesInData = signatoriesFromData.length > 0;
              } else if (typeof signatoriesFromData === 'object') {
                // Old format: signatoriesByDocument
                hasSignatoriesInData = Object.keys(signatoriesFromData).length > 0 && 
                  Object.values(signatoriesFromData).some(sigs => sigs && sigs.length > 0);
              }

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

              // Get global list of unique signatories (not grouped by document)
              let globalSignatoriesList = [];
              
              if (hasSignatoriesInDB) {
                // Use database signatories (after payment) - get unique signatories
                const uniqueSignatories = new Map();
                signatories.forEach(sig => {
                  const key = `${sig.first_name}_${sig.last_name}_${sig.birth_date}`;
                  if (!uniqueSignatories.has(key)) {
                    uniqueSignatories.set(key, {
                      first_name: sig.first_name,
                      last_name: sig.last_name,
                      birth_date: sig.birth_date,
                      birth_city: sig.birth_city,
                      postal_address: sig.postal_address,
                      email: sig.email || null,
                      phone: sig.phone || null
                    });
                  }
                });
                globalSignatoriesList = Array.from(uniqueSignatories.values());
              } else {
                // Use signatories from submission.data (before payment)
                if (Array.isArray(signatoriesFromData)) {
                  // New format: global signatories array
                  globalSignatoriesList = signatoriesFromData.map(sig => ({
                    first_name: sig.firstName || sig.first_name,
                    last_name: sig.lastName || sig.last_name,
                    birth_date: sig.birthDate || sig.birth_date,
                    birth_city: sig.birthCity || sig.birth_city,
                    postal_address: sig.postalAddress || sig.postal_address,
                    email: sig.email || null,
                    phone: sig.phone || null
                  }));
                } else {
                  // Old format: signatoriesByDocument - collect all unique signatories
                  const uniqueSignatories = new Map();
                  Object.values(signatoriesFromData).forEach(sigs => {
                    if (Array.isArray(sigs)) {
                      sigs.forEach(sig => {
                        const key = `${sig.firstName || sig.first_name}_${sig.lastName || sig.last_name}_${sig.birthDate || sig.birth_date}`;
                        if (!uniqueSignatories.has(key)) {
                          uniqueSignatories.set(key, {
                            first_name: sig.firstName || sig.first_name,
                            last_name: sig.lastName || sig.last_name,
                            birth_date: sig.birthDate || sig.birth_date,
                            birth_city: sig.birthCity || sig.birth_city,
                            postal_address: sig.postalAddress || sig.postal_address,
                            email: sig.email || null,
                            phone: sig.phone || null
                          });
                        }
                      });
                    }
                  });
                  globalSignatoriesList = Array.from(uniqueSignatories.values());
                }
              }

              if (globalSignatoriesList.length === 0) {
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
                  <div className="space-y-3">
                    {globalSignatoriesList.map((signatory, sigIndex) => (
                      <div key={sigIndex} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-900">
                            Signatory {sigIndex + 1}
                            {sigIndex === 0 && <span className="ml-1.5 text-[10px] text-gray-500">(included)</span>}
                            {sigIndex > 0 && <span className="ml-1.5 text-[10px] text-orange-600 font-medium">(+€10)</span>}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <span className="ml-1.5 font-medium text-gray-900">
                              {signatory.first_name} {signatory.last_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Date of Birth:</span>
                            <span className="ml-1.5 font-medium text-gray-900">
                              {signatory.birth_date}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Birth City:</span>
                            <span className="ml-1.5 font-medium text-gray-900">
                              {signatory.birth_city}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-600">Address:</span>
                            <span className="ml-1.5 font-medium text-gray-900 break-words">
                              {signatory.postal_address}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-1.5 font-medium text-gray-900 break-words">
                              {signatory.email || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <span className="ml-1.5 font-medium text-gray-900 break-words">
                              {signatory.phone || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
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

            {/* Emails Tab */}
            {activeTab === 'emails' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Emails</h2>
                <div className="space-y-4">
                  {emails.length === 0 ? (
                    <div className="text-center py-12 text-gray-600">
                      Aucun email envoyé pour cette submission
                    </div>
                  ) : (
                    emails.map((email) => {
                      const isExpanded = expandedEmails.has(email.id);
                      return (
                        <div key={email.id} className="bg-white rounded-xl p-6 border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{email.subject}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  email.status === 'delivered' || email.status === 'sent' ? 'bg-green-100 text-green-800' :
                                  email.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  email.status === 'dropped' || email.status === 'bounced' || email.status === 'spam' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {email.status === 'delivered' ? 'Livré' :
                                   email.status === 'sent' ? 'Envoyé' :
                                   email.status === 'dropped' ? 'Supprimé' :
                                   email.status === 'bounced' ? 'Rebondi' :
                                   email.status === 'spam' ? 'Spam' :
                                   email.status === 'unsubscribed' ? 'Désabonné' :
                                   email.status}
                                </span>
                                {email.type === 'sequence' && email.sequence_step && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    {email.sequence_step}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>
                                  <span className="font-medium">Type:</span> {email.typeLabel}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Icon icon="heroicons:paper-airplane" className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">Envoyé le:</span> {formatDate(email.sent_at)}
                                </div>
                                {email.delivered_at && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <Icon icon="heroicons:check-circle" className="w-4 h-4" />
                                    <span className="font-medium">Livré le:</span> {formatDate(email.delivered_at)}
                                  </div>
                                )}
                                {email.opened_at && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <Icon icon="heroicons:eye" className="w-4 h-4" />
                                    <span className="font-medium">Ouvert le:</span> {formatDate(email.opened_at)}
                                  </div>
                                )}
                                {email.clicked_at && (
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <Icon icon="heroicons:cursor-arrow-rays" className="w-4 h-4" />
                                    <span className="font-medium">Cliqué le:</span> {formatDate(email.clicked_at)}
                                    {email.clicked_url && (
                                      <a href={email.clicked_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">
                                        (voir lien)
                                      </a>
                                    )}
                                  </div>
                                )}
                                {email.bounced_at && (
                                  <div className="flex items-center gap-2 text-red-600">
                                    <Icon icon="heroicons:x-circle" className="w-4 h-4" />
                                    <span className="font-medium">Rebondi le:</span> {formatDate(email.bounced_at)}
                                    {email.bounce_reason && (
                                      <span className="ml-2">({email.bounce_reason})</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {email.html_content && (
                                <div className="mt-4">
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedEmails);
                                      if (isExpanded) {
                                        newExpanded.delete(email.id);
                                      } else {
                                        newExpanded.add(email.id);
                                      }
                                      setExpandedEmails(newExpanded);
                                    }}
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    <Icon 
                                      icon={isExpanded ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
                                      className="w-4 h-4" 
                                    />
                                    {isExpanded ? 'Masquer le contenu' : 'Afficher le contenu'}
                                  </button>
                                  {isExpanded && (
                                    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-auto max-h-96">
                                      <iframe
                                        srcDoc={email.html_content}
                                        className="w-full border-0"
                                        style={{ minHeight: '400px' }}
                                        title="Email content"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SMS Tab */}
            {activeTab === 'sms' && (
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">SMS</h2>
                <div className="space-y-4">
                  {sms.length === 0 ? (
                    <div className="text-center py-12 text-gray-600">
                      Aucun SMS envoyé pour cette submission
                      <p className="text-sm text-gray-500 mt-2">La fonctionnalité SMS sera disponible prochainement</p>
                    </div>
                  ) : (
                    sms.map((smsItem) => (
                      <div key={smsItem.id} className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                smsItem.status === 'delivered' || smsItem.status === 'sent' ? 'bg-green-100 text-green-800' :
                                smsItem.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {smsItem.status === 'delivered' ? 'Livré' :
                                 smsItem.status === 'sent' ? 'Envoyé' :
                                 smsItem.status === 'failed' ? 'Échoué' :
                                 'En attente'}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                {smsItem.typeLabel}
                              </span>
                            </div>
                            <div className="mb-3">
                              <p className="text-gray-900 whitespace-pre-wrap">{smsItem.message}</p>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <span className="font-medium">Numéro:</span> {smsItem.phone_number}
                              </div>
                              <div>
                                <span className="font-medium">Envoyé le:</span> {formatDate(smsItem.sent_at)}
                              </div>
                              {smsItem.delivered_at && (
                                <div className="text-green-600">
                                  <span className="font-medium">Livré le:</span> {formatDate(smsItem.delivered_at)}
                                </div>
                              )}
                              {smsItem.failed_at && (
                                <div className="text-red-600">
                                  <span className="font-medium">Échoué le:</span> {formatDate(smsItem.failed_at)}
                                  {smsItem.failed_reason && (
                                    <span className="ml-2">({smsItem.failed_reason})</span>
                                  )}
                                </div>
                              )}
                              {smsItem.twilio_message_sid && (
                                <div className="text-xs text-gray-500 mt-2">
                                  <span className="font-medium">Twilio SID:</span> {smsItem.twilio_message_sid}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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

