"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Service {
  id: string;
  service_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  base_price: number;
  is_active: boolean;
}

export function ServicesList() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [filtered, setFiltered] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/cms/services", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search) setFiltered(services);
    else {
      const s = search.toLowerCase();
      setFiltered(services.filter((svc) => svc.name?.toLowerCase().includes(s) || svc.description?.toLowerCase().includes(s)));
    }
  }, [services, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) return;
    try {
      const res = await fetch(`/api/admin/cms/services/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Service supprimé");
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleActive = async (svc: Service) => {
    try {
      const res = await fetch(`/api/admin/cms/services/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !svc.is_active }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(svc.is_active ? "Service désactivé" : "Service activé");
      setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: !s.is_active } : s)));
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
          <h2 className="text-xl font-semibold">Services</h2>
          <p className="text-sm text-muted-foreground">Gérer les services disponibles</p>
        </div>
        <Button onClick={() => router.push("/dashboard/cms/service/new")}>
          <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
          Nouveau service
        </Button>
      </div>

      <Input
        placeholder="Rechercher un service..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((svc) => (
          <Card key={svc.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${svc.color || "bg-muted"}`}>
                  <Icon icon={svc.icon || "lucide:file-text"} className="h-6 w-6 text-muted-foreground" />
                </div>
                <Badge variant={svc.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(svc)}>
                  {svc.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">{svc.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{Number(svc.base_price || 0).toFixed(2)} €</span>
                <span className="text-xs text-muted-foreground font-mono">{svc.service_id}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="flex-1" onClick={() => router.push(`/dashboard/cms/service/${svc.id}`)}>
                  <Icon icon="lucide:pencil" className="mr-1 h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(svc.id)}>
                  <Icon icon="lucide:trash-2" className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
          Aucun service trouvé
        </div>
      )}
    </div>
  );
}
