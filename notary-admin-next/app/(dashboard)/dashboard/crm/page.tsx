"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipeline } from "@/hooks/usePipeline";
import { useClients } from "@/hooks/useClients";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { ClientsTable } from "@/components/crm/ClientsTable";

const PIPELINE_FILTER_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "pending_payment", label: "Paiement en attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
];

const DATE_FILTER_OPTIONS = [
  { value: "all", label: "Toutes les dates" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
];

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const { columns, totalSubmissions, loading: pipelineLoading, moveSubmission } = usePipeline(pipelineFilter, dateFilter);
  const { clients, loading: clientsLoading } = useClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM</h1>
        <p className="text-muted-foreground">Pipeline et gestion des clients</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <TabsList className="w-fit">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>
          {activeTab === "pipeline" && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {totalSubmissions} dossier{totalSubmissions > 1 ? "s" : ""}
              </span>
              <select
                value={pipelineFilter}
                onChange={(e) => setPipelineFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm"
              >
                {PIPELINE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm"
              >
                {DATE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Kanban</CardTitle>
              <CardDescription>
                Submissions par funnel_status — utilisez le menu déroulant sur chaque carte pour
                déplacer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineBoard
                columns={columns}
                totalSubmissions={totalSubmissions}
                loading={pipelineLoading}
                onMove={moveSubmission}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des clients</CardTitle>
              <CardDescription>
                Recherche et liste des clients — {clients.length} client{clients.length > 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientsTable clients={clients} loading={clientsLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
