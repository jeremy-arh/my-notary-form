"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  getServicePrice,
  getServicePriceCurrency,
  getOptionPrice,
  getOptionPriceCurrency,
} from "@/lib/utils/pricing";
import { formatPriceSync } from "@/lib/utils/currency";

type Submission = {
  id: string;
  created_at: string;
  status: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  notes?: string;
  assigned_notary_id?: string;
  data?: Record<string, unknown> & {
    payment?: { payment_status?: string; amount_paid?: number; currency?: string };
  };
  notary?: { id: string; name?: string; email?: string; phone?: string };
};

type ServiceRecord = { service_id: string; name?: string; base_price?: number; price_usd?: number; price_gbp?: number; [key: string]: unknown };
type OptionRecord = { option_id: string; name?: string; additional_price?: number; price_usd?: number; price_gbp?: number; [key: string]: unknown };

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [servicesMap, setServicesMap] = useState<Record<string, ServiceRecord>>({});
  const [optionsMap, setOptionsMap] = useState<Record<string, OptionRecord>>({});
  const [notarizedFiles, setNotarizedFiles] = useState<{ id: string; file_name: string; file_url: string; file_size?: number; uploaded_at: string }[]>([]);
  const [signatories, setSignatories] = useState<{ first_name: string; last_name: string; birth_date?: string; birth_city?: string; postal_address?: string; email?: string; phone?: string }[]>([]);
  const [transactions, setTransactions] = useState<{ id: string; type: string; amount: number; currency: string; status: string; created: number; invoiceUrl?: string; receiptUrl?: string }[]>([]);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"services" | "signatories" | "transactions" | "notarized">("services");

  const fetchSubmission = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      let clientId: string | null = null;
      const { data: client, error: clientError } = await supabase
        .from("client")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clientError) throw clientError;
      clientId = client?.id ?? null;

      if (!clientId) {
        const res = await fetch("/api/ensure-client", { method: "POST", credentials: "include" });
        if (res.ok) {
          const { client: created } = await res.json();
          clientId = created?.id ?? null;
        }
      }

      if (!clientId) {
        setSubmission(null);
        setLoading(false);
        return;
      }

      const { data: sub, error: subError } = await supabase
        .from("submission")
        .select("*")
        .eq("id", id)
        .eq("client_id", clientId)
        .single();

      if (subError || !sub) {
        setSubmission(null);
        return;
      }

      let parsed = sub as Submission;
      if (parsed.data && typeof parsed.data === "string") {
        try {
          parsed = { ...parsed, data: JSON.parse(parsed.data as unknown as string) };
        } catch {
          /* ignore */
        }
      }

      if (parsed.assigned_notary_id) {
        const { data: notary } = await supabase
          .from("notary")
          .select("id, name, email, phone")
          .eq("id", parsed.assigned_notary_id)
          .single();
        parsed.notary = notary || undefined;
      }

      setSubmission(parsed);

      const { data: servicesData } = await supabase.from("services").select("*");
      const sMap: Record<string, ServiceRecord> = {};
      (servicesData || []).forEach((s: ServiceRecord) => {
        if (s?.service_id) sMap[s.service_id] = s;
      });
      setServicesMap(sMap);

      const { data: optionsData } = await supabase.from("options").select("*");
      const oMap: Record<string, OptionRecord> = {};
      (optionsData || []).forEach((o: OptionRecord) => {
        if (o?.option_id) oMap[o.option_id] = o;
      });
      setOptionsMap(oMap);

      const { data: files } = await supabase
        .from("notarized_files")
        .select("id, file_name, file_url, file_size, uploaded_at")
        .eq("submission_id", id)
        .order("uploaded_at", { ascending: false });
      setNotarizedFiles((files as typeof notarizedFiles) || []);

      const { data: sigs } = await supabase
        .from("signatories")
        .select("*")
        .eq("submission_id", id)
        .order("created_at", { ascending: true });
      setSignatories((sigs as typeof signatories) || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load submission");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  useEffect(() => {
    if (activeTab === "transactions" && id && submission) {
      setTransactionsLoading(true);
      fetch(`/api/submissions/${id}/transactions`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.transactions) {
            setTransactions(
              data.transactions.map((t: { id: string; type: string; amount: number; currency: string; status: string; created: number; invoiceUrl?: string; receiptUrl?: string }) => ({
                ...t,
                invoiceUrl: t.invoiceUrl || t.receiptUrl,
              }))
            );
          }
          if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);
        })
        .catch(() => {
          toast.error("Failed to load transactions");
        })
        .finally(() => setTransactionsLoading(false));
    }
  }, [activeTab, id, submission]);

  const getCurrency = () => (submission?.data?.currency as string) || "EUR";

  const formatPrice = (amount: number, sourceCurrency = "EUR") => {
    const currency = getCurrency();
    if (sourceCurrency === currency) return formatPriceSync(amount, currency);
    const rate: Record<string, number> = { USD: 1.1, GBP: 0.85, CAD: 1.5, AUD: 1.65, CHF: 0.95, JPY: 165, CNY: 7.8 };
    const converted = currency === "EUR" ? amount : amount * (rate[currency] ?? 1);
    return formatPriceSync(converted, currency);
  };

  const retryPayment = useCallback(() => {
    if (!submission) return;
    const d = (submission.data as Record<string, unknown>) || {};
    const formData = {
      selectedServices: d.selectedServices || d.selected_services || [],
      serviceDocuments: d.serviceDocuments || d.documents || {},
      deliveryMethod: d.deliveryMethod || d.delivery_method || "digital",
      firstName: submission.first_name || "",
      lastName: submission.last_name || "",
      email: submission.email || (d.email as string) || "",
      phone: (d.phone as string) || "",
      address: (d.address as string) || "",
      city: (d.city as string) || "",
      postalCode: (d.postalCode as string) || (d.postal_code as string) || "",
      country: (d.country as string) || "",
      notes: (d.notes as string) || "",
      timezone: (d.timezone as string) || "UTC",
      currency: getCurrency(),
      signatories: d.signatories || [],
      isSignatory: d.isSignatory ?? false,
      submissionId: submission.id,
    };
    localStorage.setItem("notaryFormData", JSON.stringify(formData));
    localStorage.setItem("notaryCurrency", formData.currency);
    router.push("/form/summary");
  }, [submission, router]);

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

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
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-black" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center">
        <Icon icon="lucide:alert-circle" className="w-16 h-16 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold mb-2">Request not found</p>
        <Link href="/dashboard">
          <Button className="bg-black hover:bg-black/90">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  const selectedServices = (submission.data?.selectedServices || submission.data?.selected_services || []) as string[];
  const serviceDocuments = (submission.data?.serviceDocuments || submission.data?.documents || {}) as Record<string, { name?: string; size?: number; selectedOptions?: string[]; public_url?: string; url?: string }[]>;

  const signatoriesFromData = submission.data?.signatories || submission.data?.signatoriesByDocument;
  let globalSignatories = signatories;
  if (globalSignatories.length === 0 && signatoriesFromData) {
    if (Array.isArray(signatoriesFromData)) {
      globalSignatories = signatoriesFromData.map((s: Record<string, unknown>) => ({
        first_name: (s.firstName || s.first_name || "") as string,
        last_name: (s.lastName || s.last_name || "") as string,
        birth_date: (s.birthDate || s.birth_date || "") as string,
        birth_city: (s.birthCity || s.birth_city || "") as string,
        postal_address: (s.postalAddress || s.postal_address || "") as string,
        email: (s.email || "") as string,
        phone: (s.phone || "") as string,
      }));
    } else if (typeof signatoriesFromData === "object") {
      const seen = new Map<string, { first_name: string; last_name: string; birth_date?: string; birth_city?: string; postal_address?: string; email?: string; phone?: string }>();
      Object.values(signatoriesFromData).forEach((sigs: unknown) => {
        (sigs as Record<string, unknown>[] || []).forEach((s) => {
          const key = `${s.firstName || s.first_name}_${s.lastName || s.last_name}_${s.birthDate || s.birth_date}`;
          if (!seen.has(key)) {
            seen.set(key, {
              first_name: (s.firstName || s.first_name || "") as string,
              last_name: (s.lastName || s.last_name || "") as string,
              birth_date: (s.birthDate || s.birth_date || "") as string,
              birth_city: (s.birthCity || s.birth_city || "") as string,
              postal_address: (s.postalAddress || s.postal_address || "") as string,
              email: (s.email || "") as string,
              phone: (s.phone || "") as string,
            });
          }
        });
      });
      globalSignatories = Array.from(seen.values());
    }
  }

  const tabs = [
    { id: "services" as const, label: "Services & Documents", icon: "lucide:file-text" },
    { id: "signatories" as const, label: "Signatories", icon: "lucide:users" },
    { id: "transactions" as const, label: "Transactions", icon: "lucide:credit-card", count: transactions.length },
    { id: "notarized" as const, label: "Notarized Documents", icon: "lucide:file-check", count: notarizedFiles.length },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/dashboard"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4 mr-2" />
          Back to dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Request details</h1>
            <p className="text-sm text-muted-foreground">Submitted on {formatDate(submission.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            {submission.status === "pending_payment" && (
              <button
                onClick={retryPayment}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-full hover:bg-orange-700 transition-colors"
              >
                <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                Retry payment
              </button>
            )}
            {getStatusBadge(submission.status)}
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b overflow-x-auto pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-2 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon icon={tab.icon} className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === "services" && (
          <Card>
            <CardHeader>
              <CardTitle>Services & Documents</CardTitle>
            </CardHeader>
            <CardContent>
            {selectedServices.length === 0 ? (
              <p className="text-muted-foreground">No service selected.</p>
            ) : (
              <div className="space-y-4">
                {selectedServices.map((serviceId) => {
                  const service = servicesMap[serviceId];
                  const documents = serviceDocuments[serviceId] || [];
                  if (!service) return null;
                  const currency = getCurrency();
                  const servicePrice = getServicePrice(service, currency);
                  const serviceTotal = documents.length * servicePrice;
                  return (
                    <div key={serviceId} className="rounded-xl p-4 border bg-muted/30">
                      <h3 className="font-semibold">{service.name || serviceId}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {documents.length} doc(s) × {formatPrice(servicePrice, getServicePriceCurrency(service, currency))} ={" "}
                        <span className="font-bold">{formatPrice(serviceTotal, getServicePriceCurrency(service, currency))}</span>
                      </p>
                      <div className="mt-3 pl-4 border-l-2 space-y-2">
                        {documents.map((doc, i) => (
                          <div key={i} className="rounded-lg p-2 flex items-center justify-between bg-muted/50">
                            <span className="text-sm font-medium truncate">{doc.name || `Document ${i + 1}`}</span>
                            {(doc.public_url || doc.url) && (
                              <a
                                href={doc.public_url || doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-black hover:underline flex items-center gap-1"
                              >
                                <Icon icon="lucide:download" className="w-4 h-4" /> Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-bold">
                    {(() => {
                      let total = 0;
                      selectedServices.forEach((sid) => {
                        const svc = servicesMap[sid];
                        const docs = serviceDocuments[sid] || [];
                        if (svc) {
                          total += docs.length * getServicePrice(svc, getCurrency());
                          docs.forEach((doc) => {
                            (doc.selectedOptions || []).forEach((optId) => {
                              const opt = optionsMap[optId];
                              if (opt) total += getOptionPrice(opt, getCurrency());
                            });
                          });
                        }
                      });
                      return formatPrice(total, "EUR");
                    })()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {activeTab === "signatories" && (
          <Card>
            <CardHeader>
              <CardTitle>Signatories</CardTitle>
            </CardHeader>
            <CardContent>
            {globalSignatories.length === 0 ? (
              <p className="text-muted-foreground">No signatory.</p>
            ) : (
              <div className="space-y-3">
                {globalSignatories.map((sig, i) => (
                  <div key={i} className="rounded-lg p-3 border bg-muted/30">
                    <p className="font-semibold">
                      {sig.first_name} {sig.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">Date of birth: {sig.birth_date || "N/A"}</p>
                    {sig.email && <p className="text-xs text-muted-foreground">Email: {sig.email}</p>}
                  </div>
                ))}
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {activeTab === "transactions" && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Transactions</CardTitle>
                {(invoiceUrl || transactions.some((t) => t.invoiceUrl)) && (
                  <a
                    href={invoiceUrl || transactions.find((t) => t.invoiceUrl)?.invoiceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-black hover:bg-black/90">
                      <Icon icon="lucide:file-text" className="w-4 h-4 mr-2" />
                      Download Invoice
                    </Button>
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">No transaction.</p>
                {submission.status === "pending_payment" && (
                  <Button onClick={retryPayment} className="bg-black hover:bg-black/90">
                    <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                    Retry payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Invoice / Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm font-semibold">{tx.type === "refund" ? "Refund" : "Payment"}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${tx.type === "refund" ? "text-red-600" : ""}`}>
                          {tx.type === "refund" ? "-" : ""}
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: tx.currency }).format(tx.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.type === "refund" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                            {tx.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(tx.created * 1000).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tx.invoiceUrl && (
                            <a
                              href={tx.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-black hover:underline font-medium"
                              title="Download invoice / receipt"
                            >
                              <Icon icon="lucide:download" className="w-4 h-4" />
                              Receipt
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {activeTab === "notarized" && (
          <Card>
            <CardHeader>
              <CardTitle>Notarized Documents</CardTitle>
            </CardHeader>
            <CardContent>
            {notarizedFiles.length === 0 ? (
              <p className="text-muted-foreground">No notarized document yet.</p>
            ) : (
              <div className="space-y-4">
                {notarizedFiles.map((file) => (
                  <div key={file.id} className="rounded-xl p-4 border bg-muted/30 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{file.file_name}</h3>
                      <p className="text-sm text-muted-foreground">{formatDate(file.uploaded_at)}</p>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="bg-black hover:bg-black/90">
                        <Icon icon="lucide:download" className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {submission.notary && (
          <Card>
            <CardHeader>
              <CardTitle>Assigned Notary</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{submission.notary.name}</span></p>
              <p><span className="text-muted-foreground">Email:</span> <span className="font-semibold">{submission.notary.email}</span></p>
              {submission.notary.phone && (
                <p><span className="text-muted-foreground">Phone:</span> <span className="font-semibold">{submission.notary.phone}</span></p>
              )}
            </div>
            </CardContent>
          </Card>
        )}

        {submission.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{submission.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
