"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FUNNEL_LABELS } from "@/hooks/usePipeline";
import { toast } from "sonner";
import { SendMessageDialog } from "@/components/shared/SendMessageDialog";
import { CreateTaskDialogManual } from "@/components/tasks/CreateTaskDialogManual";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubmissionDetail {
  id: string;
  status: string;
  funnel_status: string | null;
  created_at: string;
  total_price: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  client_id: string | null;
  data: Record<string, unknown> | null;
}

interface ActivityLog {
  id: string;
  action_type: string;
  action_description: string;
  created_at: string;
}

interface InternalNote {
  id: string;
  content: string;
  created_at: string;
}

interface Signatory {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  birth_city: string | null;
  postal_address: string | null;
  document_key: string;
}

interface EmailSent {
  id: string;
  email: string;
  recipient_name?: string;
  email_type: string;
  subject: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  clicked_url?: string;
  bounced_at?: string;
  dropped_at?: string;
}

interface SmsSent {
  id: string;
  phone_number: string;
  recipient_name?: string;
  sms_type: string;
  message: string;
  sent_at: string;
  delivered_at?: string;
  failed_at?: string;
}

interface SubmissionFile {
  id: string;
  file_name: string;
  file_url: string;
}

interface OrderItem {
  id: string;
  type: "service" | "option";
  name: string;
  ref: string;
  price: number;
  quantity: number;
  serviceId?: string; // Pour les services : ID pour retrouver les documents
}

interface ServiceDocument {
  name: string;
  file_url: string;
}

interface ClientInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

interface OrderTask {
  id: string;
  order_item_ref: string;
  option_id: string;
  option_name: string;
  document_context: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const DELIVERY_LABELS: Record<string, string> = {
  postal: "Courrier postal",
  email: "Email",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [timeline, setTimeline] = useState<ActivityLog[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [documentsByService, setDocumentsByService] = useState<Record<string, ServiceDocument[]>>({});
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [emails, setEmails] = useState<EmailSent[]>([]);
  const [sms, setSms] = useState<SmsSent[]>([]);
  const [tasks, setTasks] = useState<OrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const updateStatus = async (newStatus: "completed" | "cancelled") => {
    if (updating) return;
    if (newStatus === "cancelled" && !window.confirm("Êtes-vous sûr de vouloir annuler ce dossier ?")) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la mise à jour");
      setSubmission((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success(newStatus === "completed" ? "Dossier marqué comme terminé" : "Dossier annulé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const fetchDetail = useCallback(async (opts?: { skipLoading?: boolean }) => {
    if (!id) return;
    try {
      if (!opts?.skipLoading) setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/submissions/${id}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Dossier introuvable");
        return;
      }
      const data = await res.json();
      setSubmission(data.submission as SubmissionDetail);
      setItems(data.items || []);
      setClient(data.client as ClientInfo | null);
      setTimeline(data.timeline || []);
      setNotes(data.notes || []);
      setFiles(data.files || []);
      setDocumentsByService(data.documentsByService || {});
      setSignatories(data.signatories || []);
      setEmails(data.emails || []);
      setSms(data.sms || []);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      if (!opts?.skipLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Dossier introuvable"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

  const shortId = submission.id.slice(0, 8);
  const deliveryMethod = (submission.data as { delivery_method?: string })?.delivery_method;

  return (
    <div className="space-y-6">
      {/* En-tête : Retour + Titre */}
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <Icon icon="lucide:arrow-left" className="h-4 w-4" />
          Retour aux commandes
        </Link>
        <h1 className="text-2xl font-bold">Dossier #{shortId}</h1>
      </div>

      {/* Actions principales (Annuler, Terminé) */}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={updating || submission.status === "cancelled"}
          onClick={() => updateStatus("cancelled")}
        >
          <Icon icon="lucide:trash-2" className="mr-2 h-4 w-4" />
          Annuler le dossier
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          disabled={updating || submission.status === "completed"}
          onClick={() => updateStatus("completed")}
        >
          <Icon icon="lucide:check" className="mr-2 h-4 w-4" />
          Marquer comme terminé
        </Button>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="signataires">Signataires</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tâches ({tasks.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Colonne gauche : Prestations notariales + Communications */}
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prestations notariales</CardTitle>
                <CardDescription>Services et options sélectionnés par le client</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucune prestation enregistrée pour ce dossier
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PRESTATION</TableHead>
                        <TableHead className="text-right">HONORAIRE UNITAIRE</TableHead>
                        <TableHead className="text-right">QUANTITÉ</TableHead>
                        <TableHead className="text-right">TOTAL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const lineTotal = item.price * item.quantity;
                        const serviceDocs = item.type === "service" && item.serviceId
                          ? documentsByService[item.serviceId] || []
                          : [];
                        return (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.ref && (
                                    <p className="text-xs text-muted-foreground">Ref: {item.ref}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>
                            </TableRow>
                            {serviceDocs.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="bg-muted/30 py-3">
                                  <div className="space-y-2 pl-4">
                                    <p className="text-xs font-medium text-muted-foreground">Documents ({serviceDocs.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                      {serviceDocs.map((doc, idx) => (
                                        <div
                                          key={idx}
                                          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                                        >
                                          <Icon icon="lucide:file" className="h-4 w-4 text-muted-foreground" />
                                          <span className="truncate max-w-[180px]">{doc.name}</span>
                                          <div className="flex gap-1">
                                            <a
                                              href={doc.file_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                              title="Voir"
                                            >
                                              <Icon icon="lucide:eye" className="h-3.5 w-3.5" />
                                              Voir
                                            </a>
                                            <a
                                              href={doc.file_url}
                                              download={doc.name}
                                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                              title="Télécharger"
                                            >
                                              <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                                              Télécharger
                                            </a>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Bloc Communications */}
            <Card>
              <CardHeader>
                <CardTitle>Communications</CardTitle>
                <CardDescription>Emails et SMS envoyés au client</CardDescription>
              </CardHeader>
              <CardContent>
                {emails.length === 0 && sms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune communication enregistrée</p>
                ) : (
                  <div className="space-y-4">
                    {emails.map((e) => (
                      <div key={e.id} className="flex gap-3 rounded-lg border p-3">
                        <Icon icon="lucide:mail" className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            À {e.email}
                            {e.recipient_name && ` (${e.recipient_name})`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(e.sent_at), "d MMM yyyy HH:mm", { locale: fr })}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                              Envoyé
                            </span>
                            {e.delivered_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                Livré
                              </span>
                            )}
                            {e.opened_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                                Ouvert
                              </span>
                            )}
                            {e.clicked_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-800">
                                Cliqué
                              </span>
                            )}
                            {e.bounced_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                Rebond
                              </span>
                            )}
                            {e.dropped_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                                Refusé
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sms.map((s) => (
                      <div key={s.id} className="flex gap-3 rounded-lg border p-3">
                        <Icon icon="lucide:message-square" className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{s.message}</p>
                          <p className="text-xs text-muted-foreground">
                            À {s.phone_number}
                            {s.recipient_name && ` (${s.recipient_name})`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(s.sent_at), "d MMM yyyy HH:mm", { locale: fr })}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                              Envoyé
                            </span>
                            {s.delivered_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                Livré
                              </span>
                            )}
                            {s.failed_at && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                Échoué
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Colonne droite : Résumé + Client */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Résumé</CardTitle>
                  <CardDescription>Honoraires et informations du dossier</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        submission.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : submission.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : submission.status === "pending_payment"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_LABELS[submission.status] || submission.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Étape du funnel</span>
                    <span>{FUNNEL_LABELS[submission.funnel_status || "started"] || submission.funnel_status || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Prestations</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documents</span>
                    <span>{files.length}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Date de création</span>
                    <span>{format(new Date(submission.created_at), "d MMM yyyy", { locale: fr })}</span>
                  </div>
                  {deliveryMethod && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Méthode de livraison</span>
                      <span>{DELIVERY_LABELS[deliveryMethod] || deliveryMethod}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client</CardTitle>
                  <CardDescription>Informations du demandeur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {client ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">Nom :</span>{" "}
                        {client.first_name} {client.last_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email :</span>{" "}
                        <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                          {client.email}
                        </a>
                      </div>
                      {client.phone && (
                        <div>
                          <span className="text-muted-foreground">Téléphone :</span> {client.phone}
                        </div>
                      )}
                      {(client.address || client.city) && (
                        <div>
                          <span className="text-muted-foreground">Adresse :</span>{" "}
                          {[client.address, client.city, client.postal_code, client.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-muted-foreground">Nom :</span>{" "}
                        {[submission.first_name, submission.last_name].filter(Boolean).join(" ") || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email :</span>{" "}
                        {submission.email ? (
                          <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                            {submission.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                      {submission.phone && (
                        <div>
                          <span className="text-muted-foreground">Téléphone :</span> {submission.phone}
                        </div>
                      )}
                      {(submission.address || submission.city) && (
                        <div>
                          <span className="text-muted-foreground">Adresse :</span>{" "}
                          {[submission.address, submission.city, submission.postal_code, submission.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </>
                  )}
                  {submission.notes && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Notes du client :</span>
                      <p className="mt-1 text-muted-foreground">{submission.notes}</p>
                    </div>
                  )}
                  {submission.client_id && (
                    <Link href={`/dashboard/crm?tab=clients&client=${submission.client_id}`}>
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        <Icon icon="lucide:user" className="mr-2 h-4 w-4" />
                        Voir la fiche client
                      </Button>
                    </Link>
                  )}
                  {(submission.email || submission.phone) && (
                    <Button
                      variant="default"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setShowSendMessage(true)}
                    >
                      <Icon icon="lucide:send" className="mr-2 h-4 w-4" />
                      Envoyer un message
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="signataires" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Signataires</CardTitle>
              <CardDescription>Personnes désignées comme signataires sur les documents</CardDescription>
            </CardHeader>
            <CardContent>
              {signatories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun signataire enregistré pour ce dossier</p>
              ) : (
                <div className="space-y-4">
                  {signatories.map((sig) => (
                    <div key={sig.id} className="rounded-lg border p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {(sig.first_name?.[0] || "?")}{(sig.last_name?.[0] || "")}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium">
                            {sig.first_name} {sig.last_name}
                          </p>
                          {sig.email && (
                            <p className="text-sm text-muted-foreground">
                              <a href={`mailto:${sig.email}`} className="text-primary hover:underline">{sig.email}</a>
                            </p>
                          )}
                          {sig.phone && (
                            <p className="text-sm text-muted-foreground">{sig.phone}</p>
                          )}
                          {sig.birth_date && (
                            <p className="text-sm text-muted-foreground">
                              Naissance : {format(new Date(sig.birth_date), "d MMM yyyy", { locale: fr })}
                              {sig.birth_city && ` à ${sig.birth_city}`}
                            </p>
                          )}
                          {sig.postal_address && (
                            <p className="text-sm text-muted-foreground">{sig.postal_address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Documents uploadés par le client pour la notarisation</CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <Icon icon="lucide:file" className="h-4 w-4" />
                      <span>{file.file_name}</span>
                      <Icon icon="lucide:external-link" className="ml-auto h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tâches</CardTitle>
                  <CardDescription>
                    Tâches liées à ce dossier (créées automatiquement pour les options ou manuellement)
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateTask(true)} size="sm">
                  <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
                  Ajouter une tâche
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Aucune tâche. Les tâches sont créées automatiquement pour chaque option du dossier, ou vous pouvez en ajouter manuellement.
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{task.option_name}</p>
                        {task.document_context && (
                          <p className="text-sm text-muted-foreground">Document : {task.document_context}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(task.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <Select
                        value={task.status}
                        onValueChange={async (v) => {
                          setUpdatingTaskId(task.id);
                          try {
                            const res = await fetch(`/api/admin/tasks/${task.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ status: v }),
                            });
                            if (!res.ok) throw new Error("Erreur");
                            setTasks((prev) =>
                              prev.map((t) => (t.id === task.id ? { ...t, status: v } : t))
                            );
                            toast.success("Statut mis à jour");
                          } catch {
                            toast.error("Erreur lors de la mise à jour");
                          } finally {
                            setUpdatingTaskId(null);
                          }
                        }}
                        disabled={updatingTaskId === task.id}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">À faire</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="done">Terminé</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Actions effectuées sur ce dossier</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune action enregistrée</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 border-l-2 border-muted pl-4 py-2"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.action_description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes internes</CardTitle>
              <CardDescription>Notes ajoutées par l&apos;équipe notariale</CardDescription>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune note</p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg border p-4">
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {submission && (
        <CreateTaskDialogManual
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          submissionId={submission.id}
          onSuccess={() => fetchDetail({ skipLoading: true })}
        />
      )}
      {submission && (
        <SendMessageDialog
          open={showSendMessage}
          onOpenChange={setShowSendMessage}
          recipient={{
            name: [client?.first_name || submission.first_name, client?.last_name || submission.last_name].filter(Boolean).join(" ") || "Client",
            email: client?.email || submission.email || null,
            phone: client?.phone || submission.phone || null,
          }}
          submissionId={submission.id}
          clientId={submission.client_id}
          onSuccess={() => fetchDetail({ skipLoading: true })}
        />
      )}
    </div>
  );
}
