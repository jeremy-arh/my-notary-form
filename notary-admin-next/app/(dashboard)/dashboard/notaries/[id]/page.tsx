"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteNotaryDialog } from "@/components/notaries/InviteNotaryDialog";
import { DeleteNotaryDialog } from "@/components/notaries/DeleteNotaryDialog";
import type { NotaryDetail } from "@/app/api/admin/notaries/[id]/route";

export default function NotaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingRole, setSyncingRole] = useState(false);
  const [notary, setNotary] = useState<NotaryDetail | null>(null);
  const [form, setForm] = useState<Partial<NotaryDetail>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notaries/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      const n = data.notary as NotaryDetail;
      setNotary(n);
      setForm({
        name: n.name,
        email: n.email,
        phone: n.phone ?? "",
        full_name: n.full_name ?? "",
        bio: n.bio ?? "",
        license_number: n.license_number ?? "",
        specialization: n.specialization ?? [],
        is_active: n.is_active,
        address: n.address ?? "",
        city: n.city ?? "",
        postal_code: n.postal_code ?? "",
        country: n.country ?? "",
        timezone: n.timezone ?? "",
        iban: n.iban ?? "",
        bic: n.bic ?? "",
        bank_name: n.bank_name ?? "",
        jurisdiction: n.jurisdiction ?? "",
        commission_number: n.commission_number ?? "",
        commission_valid_until: n.commission_valid_until
          ? String(n.commission_valid_until).slice(0, 10)
          : "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      router.push("/dashboard/notaries");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: keyof NotaryDetail, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const specialization = Array.isArray(form.specialization)
        ? form.specialization
        : [];

      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        full_name: form.full_name || null,
        bio: form.bio || null,
        license_number: form.license_number || null,
        specialization,
        is_active: form.is_active,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        country: form.country || null,
        timezone: form.timezone || null,
        iban: form.iban || null,
        bic: form.bic || null,
        bank_name: form.bank_name || null,
        jurisdiction: form.jurisdiction || null,
        commission_number: form.commission_number || null,
        commission_valid_until: form.commission_valid_until || null,
      };

      const res = await fetch(`/api/admin/notaries/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      toast.success("Fiche enregistrée.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const syncAuthRole = async () => {
    if (!id) return;
    setSyncingRole(true);
    try {
      const res = await fetch(`/api/admin/notaries/${id}/sync-auth-role`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success(data.message || "Rôle appliqué.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSyncingRole(false);
    }
  };

  if (loading || !notary) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  const specStr = Array.isArray(form.specialization)
    ? form.specialization.join(", ")
    : "";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-muted-foreground">
            <Link href="/dashboard/notaries">
              <Icon icon="lucide:arrow-left" className="h-4 w-4 mr-1" />
              Retour à la liste
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{notary.full_name || notary.name}</h1>
          <p className="text-muted-foreground text-sm">{notary.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InviteNotaryDialog
            defaultEmail={notary.email}
            defaultName={notary.full_name || notary.name}
            defaultProfile={{
              name: notary.name,
              full_name: notary.full_name ?? "",
              phone: notary.phone ?? "",
              bio: notary.bio ?? "",
              license_number: notary.license_number ?? "",
              specialization: specStr,
              is_active: notary.is_active,
              address: notary.address ?? "",
              city: notary.city ?? "",
              postal_code: notary.postal_code ?? "",
              country: notary.country ?? "",
              timezone: notary.timezone ?? "",
              iban: notary.iban ?? "",
              bic: notary.bic ?? "",
              bank_name: notary.bank_name ?? "",
              jurisdiction: notary.jurisdiction ?? "",
              commission_number: notary.commission_number ?? "",
              commission_valid_until: notary.commission_valid_until
                ? String(notary.commission_valid_until).slice(0, 10)
                : "",
            }}
            onSuccess={load}
            trigger={
              <Button variant="outline">
                <Icon icon="lucide:send" className="h-4 w-4 mr-2" />
                Envoyer invitation / lien
              </Button>
            }
          />
          <Button
            type="button"
            variant="secondary"
            onClick={syncAuthRole}
            disabled={syncingRole}
            title="Force user_metadata.role = notary sur le compte Auth (sans magic link)"
          >
            <Icon icon="lucide:shield-check" className="h-4 w-4 mr-2" />
            {syncingRole ? "Application…" : "Appliquer le rôle sur Auth"}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <DeleteNotaryDialog
            notaryId={id}
            email={notary.email}
            displayLabel={notary.full_name || notary.name}
            hasAuthUser={Boolean(notary.user_id)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
          <CardDescription>
            Dossiers assignés : <strong>{notary.submissions_count}</strong>
            {" · "}
            Compte :{" "}
            {notary.user_id ? (
              <span className="text-emerald-700 dark:text-emerald-400">connecté</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">pas encore connecté</span>
            )}
            {" · "}
            Créé le {format(new Date(notary.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identité & contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nom (interne)</Label>
            <Input
              id="name"
              value={form.name ?? ""}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input
              id="full_name"
              value={form.full_name ?? ""}
              onChange={(e) => setField("full_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={form.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <p className="font-medium">Actif</p>
              <p className="text-sm text-muted-foreground">Visible dans les assignations</p>
            </div>
            <Switch
              checked={!!form.is_active}
              onCheckedChange={(v) => setField("is_active", v)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio ?? ""}
              onChange={(e) => setField("bio", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              rows={2}
              value={form.address ?? ""}
              onChange={(e) => setField("address", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={form.city ?? ""}
              onChange={(e) => setField("city", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Code postal</Label>
            <Input
              id="postal_code"
              value={form.postal_code ?? ""}
              onChange={(e) => setField("postal_code", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              value={form.country ?? ""}
              onChange={(e) => setField("country", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Fuseau horaire</Label>
            <Input
              id="timezone"
              placeholder="ex. Europe/Paris"
              value={form.timezone ?? ""}
              onChange={(e) => setField("timezone", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professionnel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="license_number">Numéro de licence</Label>
            <Input
              id="license_number"
              value={form.license_number ?? ""}
              onChange={(e) => setField("license_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Juridiction</Label>
            <Input
              id="jurisdiction"
              value={form.jurisdiction ?? ""}
              onChange={(e) => setField("jurisdiction", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="specialization">Spécialisations (séparées par des virgules)</Label>
            <Input
              id="specialization"
              value={specStr}
              onChange={(e) =>
                setField(
                  "specialization",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission_number">Numéro de commission</Label>
            <Input
              id="commission_number"
              value={form.commission_number ?? ""}
              onChange={(e) => setField("commission_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission_valid_until">Commission valide jusqu’au</Label>
            <Input
              id="commission_valid_until"
              type="date"
              value={form.commission_valid_until ?? ""}
              onChange={(e) => setField("commission_valid_until", e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées bancaires</CardTitle>
          <CardDescription>Informations sensibles — accès restreint au back-office.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={form.iban ?? ""}
              onChange={(e) => setField("iban", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bic">BIC</Label>
            <Input id="bic" value={form.bic ?? ""} onChange={(e) => setField("bic", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_name">Banque</Label>
            <Input
              id="bank_name"
              value={form.bank_name ?? ""}
              onChange={(e) => setField("bank_name", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  );
}
