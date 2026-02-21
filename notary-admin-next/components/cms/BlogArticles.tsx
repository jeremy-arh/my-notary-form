"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function BlogArticles() {
  const router = useRouter();
  const [articles, setArticles] = useState<Record<string, unknown>[]>([]);
  const [filtered, setFiltered] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/cms/blog", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setArticles(data.articles || []);
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let f = articles;
    if (statusFilter !== "all") f = f.filter((a) => a.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(
        (a) =>
          (a.title as string)?.toLowerCase().includes(s) ||
          (a.excerpt as string)?.toLowerCase().includes(s)
      );
    }
    setFiltered(f);
  }, [articles, search, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;
    try {
      const res = await fetch(`/api/admin/cms/blog/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Article supprimé");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      published: "bg-green-100 text-green-700",
      archived: "bg-yellow-100 text-yellow-700",
    };
    return (
      <Badge variant="secondary" className={map[status] || map.draft}>
        {(status || "draft").toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Articles de blog</h2>
          <p className="text-sm text-muted-foreground">Gérer les articles de blog</p>
        </div>
        <Button onClick={() => router.push("/dashboard/cms/blog/new")}>
          <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
          Nouvel article
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Rechercher par titre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm max-w-[180px]"
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
          <option value="archived">Archivé</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((article) => (
          <Card key={String(article.id)} className="overflow-hidden">
            {article.cover_image_url && (
              <img
                src={article.cover_image_url as string}
                alt={(article.cover_image_alt as string) || (article.title as string)}
                className="h-40 w-full object-cover"
              />
            )}
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                {getStatusBadge((article.status as string) || "draft")}
                {article.is_featured && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Featured
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold line-clamp-2 mb-2">{article.title as string}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.excerpt as string}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>{format(new Date((article.published_at || article.created_at) as string), "d MMM yyyy", { locale: fr })}</span>
                <span>{Number(article.views_count || 0)} vues</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="flex-1" onClick={() => router.push(`/dashboard/cms/blog/${article.id}`)}>
                  <Icon icon="lucide:pencil" className="mr-1 h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(article.id as string)}>
                  <Icon icon="lucide:trash-2" className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
          Aucun article trouvé
        </div>
      )}
    </div>
  );
}
