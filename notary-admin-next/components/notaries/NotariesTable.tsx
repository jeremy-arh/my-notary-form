"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { NotaryListItem } from "@/app/api/admin/notaries/route";
import { InviteNotaryDialog } from "./InviteNotaryDialog";

interface NotariesTableProps {
  notaries: NotaryListItem[];
  loading: boolean;
  onInviteSuccess?: () => void;
}

export function NotariesTable({ notaries, loading, onInviteSuccess }: NotariesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = notaries.filter(
    (n) =>
      !search ||
      (n.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.city || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Rechercher (nom, e-mail, ville…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <InviteNotaryDialog onSuccess={onInviteSuccess} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Création</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun notaire trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((n) => (
                <TableRow
                  key={n.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/dashboard/notaries/${n.id}`)}
                >
                  <TableCell>
                    <p className="font-medium">{n.full_name || n.name}</p>
                    {n.full_name && n.name !== n.full_name && (
                      <p className="text-xs text-muted-foreground">{n.name}</p>
                    )}
                  </TableCell>
                  <TableCell>{n.email}</TableCell>
                  <TableCell>{n.phone || "—"}</TableCell>
                  <TableCell>
                    {n.user_id ? (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-1 text-xs">
                        Connecté
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 px-2 py-1 text-xs">
                        Pas encore connecté
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {n.is_active ? (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">Actif</span>
                    ) : (
                      <span className="rounded-full bg-destructive/10 text-destructive px-2 py-1 text-xs">
                        Inactif
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{n.city || "—"}</TableCell>
                  <TableCell>
                    {format(new Date(n.created_at), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Fiche détail"
                      onClick={() => router.push(`/dashboard/notaries/${n.id}`)}
                    >
                      <Icon icon="lucide:chevron-right" className="h-4 w-4" />
                    </Button>
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
