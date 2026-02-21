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

const STATUS_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  done: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

interface TaskComment {
  id: string;
  content: string;
  created_at: string;
  created_by_type: string;
}

interface TaskDetail {
  id: string;
  submission_id: string | null;
  order_item_ref: string;
  option_id: string;
  option_name: string;
  document_context: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  submission: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    created_at?: string;
    status?: string;
    total_price?: number;
  } | null;
  comments: TaskComment[];
}

interface TaskDetailPanelProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editOptionName, setEditOptionName] = useState("");
  const [editDocumentContext, setEditDocumentContext] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      fetch(`/api/admin/tasks/${taskId}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setTask(data);
          setEditOptionName(data.option_name || "");
          setEditDocumentContext(data.document_context || "");
          setEditNotes(data.notes || "");
        })
        .catch(() => toast.error("Erreur de chargement"))
        .finally(() => setLoading(false));
    } else {
      setTask(null);
    }
  }, [open, taskId]);

  const handleSave = async () => {
    if (!taskId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          option_name: editOptionName,
          document_context: editDocumentContext || null,
          notes: editNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Tâche mise à jour");
      setEditMode(false);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              option_name: editOptionName,
              document_context: editDocumentContext || null,
              notes: editNotes || null,
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
    if (!taskId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Statut mis à jour");
      setTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      onUpdate();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newComment.trim() || addingComment) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTask((prev) =>
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
          <SheetTitle className="flex items-center gap-2">
            Détail de la tâche
            {task && (
              <Badge variant="outline" className={STATUS_COLORS[task.status] || ""}>
                {STATUS_LABELS[task.status] || task.status}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : task ? (
          <div className="mt-6 space-y-6">
            {/* Référence commande */}
            <div>
              <SubmissionSearchSelect
                label="Commande liée"
                value={task.submission_id}
                onChange={async (submissionId, submission) => {
                  if (!taskId || saving) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/admin/tasks/${taskId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ submission_id: submissionId }),
                    });
                    if (!res.ok) throw new Error("Erreur");
                    toast.success("Commande mise à jour");
                    setTask((prev) =>
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
              {task.submission_id && (
                <Link
                  href={`/dashboard/orders/${task.submission_id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                >
                  <Icon icon="lucide:external-link" className="h-4 w-4" />
                  Voir la commande
                </Link>
              )}
            </div>

            {/* Statut */}
            <div>
              <Label>Statut</Label>
              <Select
                value={task.status}
                onValueChange={handleStatusChange}
                disabled={saving}
              >
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

            {/* Formulaire d'édition */}
            {editMode ? (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div>
                  <Label>Libellé</Label>
                  <Input
                    value={editOptionName}
                    onChange={(e) => setEditOptionName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Contexte document</Label>
                  <Input
                    value={editDocumentContext}
                    onChange={(e) => setEditDocumentContext(e.target.value)}
                    placeholder="ex: Acte de mariage.pdf"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notes"
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
                      setEditOptionName(task.option_name);
                      setEditDocumentContext(task.document_context || "");
                      setEditNotes(task.notes || "");
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Libellé</span>
                  <p className="font-medium">{task.option_name}</p>
                </div>
                {task.document_context && (
                  <div>
                    <span className="text-sm text-muted-foreground">Contexte document</span>
                    <p className="font-medium">{task.document_context}</p>
                  </div>
                )}
                {task.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes</span>
                    <p className="font-medium">{task.notes}</p>
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
              Créé le {format(new Date(task.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
              <br />
              Modifié le {format(new Date(task.updated_at), "d MMM yyyy à HH:mm", { locale: fr })}
            </div>

            {/* Supprimer */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                disabled={saving}
                onClick={async () => {
                  if (!taskId || saving) return;
                  if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/admin/tasks/${taskId}`, {
                      method: "DELETE",
                      credentials: "include",
                    });
                    if (!res.ok) throw new Error("Erreur");
                    toast.success("Tâche supprimée");
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
                Supprimer la tâche
              </Button>
            </div>

            {/* Commentaires */}
            <div>
              <h4 className="font-medium mb-2">Commentaires ({task.comments.length})</h4>
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
                {task.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun commentaire</p>
                ) : (
                  task.comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border bg-muted/20 p-3 text-sm"
                    >
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
          <p className="text-muted-foreground py-8">Aucune tâche sélectionnée</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
