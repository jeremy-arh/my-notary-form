"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreateTaskDialogManual } from "@/components/tasks/CreateTaskDialogManual";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

const STATUS_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  done: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

interface Task {
  id: string;
  submission_id: string | null;
  order_item_ref: string;
  option_id: string;
  option_name: string;
  document_context: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  submission: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    created_at?: string;
    status?: string;
    total_price?: number;
  } | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tasks", { credentials: "include" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTasks(data.tasks || []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdating((s) => new Set(s).add(taskId));
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Statut mis à jour");
      fetchTasks();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating((s) => {
        const next = new Set(s);
        next.delete(taskId);
        return next;
      });
    }
  };

  const filteredTasks =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
  };

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDetailPanelOpen(true);
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div
      key={task.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => openTaskDetail(task.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{task.option_name}</span>
          <Badge variant="outline" className={STATUS_COLORS[task.status] || ""}>
            {STATUS_LABELS[task.status] || task.status}
          </Badge>
        </div>
        {task.document_context && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Document : {task.document_context}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          {task.submission_id ? (
          <Link
            href={`/dashboard/orders/${task.submission_id}`}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {task.submission?.first_name || task.submission?.last_name
              ? `${task.submission.first_name || ""} ${task.submission.last_name || ""}`.trim()
              : task.submission?.email || "Commande"}
          </Link>
          ) : (
            <span className="text-muted-foreground">Tâche manuelle</span>
          )}
          {task.submission_id && <span>•</span>}
          {task.submission_id && (
          <span>
            {task.submission?.created_at
              ? format(new Date(task.submission.created_at), "d MMM yyyy", { locale: fr })
              : "-"}
          </span>
          )}
          {task.submission_id && task.submission?.total_price != null && (
            <>
              <span>•</span>
              <span>{Number(task.submission.total_price).toFixed(2)} €</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Select
          value={task.status}
          onValueChange={(v) => handleStatusChange(task.id, v)}
          disabled={updating.has(task.id)}
        >
          <SelectTrigger className="w-[160px]">
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
        {task.submission_id && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/orders/${task.submission_id}`}>
              <Icon icon="lucide:external-link" className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tâches</h1>
          <p className="text-muted-foreground">
            Tâches créées automatiquement ou manuellement pour chaque option
          </p>
        </div>
        <Button onClick={() => setShowCreateTask(true)}>
          <Icon icon="lucide:plus" className="h-4 w-4 mr-2" />
          Créer une tâche
        </Button>
      </div>

      <CreateTaskDialogManual
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onSuccess={fetchTasks}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onUpdate={fetchTasks}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Liste des tâches</CardTitle>
          <CardDescription>
            Cliquez sur une tâche pour ouvrir le détail, modifier et ajouter des commentaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="all"
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending">À faire ({counts.pending})</TabsTrigger>
              <TabsTrigger value="in_progress">En cours ({counts.in_progress})</TabsTrigger>
              <TabsTrigger value="done">Terminé ({counts.done})</TabsTrigger>
              <TabsTrigger value="cancelled">Annulé ({counts.cancelled})</TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {(["all", "pending", "in_progress", "done", "cancelled"] as const).map((tab) => (
                  <TabsContent key={tab} value={tab} className="m-0">
                    <div className="space-y-3">
                      {filteredTasks.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
                          {tab === "all"
                            ? "Aucune tâche pour le moment. Créez une tâche manuellement ou consultez une commande contenant des options."
                            : "Aucune tâche avec ce statut"}
                        </div>
                      ) : (
                        filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
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
