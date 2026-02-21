"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/cms/RichTextEditor";

const defaultForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "draft",
  cover_image_url: "",
  cover_image_alt: "",
};

export default function BlogArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/cms/blog/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          status: data.status || "draft",
          cover_image_url: data.cover_image_url || "",
          cover_image_alt: data.cover_image_alt || "",
        });
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      const url = isNew ? "/api/admin/cms/blog" : `/api/admin/cms/blog/${id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur");
      await res.json();
      toast.success("Article enregistré");
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
          <h1 className="text-2xl font-bold">{isNew ? "Nouvel article" : "Modifier l'article"}</h1>
          <p className="text-muted-foreground text-sm">
            {isNew ? "Créez un nouvel article de blog" : "Modifiez l'article"}
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
          <CardTitle>Contenu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="url-de-larticle" />
          </div>
          <div className="space-y-2">
            <Label>Extrait</Label>
            <RichTextEditor
              value={form.excerpt}
              onChange={(html) => setForm({ ...form, excerpt: html })}
              minHeight="100px"
            />
          </div>
          <div className="space-y-2">
            <Label>Contenu</Label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Rédigez le contenu de l'article..."
              minHeight="300px"
            />
          </div>
          <div className="space-y-2">
            <Label>Image de couverture (URL)</Label>
            <Input
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Alt image</Label>
            <Input value={form.cover_image_alt} onChange={(e) => setForm({ ...form, cover_image_alt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </select>
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
