"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useOrders } from "@/hooks/useOrders";
import { OrdersTable } from "@/components/orders/OrdersTable";

function OrdersContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "pending";

  const { submissions, loading, error, refetch } = useOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commandes</h1>
        <p className="text-muted-foreground">Liste des commandes et dossiers</p>
      </div>

      {initialSearch && (
        <div className="flex items-center gap-2">
          <Link href="/dashboard/crm?tab=clients">
            <Button variant="outline" size="sm">
              <Icon icon="lucide:arrow-left" className="mr-1.5 h-3.5 w-3.5" />
              Retour aux clients
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            Filtré par : <strong>{initialSearch}</strong>
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Liste des commandes</CardTitle>
          <CardDescription>
            Cliquez sur une ligne pour ouvrir la fiche — filtre et recherche
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <OrdersTable
              submissions={submissions}
              loading={loading}
              onRefetch={refetch}
              initialSearch={initialSearch}
              initialStatus={initialStatus}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <OrdersContent />
    </Suspense>
  );
}
