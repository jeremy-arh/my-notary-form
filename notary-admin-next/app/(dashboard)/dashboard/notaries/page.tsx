"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotariesTable } from "@/components/notaries/NotariesTable";
import { useNotaries } from "@/hooks/useNotaries";

export default function NotariesPage() {
  const { notaries, loading, error, refetch } = useNotaries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notaires</h1>
        <p className="text-muted-foreground">
          Liste des notaires, invitation par e-mail (magic link) et fiches détaillées.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tous les notaires</CardTitle>
          <CardDescription>
            {loading ? "Chargement…" : `${notaries.length} notaire${notaries.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotariesTable notaries={notaries} loading={loading} onInviteSuccess={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}
