"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  onSuccess: () => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  submissionId,
  onSuccess,
}: CreateTaskDialogProps) {
  const [optionName, setOptionName] = useState("");
  const [optionId, setOptionId] = useState("");
  const [documentContext, setDocumentContext] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionName.trim()) {
      toast.error("Le libellé de la tâche est requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          submission_id: submissionId,
          option_name: optionName.trim(),
          option_id: optionId.trim() || undefined,
          document_context: documentContext.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Tâche créée");
      setOptionName("");
      setOptionId("");
      setDocumentContext("");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une tâche</DialogTitle>
          <DialogDescription>
            Ajoutez une tâche manuelle pour ce dossier. Elle apparaîtra dans la liste des tâches.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="option_name">Libellé de la tâche *</Label>
            <Input
              id="option_name"
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
              placeholder="ex: Apostille à faire"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="option_id">Référence option (optionnel)</Label>
            <Input
              id="option_id"
              value={optionId}
              onChange={(e) => setOptionId(e.target.value)}
              placeholder="ex: apostille"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_context">Contexte document (optionnel)</Label>
            <Input
              id="document_context"
              value={documentContext}
              onChange={(e) => setDocumentContext(e.target.value)}
              placeholder="ex: Acte de mariage.pdf"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes complémentaires"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer la tâche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
