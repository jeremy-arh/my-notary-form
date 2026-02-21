"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { TicketDetailPanel } from "@/components/support/TicketDetailPanel";

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  resolved: "Résolu",
  closed: "Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  waiting: "bg-gray-100 text-gray-700 border-gray-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  submission_id: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  submission: { id: string; first_name?: string; last_name?: string; email?: string } | null;
  client: { id: string; first_name?: string; last_name?: string; email?: string } | null;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support", { credentials: "include" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTickets(data.tickets || []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setUpdating((s) => new Set(s).add(ticketId));
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Statut mis à jour");
      fetchTickets();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating((s) => {
        const next = new Set(s);
        next.delete(ticketId);
        return next;
      });
    }
  };

  const openTicketDetail = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDetailPanelOpen(true);
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    waiting: tickets.filter((t) => t.status === "waiting").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div
      key={ticket.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => openTicketDetail(ticket.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{ticket.subject}</span>
          <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority] || ""}>
            {PRIORITY_LABELS[ticket.priority] || ticket.priority}
          </Badge>
          <Badge variant="outline" className={STATUS_COLORS[ticket.status] || ""}>
            {STATUS_LABELS[ticket.status] || ticket.status}
          </Badge>
        </div>
        {ticket.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
            {ticket.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <span>
            {format(new Date(ticket.created_at), "d MMM yyyy", { locale: fr })}
          </span>
          {ticket.submission && (
            <>
              <span>•</span>
              <span>
                {ticket.submission.first_name || ticket.submission.last_name
                  ? `${ticket.submission.first_name || ""} ${ticket.submission.last_name || ""}`.trim()
                  : ticket.submission.email || "Commande"}
              </span>
            </>
          )}
          {ticket.client && (
            <>
              <span>•</span>
              <span>
                {ticket.client.first_name || ticket.client.last_name
                  ? `${ticket.client.first_name || ""} ${ticket.client.last_name || ""}`.trim()
                  : ticket.client.email || "Client"}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Select
          value={ticket.status}
          onValueChange={(v) => handleStatusChange(ticket.id, v)}
          disabled={updating.has(ticket.id)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-muted-foreground">
            Gérez les tickets de support et les demandes clients
          </p>
        </div>
        <Button onClick={() => setShowCreateTicket(true)}>
          <Icon icon="lucide:plus" className="h-4 w-4 mr-2" />
          Créer un ticket
        </Button>
      </div>

      <CreateTicketDialog
        open={showCreateTicket}
        onOpenChange={setShowCreateTicket}
        onSuccess={fetchTickets}
      />

      <TicketDetailPanel
        ticketId={selectedTicketId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onUpdate={fetchTickets}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Liste des tickets</CardTitle>
          <CardDescription>
            Cliquez sur un ticket pour ouvrir le détail, modifier et ajouter des commentaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="all"
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full"
          >
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="overflow-x-auto -mx-1 px-1">
                  <TabsList className="inline-flex h-9 min-w-0 p-1">
                    <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
                    <TabsTrigger value="open">Ouverts ({counts.open})</TabsTrigger>
                    <TabsTrigger value="in_progress">En cours ({counts.in_progress})</TabsTrigger>
                    <TabsTrigger value="waiting">En attente ({counts.waiting})</TabsTrigger>
                    <TabsTrigger value="resolved">Résolus ({counts.resolved})</TabsTrigger>
                    <TabsTrigger value="closed">Fermés ({counts.closed})</TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">Priorité</span>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {(
                  [
                    "all",
                    "open",
                    "in_progress",
                    "waiting",
                    "resolved",
                    "closed",
                  ] as const
                ).map((tab) => (
                  <TabsContent key={tab} value={tab} className="m-0">
                    <div className="space-y-3">
                      {filteredTickets.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
                          {tab === "all"
                            ? "Aucun ticket. Créez un ticket pour commencer."
                            : "Aucun ticket avec ce statut"}
                        </div>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} />
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
