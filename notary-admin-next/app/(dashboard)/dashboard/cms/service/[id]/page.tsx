"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/cms/RichTextEditor";

const LOCALES = [
  { code: "en", label: "Anglais", suffix: "", flagIcon: "circle-flags:gb" },
  { code: "fr", label: "Français", suffix: "_fr", flagIcon: "circle-flags:fr" },
  { code: "es", label: "Espagnol", suffix: "_es", flagIcon: "circle-flags:es" },
  { code: "de", label: "Allemand", suffix: "_de", flagIcon: "circle-flags:de" },
  { code: "it", label: "Italien", suffix: "_it", flagIcon: "circle-flags:it" },
  { code: "pt", label: "Portugais", suffix: "_pt", flagIcon: "circle-flags:pt" },
] as const;

const LOCALE_FIELDS = [
  "name",
  "short_description",
  "description",
  "cta",
  "meta_title",
  "meta_description",
  "detailed_description",
  "list_title",
  "page_h1",
  "category",
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];
type FormState = Record<string, string | number | boolean | null>;

const defaultForm: FormState = {
  service_id: "",
  icon: "",
  color: "",
  base_price: "",
  price_usd: "",
  price_gbp: "",
  is_active: true,
  show_in_list: true,
  faqs: "[]",
  certificate_image: "",
  ...Object.fromEntries(
    LOCALES.flatMap((loc) =>
      LOCALE_FIELDS.map((f) => [
        f + loc.suffix,
        f === "cta" && loc.code === "en" ? "Book an appointment" : "",
      ])
    )
  ),
};

interface LocaleFieldsProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  locale: LocaleCode;
}

function LocaleFields({ form, setForm, locale }: LocaleFieldsProps) {
  const suf = LOCALES.find((l) => l.code === locale)?.suffix || "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input
            value={String(form["name" + suf] ?? "")}
            onChange={(e) => setForm({ ...form, ["name" + suf]: e.target.value })}
            placeholder="Nom du service"
          />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Input
            value={String(form["category" + suf] ?? "")}
            onChange={(e) => setForm({ ...form, ["category" + suf]: e.target.value })}
            placeholder="ex: general"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description courte</Label>
        <RichTextEditor
          value={String(form["short_description" + suf] ?? "")}
          onChange={(html) => setForm({ ...form, ["short_description" + suf]: html })}
          minHeight="100px"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <RichTextEditor
          value={String(form["description" + suf] ?? "")}
          onChange={(html) => setForm({ ...form, ["description" + suf]: html })}
          minHeight="180px"
        />
      </div>
      <div className="space-y-2">
        <Label>Description détaillée</Label>
        <RichTextEditor
          value={String(form["detailed_description" + suf] ?? "")}
          onChange={(html) => setForm({ ...form, ["detailed_description" + suf]: html })}
          minHeight="120px"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CTA</Label>
          <Input
            value={String(form["cta" + suf] ?? "")}
            onChange={(e) => setForm({ ...form, ["cta" + suf]: e.target.value })}
            placeholder="Book an appointment"
          />
        </div>
        <div className="space-y-2">
          <Label>Titre liste</Label>
          <Input
            value={String(form["list_title" + suf] ?? "")}
            onChange={(e) => setForm({ ...form, ["list_title" + suf]: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>H1 de page</Label>
        <Input
          value={String(form["page_h1" + suf] ?? "")}
          onChange={(e) => setForm({ ...form, ["page_h1" + suf]: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Meta Title</Label>
        <Input
          value={String(form["meta_title" + suf] ?? "")}
          onChange={(e) => setForm({ ...form, ["meta_title" + suf]: e.target.value })}
          placeholder="Titre SEO"
        />
      </div>
      <div className="space-y-2">
        <Label>Meta Description</Label>
        <Input
          value={String(form["meta_description" + suf] ?? "")}
          onChange={(e) => setForm({ ...form, ["meta_description" + suf]: e.target.value })}
          placeholder="Description SEO"
        />
      </div>
    </div>
  );
}

export default function ServiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/cms/services/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const merged: FormState = { ...defaultForm };
        for (const k of Object.keys(defaultForm)) {
          const v = data[k];
          if (v === undefined) continue;
          if (typeof v === "boolean") merged[k] = v;
          else if (v === null) merged[k] = "";
          else merged[k] = String(v);
        }
        merged.base_price = String(data.base_price ?? "");
        merged.price_usd = String(data.price_usd ?? "");
        merged.price_gbp = String(data.price_gbp ?? "");
        merged.faqs = typeof data.faqs === "string" ? data.faqs : JSON.stringify(data.faqs ?? []);
        setForm(merged);
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      payload.service_id = form.service_id;
      payload.icon = form.icon || null;
      payload.color = form.color || null;
      payload.base_price = parseFloat(String(form.base_price)) || 0;
      payload.price_usd = String(form.price_usd) || null;
      payload.price_gbp = String(form.price_gbp) || null;
      payload.is_active = form.is_active === true;
      payload.show_in_list = form.show_in_list !== false;

      try {
        payload.faqs = JSON.parse(String(form.faqs || "[]"));
      } catch {
        payload.faqs = [];
      }

      payload.certificate_image = form.certificate_image || null;

      for (const f of LOCALE_FIELDS) {
        for (const loc of LOCALES) {
          const key = f + loc.suffix;
          const val = form[key];
          if (val !== undefined && val !== null && val !== "")
            payload[key] = typeof val === "boolean" ? val : String(val);
        }
      }

      const url = isNew ? "/api/admin/cms/services" : `/api/admin/cms/services/${id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Service enregistré");
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
          <h1 className="text-2xl font-bold">
            {isNew ? "Nouveau service" : "Modifier le service"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isNew ? "Créez un nouveau service" : "Modifiez les informations du service"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/cms">
              <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 h-11 px-0 flex-wrap">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
          >
            <Icon icon="lucide:settings" className="mr-2 h-4 w-4" />
            Général
          </TabsTrigger>
          {LOCALES.map((loc) => (
            <TabsTrigger
              key={loc.code}
              value={loc.code}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
            >
              <Icon icon={loc.flagIcon} className="mr-2 h-4 w-4" />
              {loc.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service ID *</Label>
                  <Input
                    value={String(form.service_id ?? "")}
                    onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                    placeholder="ex: identity_verification_form_notarized"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icône (Iconify)</Label>
                  <Input
                    value={String(form.icon ?? "")}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="ex: material-symbols-light:person-check-outline"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <Input
                    value={String(form.color ?? "")}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="ex: #051DFC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix de base (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(form.base_price ?? "")}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix USD ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(form.price_usd ?? "")}
                    onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prix GBP (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={String(form.price_gbp ?? "")}
                  onChange={(e) => setForm({ ...form, price_gbp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Image certificat (URL)</Label>
                <Input
                  value={String(form.certificate_image ?? "")}
                  onChange={(e) => setForm({ ...form, certificate_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>FAQs (JSON)</Label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={String(form.faqs ?? "[]")}
                  onChange={(e) => setForm({ ...form, faqs: e.target.value })}
                  placeholder='[{"q":"...","a":"..."}]'
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active === true}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label>Service actif</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.show_in_list !== false}
                    onCheckedChange={(v) => setForm({ ...form, show_in_list: v })}
                  />
                  <Label>Afficher dans la liste</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {LOCALES.map((loc) => (
          <TabsContent key={loc.code} value={loc.code} className="m-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contenu — {loc.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <LocaleFields form={form} setForm={setForm} locale={loc.code} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
