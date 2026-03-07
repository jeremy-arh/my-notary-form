"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

export interface NotarizedFile {
  id: string;
  file_name: string;
  file_url: string;
}

export interface DeliveryAddress {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface SendPostalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  files: NotarizedFile[];
  address: DeliveryAddress;
  onSuccess?: () => void;
}

export function SendPostalDialog({
  open,
  onOpenChange,
  submissionId,
  files,
  address,
  onSuccess,
}: SendPostalDialogProps) {
  const [express, setExpress] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (files.length === 0) {
      toast.error("Aucun document à envoyer");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/send-postal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ express }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'envoi");
      toast.success(data.message || `${data.sent} document(s) envoyé(s) par courrier`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const addressLine = [address.address, address.postalCode, address.city, address.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer les documents par courrier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Documents à envoyer</Label>
            <ul className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2 max-h-40 overflow-y-auto">
              {files.length === 0 ? (
                <li className="text-sm text-muted-foreground">Aucun document notarié</li>
              ) : (
                files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <Icon icon="lucide:file-text" className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.file_name}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <Label className="text-muted-foreground">Adresse de livraison</Label>
            <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{address.name}</p>
              <p className="text-muted-foreground">{addressLine || "—"}</p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Mode d&apos;envoi</Label>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant={!express ? "default" : "outline"}
                size="sm"
                onClick={() => setExpress(false)}
              >
                Livraison standard
              </Button>
              <Button
                type="button"
                variant={express ? "default" : "outline"}
                size="sm"
                onClick={() => setExpress(true)}
              >
                Livraison express
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || files.length === 0}>
            {sending ? "Envoi en cours…" : "Envoyer par courrier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
