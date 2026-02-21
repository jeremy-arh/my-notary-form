"use client";

import { useState, useEffect } from "react";
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
import { SubmissionSearchSelect } from "@/components/shared/SubmissionSearchSelect";

interface CreateTaskDialogManualProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  submissionId?: string;
}

export function CreateTaskDialogManual({
  open,
  onOpenChange,
  onSuccess,
  submissionId: initialSubmissionId,
}: CreateTaskDialogManualProps) {
  const [optionName, setOptionName] = useState("");
  const [optionId, setOptionId] = useState("");
  const [documentContext, setDocumentContext] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    initialSubmissionId ?? null
  );

  useEffect(() => {
    if (open) setSelectedSubmissionId(initialSubmissionId ?? null);
  }, [open, initialSubmissionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionName.trim()) {
      toast.error("Le libellé de la tâche est requis");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        option_name: optionName.trim(),
      };
      if (optionId.trim()) body.option_id = optionId.trim();
      if (documentContext.trim()) body.document_context = documentContext.trim();
      if (notes.trim()) body.notes = notes.trim();
      const subId = selectedSubmissionId ?? initialSubmissionId;
      if (subId) body.submission_id = subId;

      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Tâche créée");
      setOptionName("");
      setOptionId("");
      setDocumentContext("");
      setNotes("");
      setSelectedSubmissionId(initialSubmissionId ?? null);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une tâche</DialogTitle>
          <DialogDescription>
            {initialSubmissionId
              ? "Ajoutez une tâche manuelle pour ce dossier. Vous pouvez modifier la commande liée."
              : "Créez une tâche manuelle. Liez-la à une commande si nécessaire."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SubmissionSearchSelect
            label="Commande liée (optionnel)"
            value={selectedSubmissionId}
            onChange={(id) => setSelectedSubmissionId(id)}
            placeholder="Rechercher une commande..."
          />
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
