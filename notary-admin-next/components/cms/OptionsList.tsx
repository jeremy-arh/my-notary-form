"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Option {
  id: string;
  option_id: string;
  name: string;
  description?: string;
  icon?: string;
  additional_price: number;
  is_active: boolean;
}

export function OptionsList() {
  const router = useRouter();
  const [options, setOptions] = useState<Option[]>([]);
  const [filtered, setFiltered] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/cms/options", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setOptions(data.options || []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search) setFiltered(options);
    else {
      const s = search.toLowerCase();
      setFiltered(options.filter((o) => o.name?.toLowerCase().includes(s) || o.description?.toLowerCase().includes(s)));
    }
  }, [options, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette option ?")) return;
    try {
      const res = await fetch(`/api/admin/cms/options/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Option supprimée");
      setOptions((prev) => prev.filter((o) => o.id !== id));
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleActive = async (opt: Option) => {
    try {
      const res = await fetch(`/api/admin/cms/options/${opt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !opt.is_active }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(opt.is_active ? "Option désactivée" : "Option activée");
      setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, is_active: !o.is_active } : o)));
    } catch {
      toast.error("Erreur lors de la mise à jour");
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Options</h2>
          <p className="text-sm text-muted-foreground">Gérer les options de service</p>
        </div>
        <Button onClick={() => router.push("/dashboard/cms/option/new")}>
          <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
          Nouvelle option
        </Button>
      </div>

      <Input
        placeholder="Rechercher une option..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((opt) => (
          <Card key={opt.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Icon icon={opt.icon || "lucide:sliders-horizontal"} className="h-6 w-6 text-muted-foreground" />
                </div>
                <Badge variant={opt.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(opt)}>
                  {opt.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">{opt.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{opt.description}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">+{Number(opt.additional_price || 0).toFixed(2)} €</span>
                <span className="text-xs text-muted-foreground font-mono">{opt.option_id}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="flex-1" onClick={() => router.push(`/dashboard/cms/option/${opt.id}`)}>
                  <Icon icon="lucide:pencil" className="mr-1 h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(opt.id)}>
                  <Icon icon="lucide:trash-2" className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
          Aucune option trouvée
        </div>
      )}
    </div>
  );
}
