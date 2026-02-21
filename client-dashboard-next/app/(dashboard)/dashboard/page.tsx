"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  country?: string;
  total_price?: number | string;
  data?: { payment?: { payment_status?: string } };
};

type ClientInfo = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
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
        .select("id, created_at, status, first_name, last_name, email, country, total_price, data")
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
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending_payment: "bg-orange-100 text-orange-800 border-orange-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-purple-100 text-purple-800 border-purple-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    const labels: Record<string, string> = {
      pending: "Pending",
      pending_payment: "Pending Payment",
      confirmed: "Confirmed",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus?: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[paymentStatus || "unpaid"] || styles.unpaid}`}>
        {paymentStatus === "paid" ? "Paid" : "Pending"}
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
        firstName: submission.first_name || "",
        lastName: submission.last_name || "",
        email: d.email || "",
        phone: d.phone || "",
        address: d.address || "",
        city: d.city || "",
        postalCode: d.postalCode || d.postal_code || "",
        country: d.country || "",
        notes: d.notes || "",
        timezone: d.timezone || "UTC",
        currency: d.currency || "EUR",
        signatories: d.signatories || [],
        isSignatory: d.isSignatory ?? false,
        submissionId: submission.id,
      };
      localStorage.setItem("notaryFormData", JSON.stringify(formData));
      localStorage.setItem("notaryCurrency", formData.currency);
      router.push("/form/summary");
    },
    [router]
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-black" />
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 z-10 bg-muted shadow-sm [&>th]:bg-muted">
                    <TableHead>ID / Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginationData.currentSubmissions.map((submission) => (
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
                      <TableCell>{submission.country || "—"}</TableCell>
                      <TableCell>{formatDate(submission.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {submission.total_price
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "EUR",
                            }).format(parseFloat(String(submission.total_price)))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 justify-end">
                          {submission.status === "pending_payment" && (
                            <>
                              <button
                                onClick={() => retryPayment(submission)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                                title="Retry Payment"
                              >
                                <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSubmission(submission.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => router.push(`/dashboard/submission/${submission.id}`)}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
                            title="View"
                          >
                            <Icon icon="lucide:eye" className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="w-10">
                        <Icon icon="lucide:chevron-right" className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
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
