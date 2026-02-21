"use client";

import { useState, useMemo } from "react";
import { useCommunications, EmailItem, SmsItem } from "@/hooks/useCommunications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(n: number, total: number) {
  if (total === 0) return "0%";
  return ((n / total) * 100).toFixed(1) + "%";
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  "abandoned_cart_h+1": "Panier H+1",
  "abandoned_cart_j+1": "Panier J+1",
  "abandoned_cart_j+3": "Panier J+3",
  "abandoned_cart_j+7": "Panier J+7",
  "abandoned_cart_j+10": "Panier J+10",
  "abandoned_cart_j+15": "Panier J+15",
  "abandoned_cart_j+30": "Panier J+30",
  payment_success: "Paiement réussi",
  payment_failed: "Paiement échoué",
  notarized_file_uploaded: "Fichier notarié",
  message_received: "Message reçu",
  submission_updated: "Soumission MAJ",
};

export default function CommunicationsPage() {
  const { emails, sms, emailStats, smsStats, loading, error } =
    useCommunications();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredEmails = useMemo(() => {
    let list = emails;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.email.toLowerCase().includes(q) ||
          (e.recipient_name || "").toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.email_type.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((e) => e.email_type === typeFilter);
    }
    return list;
  }, [emails, search, typeFilter]);

  const filteredSms = useMemo(() => {
    let list = sms;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.phone_number.toLowerCase().includes(q) ||
          (s.recipient_name || "").toLowerCase().includes(q) ||
          s.message.toLowerCase().includes(q) ||
          s.sms_type.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((s) => s.sms_type === typeFilter);
    }
    return list;
  }, [sms, search, typeFilter]);

  const emailTypes = useMemo(
    () => Array.from(new Set(emails.map((e) => e.email_type))).sort(),
    [emails]
  );
  const smsTypes = useMemo(
    () => Array.from(new Set(sms.map((s) => s.sms_type))).sort(),
    [sms]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-muted-foreground">Emails et SMS centralisés</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-muted-foreground">Emails et SMS centralisés</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSent = emailStats.total + smsStats.total;
  const totalDelivered = emailStats.delivered + smsStats.delivered;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-muted-foreground">Emails et SMS centralisés</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total envoyés" value={totalSent} />
        <StatCard
          label="Livrés"
          value={totalDelivered}
          sub={pct(totalDelivered, totalSent)}
          color="text-blue-600"
        />
        <StatCard
          label="Ouverts"
          value={emailStats.opened}
          sub={pct(emailStats.opened, emailStats.total)}
          color="text-emerald-600"
        />
        <StatCard
          label="Cliqués"
          value={emailStats.clicked}
          sub={pct(emailStats.clicked, emailStats.total)}
          color="text-violet-600"
        />
        <StatCard
          label="Rebonds"
          value={emailStats.bounced}
          sub={pct(emailStats.bounced, emailStats.total)}
          color="text-red-600"
        />
        <StatCard
          label="SMS échoués"
          value={smsStats.failed}
          sub={pct(smsStats.failed, smsStats.total)}
          color="text-amber-600"
        />
        <StatCard
          label="Spam"
          value={emailStats.spam}
          sub={pct(emailStats.spam, emailStats.total)}
          color="text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher par email, téléphone, nom, sujet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Tous les types</option>
          <optgroup label="Emails">
            {emailTypes.map((t) => (
              <option key={t} value={t}>
                {EMAIL_TYPE_LABELS[t] || t}
              </option>
            ))}
          </optgroup>
          <optgroup label="SMS">
            {smsTypes.map((t) => (
              <option key={t} value={t}>
                {EMAIL_TYPE_LABELS[t] || t}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="emails" className="space-y-4">
        <TabsList>
          <TabsTrigger value="emails">
            Emails ({filteredEmails.length})
          </TabsTrigger>
          <TabsTrigger value="sms">SMS ({filteredSms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="emails">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historique emails</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Aucun email trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmails.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(e.sent_at)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {e.recipient_name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {e.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {EMAIL_TYPE_LABELS[e.email_type] || e.email_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate text-sm">
                            {e.subject}
                          </TableCell>
                          <TableCell>
                            <EmailStatusBadges email={e} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historique SMS</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSms.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Aucun SMS trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSms.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(s.sent_at)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {s.recipient_name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {s.phone_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {EMAIL_TYPE_LABELS[s.sms_type] || s.sms_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm">
                            {s.message}
                          </TableCell>
                          <TableCell>
                            <SmsStatusBadges sms={s} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
        {sub && (
          <p className={`text-xs ${color || "text-muted-foreground"}`}>{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function EmailStatusBadges({ email }: { email: EmailItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700">
        Envoyé
      </span>
      {email.delivered_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800">
          Livré
        </span>
      )}
      {email.opened_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800">
          Ouvert
        </span>
      )}
      {email.clicked_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-800">
          Cliqué
        </span>
      )}
      {email.bounced_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-800">
          Rebond
        </span>
      )}
      {email.dropped_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800">
          Refusé
        </span>
      )}
      {email.spam_reported_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-800">
          Spam
        </span>
      )}
      {email.unsubscribed_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-800">
          Désabonné
        </span>
      )}
    </div>
  );
}

function SmsStatusBadges({ sms }: { sms: SmsItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700">
        Envoyé
      </span>
      {sms.delivered_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800">
          Livré
        </span>
      )}
      {sms.failed_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-800">
          Échoué
        </span>
      )}
      {!sms.delivered_at && !sms.failed_at && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800">
          En cours
        </span>
      )}
    </div>
  );
}
