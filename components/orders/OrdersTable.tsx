"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Submission } from "@/hooks/useOrders";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    pending_payment: "bg-amber-100 text-amber-800",
    pending: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

interface OrdersTableProps {
  submissions: Submission[];
  loading: boolean;
  onRefetch?: () => void;
  initialSearch?: string;
  initialStatus?: string;
}

export function OrdersTable({ submissions, loading, onRefetch, initialSearch = "", initialStatus = "pending" }: OrdersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleConfirm = async (sub: Submission, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (updatingId || sub.status === "completed" || sub.status === "confirmed") return;
    try {
      setUpdatingId(sub.id);
      const res = await fetch(`/api/admin/submissions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "confirmed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la confirmation");
      toast.success("Dossier confirmé");
      onRefetch?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la confirmation");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = submissions.filter((s) => {
    const matchSearch =
      !search ||
      (s.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.id || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = Array.from(new Set(submissions.map((s) => s.status)));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Rechercher (nom, email, ID...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          {statuses
            .filter((s) => s !== "pending")
            .map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </option>
            ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} commande{filtered.length > 1 ? "s" : ""}
        </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 z-10 bg-muted shadow-sm [&>th]:bg-muted">
              <TableHead>ID / Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/dashboard/orders/${sub.id}`)}
                >
                  <TableCell>
                    <span className="font-medium">
                      {sub.first_name || sub.last_name
                        ? `${sub.first_name || ""} ${sub.last_name || ""}`.trim()
                        : sub.id.slice(0, 8)}
                    </span>
                    <p className="text-xs text-muted-foreground">{sub.email || "—"}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell>
                    <StatusBadge status={sub.status} />
                  </TableCell>
                  <TableCell>{sub.country || "—"}</TableCell>
                  <TableCell>
                    {format(new Date(sub.created_at), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    {sub.total_price
                      ? new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(parseFloat(String(sub.total_price)))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {(sub.status === "pending" || sub.status === "pending_payment") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        disabled={updatingId === sub.id}
                        onClick={(e) => handleConfirm(sub, e)}
                      >
                        <Icon icon="lucide:check" className="mr-1.5 h-3.5 w-3.5" />
                        Confirmer
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="w-10">
                    <Icon icon="lucide:chevron-right" className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
