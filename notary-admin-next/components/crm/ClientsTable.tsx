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
import type { Client } from "@/hooks/useClients";
import { SendMessageDialog } from "@/components/shared/SendMessageDialog";

const CRM_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  proposal: "Proposition",
  negotiation: "Négociation",
  won: "Gagné",
  lost: "Perdu",
};

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
}

export function ClientsTable({ clients, loading }: ClientsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [messageClient, setMessageClient] = useState<Client | null>(null);

  const filtered = clients.filter(
    (c) =>
      !search ||
      (c.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
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
      <Input
        placeholder="Rechercher (nom, email...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Statut CRM</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    router.push(
                      `/dashboard/orders?search=${encodeURIComponent(client.email)}&status=all`
                    )
                  }
                >
                  <TableCell>
                    <p className="font-medium">
                      {client.first_name} {client.last_name}
                    </p>
                  </TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || "—"}</TableCell>
                  <TableCell>{client.country || "—"}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                      {CRM_STATUS_LABELS[client.crm_status || "new"] || client.crm_status || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(client.created_at), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageClient(client);
                        }}
                        title="Envoyer un message"
                      >
                        <Icon icon="lucide:send" className="h-3.5 w-3.5" />
                      </Button>
                      <Icon icon="lucide:chevron-right" className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {messageClient && (
        <SendMessageDialog
          open={!!messageClient}
          onOpenChange={(o) => !o && setMessageClient(null)}
          recipient={{
            name: [messageClient.first_name, messageClient.last_name].filter(Boolean).join(" ") || "Client",
            email: messageClient.email,
            phone: messageClient.phone,
          }}
          clientId={messageClient.id}
        />
      )}
    </div>
  );
}
