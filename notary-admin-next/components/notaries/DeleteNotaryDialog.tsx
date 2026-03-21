"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

type DeleteNotaryDialogProps = {
  notaryId: string;
  email: string;
  displayLabel: string;
  hasAuthUser: boolean;
};

export function DeleteNotaryDialog({ notaryId, email, displayLabel, hasAuthUser }: DeleteNotaryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/notaries/${notaryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suppression impossible");
      if (data.partial) {
        toast.warning(data.error || "Fiche supprimée, mais le compte Auth n’a pas pu être retiré.");
      } else {
        toast.success(
          hasAuthUser
            ? "Notaire et compte utilisateur supprimés."
            : "Notaire supprimé (aucun compte Auth lié)."
        );
      }
      setOpen(false);
      router.push("/dashboard/notaries");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" type="button">
          <Icon icon="lucide:trash-2" className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer ce notaire ?</DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span className="block">
              <strong>{displayLabel}</strong> ({email}) sera retiré de la base.
            </span>
            {hasAuthUser ? (
              <span className="block text-destructive">
                Le compte Supabase Auth associé sera également supprimé (déconnexion immédiate côté notaire).
              </span>
            ) : (
              <span className="block text-muted-foreground">
                Aucun compte Auth n’est lié : seule la fiche notaire sera supprimée.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
