import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [emails, setEmails] = useState([]);
  const [sms, setSms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'submissions', 'emails', 'sms'
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [viewingEmail, setViewingEmail] = useState(null);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      // Récupérer les informations du client
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Récupérer les submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submission')
        .select(`
          *,
          notary:assigned_notary_id(id, full_name, email)
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

      // Récupérer TOUS les emails envoyés pour ce client depuis email_sent
      const { data: emailsData, error: emailsError } = await supabase
        .from('email_sent')
        .select('*')
        .or(`client_id.eq.${id},email.eq.${clientData.email}`)
        .order('sent_at', { ascending: false });

      if (emailsError) throw emailsError;

      // Format emails for display
      const formattedEmails = (emailsData || []).map(email => {
        // Determine status based on events (priority: clicked > opened > delivered > sent > bounced > dropped > spam > unsubscribed)
        let status = 'sent';
        if (email.clicked_at) status = 'clicked';
        else if (email.opened_at) status = 'opened';
        else if (email.dropped_at) status = 'dropped';
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
        } else if (email.email_type === 'notification') {
          typeLabel = 'Notification';
        } else {
          typeLabel = email.email_type || 'Transactionnel';
        }

        return {
          id: email.id,
          type: email.email_type?.startsWith('abandoned_cart_') ? 'sequence' : 'transactional',
          typeLabel: typeLabel,
          subject: email.subject,
          html_content: email.html_content || null, // Handle case where column doesn't exist
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

      // Récupérer TOUS les SMS envoyés pour ce client depuis sms_sent
      const { data: smsData, error: smsError } = await supabase
        .from('sms_sent')
        .select('*')
        .or(`client_id.eq.${id},phone_number.eq.${clientData.phone || ''}`)
        .order('sent_at', { ascending: false });

      if (smsError) throw smsError;

      // Format SMS for display
      const formattedSMS = (smsData || []).map(sms => {
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
      console.error('Error fetching client data:', error);
      toast.error('Erreur lors du chargement des données du client');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStripeCustomerUrl = (stripeCustomerId) => {
    if (!stripeCustomerId) return null;
    // Détecter si c'est en mode test ou production basé sur le préfixe
    const isTest = stripeCustomerId.startsWith('cus_');
    return `https://dashboard.stripe.com/${isTest ? 'test/' : ''}customers/${stripeCustomerId}`;
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

  if (!client) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Client non trouvé</p>
          <button
            onClick={() => navigate('/crm')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800"
          >
            Retour au CRM
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/crm')}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <Icon icon="heroicons:arrow-left" className="w-5 h-5 mr-2" />
              Retour au CRM
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-gray-600 mt-2">{client.email}</p>
          </div>
          {client.stripe_customer_id && (
            <a
              href={getStripeCustomerUrl(client.stripe_customer_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center"
            >
              <Icon icon="heroicons:arrow-top-right-on-square" className="w-5 h-5 mr-2" />
              Voir sur Stripe
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'info', label: 'Fiche Client', icon: 'heroicons:user' },
              { id: 'submissions', label: 'Submissions', icon: 'heroicons:document-text' },
              { id: 'emails', label: 'Emails', icon: 'heroicons:envelope' },
              { id: 'sms', label: 'SMS', icon: 'heroicons:chat-bubble-left-right' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon icon={tab.icon} className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6">
          {/* Fiche Client Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Prénom</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.first_name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nom</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.last_name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.phone || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.address || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Ville</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.city || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Code postal</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.postal_code || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Pays</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.country || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations système</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date d'inscription</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(client.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dernière mise à jour</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(client.updated_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ID Client</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{client.id}</dd>
                    </div>
                    {client.stripe_customer_id && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Stripe Customer ID</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{client.stripe_customer_id}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nombre de submissions</dt>
                      <dd className="mt-1 text-2xl font-bold text-gray-900">{submissions.length}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Emails envoyés</dt>
                      <dd className="mt-1 text-2xl font-bold text-gray-900">{emails.length}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">SMS envoyés</dt>
                      <dd className="mt-1 text-2xl font-bold text-gray-900">{sms.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  Aucune submission pour ce client
                </div>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/submission/${submission.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Submission #{submission.id.slice(0, 8)}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            submission.status === 'completed' ? 'bg-green-100 text-green-800' :
                            submission.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            submission.status === 'confirmed' ? 'bg-purple-100 text-purple-800' :
                            submission.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {submission.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Créée le:</span> {formatDate(submission.created_at)}
                          </div>
                          <div>
                            <span className="font-medium">Prix:</span> {submission.total_price ? `${submission.total_price}€` : 'N/A'}
                          </div>
                          {submission.notary && (
                            <div>
                              <span className="font-medium">Notaire:</span> {submission.notary.full_name || submission.notary.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <Icon icon="heroicons:chevron-right" className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <div className="space-y-4">
              {emails.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  Aucun email envoyé à ce client
                </div>
              ) : (
                emails.map((email) => {
                  const isExpanded = expandedEmails.has(email.id);
                  return (
                    <div key={email.id} className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">{email.subject}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              email.status === 'clicked' ? 'bg-blue-100 text-blue-800' :
                              email.status === 'opened' ? 'bg-green-100 text-green-800' :
                              email.status === 'delivered' || email.status === 'sent' ? 'bg-green-100 text-green-800' :
                              email.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              email.status === 'dropped' || email.status === 'bounced' || email.status === 'spam' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {email.status === 'clicked' ? 'Cliqué' :
                               email.status === 'opened' ? 'Ouvert' :
                               email.status === 'delivered' ? 'Livré' :
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
          )}

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              {sms.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  Aucun SMS envoyé à ce client
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
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {viewingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{viewingEmail.subject}</h3>
                <p className="text-sm text-gray-600 mt-1">{viewingEmail.typeLabel}</p>
              </div>
              <button
                onClick={() => setViewingEmail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <iframe
                  srcDoc={viewingEmail.html_content}
                  className="w-full border-0 bg-white"
                  style={{ minHeight: '500px' }}
                  title="Email preview"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  const newWindow = window.open();
                  newWindow.document.write(viewingEmail.html_content);
                  newWindow.document.close();
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
              >
                <Icon icon="heroicons:arrow-top-right-on-square" className="w-4 h-4" />
                Ouvrir dans un nouvel onglet
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ClientDetail;
