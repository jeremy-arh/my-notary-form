"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FUNNEL_LABELS,
  FUNNEL_STATUS_ORDER,
  type PipelineSubmission,
} from "@/hooks/usePipeline";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

interface PipelineBoardProps {
  columns: { id: string; title: string; submissions: PipelineSubmission[] }[];
  totalSubmissions: number;
  loading: boolean;
  onMove: (submissionId: string, newStatus: string) => Promise<void>;
}

function SubmissionCard({
  sub,
  onMove,
}: {
  sub: PipelineSubmission;
  onMove: (id: string, status: string) => Promise<void>;
}) {
  const [moving, setMoving] = useState(false);
  const name = [sub.first_name, sub.last_name].filter(Boolean).join(" ") || sub.email || sub.id.slice(0, 8);
  const amount = sub.total_price
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
        parseFloat(String(sub.total_price))
      )
    : "—";

  const handleMove = async (newStatus: string) => {
    if (newStatus === sub.funnel_status) return;
    setMoving(true);
    try {
      await onMove(sub.id, newStatus);
      toast.success(`Déplacé vers « ${FUNNEL_LABELS[newStatus] || newStatus} »`);
    } catch {
      toast.error("Erreur lors du déplacement");
    } finally {
      setMoving(false);
    }
  };

  return (
    <Card className="group relative cursor-pointer transition-shadow hover:shadow-md">
      <Link href={`/dashboard/orders/${sub.id}`}>
        <CardContent className="p-4">
          <p className="font-medium truncate">{name}</p>
          {sub.email && (
            <p className="text-xs text-muted-foreground truncate mt-0.5" title={sub.email}>
              {sub.email}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 mt-2">
            <p className="text-sm font-medium text-primary">{amount}</p>
            <span className="rounded-full px-2 py-0.5 text-xs bg-muted">
              {STATUS_LABELS[sub.status] || sub.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{sub.country || "—"}</span>
            <span>{format(new Date(sub.created_at), "d MMM yyyy", { locale: fr })}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">#{sub.id.slice(0, 8)}</p>
        </CardContent>
      </Link>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <select
          disabled={moving}
          value={sub.funnel_status || "started"}
          onChange={(e) => handleMove(e.target.value)}
          className="h-7 rounded border bg-background px-2 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {FUNNEL_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {FUNNEL_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}

export function PipelineBoard({ columns, totalSubmissions, loading, onMove }: PipelineBoardProps) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {FUNNEL_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="min-w-[340px] flex-shrink-0 rounded-lg border bg-muted/30 p-4"
          >
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded bg-muted/50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const count = col.submissions.length;
        const percent = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0;
        return (
        <div
          key={col.id}
          className="min-w-[340px] max-w-[340px] flex-shrink-0 flex flex-col rounded-lg border bg-muted/20"
        >
          <div className="flex-shrink-0 border-b p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{col.title}</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                {percent}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {count} submission{count > 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-2 p-4 pb-8">
            {col.submissions.map((sub) => (
              <SubmissionCard key={sub.id} sub={sub} onMove={onMove} />
            ))}
          </div>
        </div>
      );
      })}
    </div>
  );
}
