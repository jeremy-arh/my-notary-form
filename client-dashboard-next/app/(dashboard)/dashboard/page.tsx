"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Submission = {
  id: string;
  created_at: string;
  status: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  total_price?: number | string;
  data?: { payment?: { payment_status?: string } };
};

type ClientInfo = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
};

const ITEMS_PER_PAGE = 6;

export default function DashboardPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    pending_payment: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Always call ensure-client: creates client if missing, and relinks orphaned submissions by email
      const res = await fetch("/api/ensure-client", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to ensure client");
      const { client: clientFromApi } = await res.json();
      const client = clientFromApi as ClientInfo | null;

      if (!client) throw new Error("No client");

      setClientInfo(client);

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submission")
        .select("id, created_at, status, first_name, last_name, email, phone, address, city, postal_code, country, total_price, data")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      const list = (submissionsData || []) as Submission[];
      setSubmissions(list);

      setStats({
        total: list.length,
        pending: list.filter((s) => s.status === "pending").length,
        pending_payment: list.filter((s) => s.status === "pending_payment").length,
        confirmed: list.filter((s) => s.status === "confirmed").length,
        completed: list.filter((s) => s.status === "completed").length,
        cancelled: list.filter((s) => s.status === "cancelled").length,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending:         "bg-amber-50 text-amber-700 border-amber-200",
      pending_payment: "bg-orange-50 text-orange-700 border-orange-200",
      confirmed:       "bg-green-50 text-green-700 border-green-200",
      in_progress:     "bg-sky-50 text-sky-700 border-sky-200",
      completed:       "bg-emerald-50 text-emerald-700 border-emerald-200",
      cancelled:       "bg-red-50 text-red-700 border-red-200",
    };
    const labels: Record<string, string> = {
      pending:         "Pending",
      pending_payment: "Pending Payment",
      confirmed:       "Confirmed",
      in_progress:     "In Progress",
      completed:       "Completed",
      cancelled:       "Cancelled",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus?: string) => {
    const isPaid = paymentStatus === "paid";
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
        isPaid
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-orange-50 text-orange-700 border-orange-200"
      }`}>
        {isPaid ? "Paid" : "Pending"}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const deleteSubmission = useCallback(
    async (submissionId: string) => {
      if (!confirm("Delete this request? This cannot be undone.")) return;
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("submission")
          .delete()
          .eq("id", submissionId)
          .eq("status", "pending_payment");

        if (error) throw error;
        toast.success("Request deleted");
        fetchData();
      } catch {
        toast.error("Failed to delete");
      }
    },
    [fetchData]
  );

  const retryPayment = useCallback(
    (submission: Submission) => {
      const d = (submission.data as Record<string, unknown>) || {};
      const formData = {
        selectedServices: d.selectedServices || d.selected_services || [],
        serviceDocuments: d.serviceDocuments || d.documents || {},
        deliveryMethod: d.deliveryMethod || d.delivery_method || "digital",
        firstName: submission.first_name || clientInfo?.first_name || "",
        lastName: submission.last_name || clientInfo?.last_name || "",
        email: submission.email || clientInfo?.email || "",
        phone: submission.phone || clientInfo?.phone || "",
        address: submission.address || clientInfo?.address || "",
        city: submission.city || clientInfo?.city || "",
        postalCode: submission.postal_code || clientInfo?.postal_code || "",
        country: submission.country || clientInfo?.country || "",
        notes: (d.notes as string) || "",
        timezone: (d.timezone as string) || "UTC",
        currency: (d.currency as string) || "EUR",
        signatories: d.signatories || [],
        isSignatory: d.isSignatory ?? false,
        submissionId: submission.id,
      };
      localStorage.setItem("notaryFormData", JSON.stringify(formData));
      localStorage.setItem("notaryCurrency", String(formData.currency));
      router.push("/form/summary");
    },
    [router, clientInfo]
  );

  const filteredSubmissions = useMemo(() => {
    if (selectedStatus === "all") return submissions;
    return submissions.filter((s) => s.status === selectedStatus);
  }, [submissions, selectedStatus]);

  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentSubmissions = filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    return { totalPages, startIndex, currentSubmissions };
  }, [filteredSubmissions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-4 border-b pb-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-36" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="h-12 w-full border-b bg-gray-50 flex items-center gap-4 px-4">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "all", label: "All", count: stats.total, icon: "lucide:layout-grid" },
    { id: "pending", label: "Pending", count: stats.pending, icon: "lucide:clock" },
    { id: "pending_payment", label: "Pending Payment", count: stats.pending_payment, icon: "lucide:credit-card" },
    { id: "confirmed", label: "Confirmed", count: stats.confirmed, icon: "lucide:check-circle" },
    { id: "completed", label: "Completed", count: stats.completed, icon: "lucide:check-circle" },
    { id: "cancelled", label: "Cancelled", count: stats.cancelled, icon: "lucide:x-circle" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-muted-foreground">Welcome, {clientInfo?.first_name || ""}! Manage your notary service requests</p>
      </div>

      <div className="flex gap-4 border-b overflow-x-auto pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`flex items-center gap-2 pb-2 text-sm font-medium whitespace-nowrap ${
              selectedStatus === tab.id ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon icon={tab.icon} className="w-4 h-4" />
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Request List</CardTitle>
            <CardDescription>Click on a row to view details</CardDescription>
          </div>
          <Link href="/form">
            <Button className="bg-black hover:bg-black/90">
              <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <Icon icon="lucide:file-text" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No requests yet</p>
            <Link href="/form">
              <Button className="bg-black hover:bg-black/90">Submit a Request</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
              {paginationData.currentSubmissions.map((submission) => {
                const docCount = Object.values(
                  ((submission.data?.serviceDocuments || submission.data?.documents || {}) as Record<string, unknown[]>)
                ).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
                const sigCount = Array.isArray(submission.data?.signatories)
                  ? (submission.data.signatories as unknown[]).length
                  : 0;
                const name = submission.first_name || submission.last_name
                  ? `${submission.first_name || ""} ${submission.last_name || ""}`.trim()
                  : submission.id.slice(0, 8);
                return (
                  <div
                    key={submission.id}
                    className="rounded-xl border bg-white p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/dashboard/submission/${submission.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{submission.email || "—"}</p>
                      </div>
                      <span className="text-base font-bold shrink-0">
                        {submission.total_price
                          ? new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parseFloat(String(submission.total_price)))
                          : "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getStatusBadge(submission.status)}
                      {getPaymentBadge(submission.data?.payment?.payment_status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:file-text" className="w-3.5 h-3.5" />{docCount} doc{docCount !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="lucide:users" className="w-3.5 h-3.5" />{sigCount} sig{sigCount !== 1 ? "s" : ""}
                        </span>
                        <span>{formatDate(submission.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {submission.status === "pending_payment" && (
                          <>
                            <button onClick={() => retryPayment(submission)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Retry Payment">
                              <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteSubmission(submission.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                              <Icon icon="lucide:trash-2" className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <Icon icon="lucide:chevron-right" className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 z-10 bg-muted shadow-sm [&>th]:bg-muted">
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-center">Docs</TableHead>
                    <TableHead className="text-center">Sigs</TableHead>
                    <TableHead className="hidden lg:table-cell">Country</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginationData.currentSubmissions.map((submission) => {
                    const docCount = Object.values(
                      ((submission.data?.serviceDocuments || submission.data?.documents || {}) as Record<string, unknown[]>)
                    ).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
                    const sigCount = Array.isArray(submission.data?.signatories)
                      ? (submission.data.signatories as unknown[]).length
                      : 0;
                    return (
                      <TableRow
                        key={submission.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/dashboard/submission/${submission.id}`)}
                      >
                        <TableCell>
                          <span className="font-medium">
                            {submission.first_name || submission.last_name
                              ? `${submission.first_name || ""} ${submission.last_name || ""}`.trim()
                              : submission.id.slice(0, 8)}
                          </span>
                          <p className="text-xs text-muted-foreground">{submission.email || "—"}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>{getPaymentBadge(submission.data?.payment?.payment_status)}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Icon icon="lucide:file-text" className="w-3.5 h-3.5 shrink-0" />
                            {docCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Icon icon="lucide:users" className="w-3.5 h-3.5 shrink-0" />
                            {sigCount}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{submission.country || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(submission.created_at)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {submission.total_price
                            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parseFloat(String(submission.total_price)))
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-end">
                            {submission.status === "pending_payment" && (
                              <>
                                <button onClick={() => retryPayment(submission)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Retry Payment">
                                  <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteSubmission(submission.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                  <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <Icon icon="lucide:chevron-right" className="w-4 h-4 text-muted-foreground ml-1" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {paginationData.totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {paginationData.startIndex + 1} to{" "}
                  {Math.min(paginationData.startIndex + ITEMS_PER_PAGE, filteredSubmissions.length)} of{" "}
                  {filteredSubmissions.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon icon="lucide:chevron-left" className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">
                    Page {currentPage} / {paginationData.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(paginationData.totalPages, p + 1))}
                    disabled={currentPage === paginationData.totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
