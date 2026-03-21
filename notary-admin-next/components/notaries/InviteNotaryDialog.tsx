"use client";

import { useState, type ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import type { NotaryInviteProfileInput } from "@/lib/notary-invite-profile";

function emptyProfile(): NotaryInviteProfileInput {
  return {
    name: "",
    full_name: "",
    phone: "",
    bio: "",
    license_number: "",
    specialization: "",
    is_active: true,
    address: "",
    city: "",
    postal_code: "",
    country: "",
    timezone: "",
    iban: "",
    bic: "",
    bank_name: "",
    jurisdiction: "",
    commission_number: "",
    commission_valid_until: "",
  };
}

type InviteNotaryDialogProps = {
  onSuccess?: () => void;
  defaultEmail?: string;
  /** Raccourci : pré-remplit le nom complet */
  defaultName?: string;
  /** Pré-remplissage complet (ex. fiche notaire) */
  defaultProfile?: Partial<NotaryInviteProfileInput>;
  trigger?: ReactNode;
};

export function InviteNotaryDialog({
  onSuccess,
  defaultEmail = "",
  defaultName = "",
  defaultProfile,
  trigger,
}: InviteNotaryDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [profile, setProfile] = useState<NotaryInviteProfileInput>(() => ({
    ...emptyProfile(),
    ...defaultProfile,
    full_name: defaultProfile?.full_name ?? defaultName,
  }));
  const [sending, setSending] = useState(false);

  const setP = <K extends keyof NotaryInviteProfileInput>(
    key: K,
    value: NotaryInviteProfileInput[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setEmail(defaultEmail);
      setProfile({
        ...emptyProfile(),
        ...defaultProfile,
        full_name: defaultProfile?.full_name ?? defaultName,
      });
    }
  };

  const submit = async () => {
    const e = email.trim();
    if (!e || !e.includes("@")) {
      toast.error("Indiquez une adresse e-mail valide.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/notaries/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: e,
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l’envoi");
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(data.message || "Envoyé.");
      }
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Icon icon="lucide:mail-plus" className="h-4 w-4 mr-2" />
            Inviter un notaire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle>Inviter un notaire</DialogTitle>
            <DialogDescription className="text-left">
              Seul l’e-mail est requis. Les autres champs sont optionnels et enregistrés sur la fiche notaire.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 overflow-y-auto flex-1 min-h-0 space-y-6 pb-4 border-y border-border/60">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Icon icon="lucide:at-sign" className="h-4 w-4" />
              Connexion
            </h4>
            <div className="space-y-2">
              <Label htmlFor="invite-email">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="notaire@exemple.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Icon icon="lucide:user" className="h-4 w-4" />
              Identité
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nom (interne)</Label>
                <Input
                  id="invite-name"
                  value={profile.name ?? ""}
                  onChange={(ev) => setP("name", ev.target.value)}
                  placeholder="Réf. interne"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-full_name">Nom complet</Label>
                <Input
                  id="invite-full_name"
                  value={profile.full_name ?? ""}
                  onChange={(ev) => setP("full_name", ev.target.value)}
                  placeholder="Me Dupont"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-phone">Téléphone</Label>
                <Input
                  id="invite-phone"
                  value={profile.phone ?? ""}
                  onChange={(ev) => setP("phone", ev.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Actif</p>
                  <p className="text-xs text-muted-foreground">Fiche notaire active</p>
                </div>
                <Switch
                  checked={profile.is_active !== false}
                  onCheckedChange={(v) => setP("is_active", v)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="invite-bio">Bio</Label>
                <Textarea
                  id="invite-bio"
                  rows={3}
                  value={profile.bio ?? ""}
                  onChange={(ev) => setP("bio", ev.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Icon icon="lucide:map-pin" className="h-4 w-4" />
              Adresse
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="invite-address">Adresse</Label>
                <Textarea
                  id="invite-address"
                  rows={2}
                  value={profile.address ?? ""}
                  onChange={(ev) => setP("address", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-city">Ville</Label>
                <Input
                  id="invite-city"
                  value={profile.city ?? ""}
                  onChange={(ev) => setP("city", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-postal_code">Code postal</Label>
                <Input
                  id="invite-postal_code"
                  value={profile.postal_code ?? ""}
                  onChange={(ev) => setP("postal_code", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-country">Pays</Label>
                <Input
                  id="invite-country"
                  value={profile.country ?? ""}
                  onChange={(ev) => setP("country", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-timezone">Fuseau horaire</Label>
                <Input
                  id="invite-timezone"
                  placeholder="Europe/Paris"
                  value={profile.timezone ?? ""}
                  onChange={(ev) => setP("timezone", ev.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Icon icon="lucide:briefcase" className="h-4 w-4" />
              Professionnel
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-license_number">N° de licence</Label>
                <Input
                  id="invite-license_number"
                  value={profile.license_number ?? ""}
                  onChange={(ev) => setP("license_number", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-jurisdiction">Juridiction</Label>
                <Input
                  id="invite-jurisdiction"
                  value={profile.jurisdiction ?? ""}
                  onChange={(ev) => setP("jurisdiction", ev.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="invite-specialization">Spécialisations (virgules)</Label>
                <Input
                  id="invite-specialization"
                  placeholder="Droit familial, successions…"
                  value={profile.specialization ?? ""}
                  onChange={(ev) => setP("specialization", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-commission_number">N° de commission</Label>
                <Input
                  id="invite-commission_number"
                  value={profile.commission_number ?? ""}
                  onChange={(ev) => setP("commission_number", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-commission_valid_until">Commission valide jusqu’au</Label>
                <Input
                  id="invite-commission_valid_until"
                  type="date"
                  value={profile.commission_valid_until ?? ""}
                  onChange={(ev) => setP("commission_valid_until", ev.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Icon icon="lucide:landmark" className="h-4 w-4" />
              Banque
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="invite-iban">IBAN</Label>
                <Input
                  id="invite-iban"
                  value={profile.iban ?? ""}
                  onChange={(ev) => setP("iban", ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-bic">BIC</Label>
                <Input id="invite-bic" value={profile.bic ?? ""} onChange={(ev) => setP("bic", ev.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-bank_name">Banque</Label>
                <Input
                  id="invite-bank_name"
                  value={profile.bank_name ?? ""}
                  onChange={(ev) => setP("bank_name", ev.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 shrink-0 border-t bg-background">
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={sending}>
              {sending ? "Envoi…" : "Envoyer l’invitation"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
