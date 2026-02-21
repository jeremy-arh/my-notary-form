"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SubmissionSearchSelect } from "@/components/shared/SubmissionSearchSelect";

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  resolved: "Résolu",
  closed: "Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  waiting: "bg-gray-100 text-gray-700 border-gray-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

interface TicketComment {
  id: string;
  content: string;
  created_at: string;
  created_by_type: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  submission_id: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  submission: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    created_at?: string;
  } | null;
  client: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  comments: TicketComment[];
}

interface TicketDetailPanelProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TicketDetailPanel({
  ticketId,
  open,
  onOpenChange,
  onUpdate,
}: TicketDetailPanelProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (open && ticketId) {
      setLoading(true);
      fetch(`/api/admin/support/${ticketId}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setTicket(data);
          setEditSubject(data.subject || "");
          setEditDescription(data.description || "");
        })
        .catch(() => toast.error("Erreur de chargement"))
        .finally(() => setLoading(false));
    } else {
      setTicket(null);
    }
  }, [open, ticketId]);

  const handleSave = async () => {
    if (!ticketId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: editSubject,
          description: editDescription || null,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Ticket mis à jour");
      setEditMode(false);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              subject: editSubject,
              description: editDescription || null,
            }
          : null
      );
      onUpdate();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Statut mis à jour");
      setTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      onUpdate();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!ticketId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Priorité mise à jour");
      setTicket((prev) => (prev ? { ...prev, priority: newPriority } : null));
      onUpdate();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !newComment.trim() || addingComment) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, data],
            }
          : null
      );
      setNewComment("");
      toast.success("Commentaire ajouté");
    } catch {
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            Détail du ticket
            {ticket && (
              <>
                <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority] || ""}>
                  {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                </Badge>
                <Badge variant="outline" className={STATUS_COLORS[ticket.status] || ""}>
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </Badge>
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : ticket ? (
          <div className="mt-6 space-y-6">
            {/* Référence commande */}
            <div>
              <SubmissionSearchSelect
                label="Commande liée"
                value={ticket.submission_id}
                onChange={async (submissionId, submission) => {
                  if (!ticketId || saving) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/admin/support/${ticketId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ submission_id: submissionId }),
                    });
                    if (!res.ok) throw new Error("Erreur");
                    toast.success("Commande mise à jour");
                    setTicket((prev) =>
                      prev
                        ? {
                            ...prev,
                            submission_id: submissionId,
                            submission: submission
                              ? {
                                  id: submission.id,
                                  first_name: submission.first_name ?? undefined,
                                  last_name: submission.last_name ?? undefined,
                                  email: submission.email ?? undefined,
                                  created_at: submission.created_at,
                                }
                              : null,
                          }
                        : null
                    );
                    onUpdate();
                  } catch {
                    toast.error("Erreur lors de la mise à jour");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              />
              {ticket.submission_id && (
                <Link
                  href={`/dashboard/orders/${ticket.submission_id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                >
                  <Icon icon="lucide:external-link" className="h-4 w-4" />
                  Voir la commande
                </Link>
              )}
            </div>
            {/* Lien client */}
            {ticket.client_id && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/crm?client=${ticket.client_id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Icon icon="lucide:user" className="h-4 w-4" />
                  Voir le client
                </Link>
              </div>
            )}

            {/* Statut et priorité */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Statut</Label>
                <Select value={ticket.status} onValueChange={handleStatusChange} disabled={saving}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={ticket.priority} onValueChange={handlePriorityChange} disabled={saving}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Formulaire d'édition */}
            {editMode ? (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div>
                  <Label>Sujet</Label>
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setEditSubject(ticket.subject);
                      setEditDescription(ticket.description || "");
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Sujet</span>
                  <p className="font-medium">{ticket.subject}</p>
                </div>
                {ticket.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="font-medium">{ticket.description}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="mt-2"
                >
                  <Icon icon="lucide:pencil" className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>
            )}

            {/* Dates */}
            <div className="text-sm text-muted-foreground">
              Créé le {format(new Date(ticket.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
              <br />
              Modifié le {format(new Date(ticket.updated_at), "d MMM yyyy à HH:mm", { locale: fr })}
            </div>

            {/* Supprimer */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                disabled={saving}
                onClick={async () => {
                  if (!ticketId || saving) return;
                  if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce ticket ?")) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/admin/support/${ticketId}`, {
                      method: "DELETE",
                      credentials: "include",
                    });
                    if (!res.ok) throw new Error("Erreur");
                    toast.success("Ticket supprimé");
                    onOpenChange(false);
                    onUpdate();
                  } catch {
                    toast.error("Erreur lors de la suppression");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Icon icon="lucide:trash-2" className="h-4 w-4 mr-2" />
                Supprimer le ticket
              </Button>
            </div>

            {/* Commentaires */}
            <div>
              <h4 className="font-medium mb-2">Commentaires ({ticket.comments.length})</h4>
              <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  disabled={addingComment}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={!newComment.trim() || addingComment}>
                  Envoyer
                </Button>
              </form>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {ticket.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun commentaire</p>
                ) : (
                  ticket.comments.map((c) => (
                    <div key={c.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <p>{c.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(c.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8">Aucun ticket sélectionné</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
