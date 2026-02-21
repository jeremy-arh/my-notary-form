"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/cms/RichTextEditor";

const defaultForm = {
  option_id: "",
  name: "",
  description: "",
  short_description: "",
  icon: "",
  additional_price: "",
  cta: "Book an appointment",
  meta_title: "",
  meta_description: "",
  is_active: true,
};

export default function OptionEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/cms/options/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setForm({
          option_id: data.option_id || "",
          name: data.name || "",
          description: data.description || "",
          short_description: data.short_description || "",
          icon: data.icon || "",
          additional_price: String(data.additional_price ?? ""),
          cta: data.cta || "Book an appointment",
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          is_active: data.is_active !== false,
        });
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        additional_price: parseFloat(form.additional_price) || 0,
      };
      const url = isNew ? "/api/admin/cms/options" : `/api/admin/cms/options/${id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur");
      await res.json();
      toast.success("Option enregistrée");
      router.push("/dashboard/cms");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isNew ? "Nouvelle option" : "Modifier l'option"}</h1>
          <p className="text-muted-foreground text-sm">
            {isNew ? "Créez une nouvelle option" : "Modifiez les informations de l'option"}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/cms">
            <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Option ID *</Label>
              <Input
                value={form.option_id}
                onChange={(e) => setForm({ ...form, option_id: e.target.value })}
                placeholder="ex: urgent"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              minHeight="180px"
            />
          </div>
          <div className="space-y-2">
            <Label>Description courte</Label>
            <RichTextEditor
              value={form.short_description}
              onChange={(html) => setForm({ ...form, short_description: html })}
              minHeight="80px"
            />
          </div>
          <div className="space-y-2">
            <Label>Icône (Iconify)</Label>
            <Input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="ex: heroicons:bolt"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix additionnel (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.additional_price}
                onChange={(e) => setForm({ ...form, additional_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CTA</Label>
              <Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <RichTextEditor
              value={form.meta_description}
              onChange={(html) => setForm({ ...form, meta_description: html })}
              minHeight="100px"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Option active</Label>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/cms">Annuler</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
