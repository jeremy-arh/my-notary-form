"use client";

import { useState, useEffect, useCallback } from "react";

export interface EmailItem {
  id: string;
  email: string;
  recipient_name: string | null;
  email_type: string;
  subject: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  clicked_url: string | null;
  bounced_at: string | null;
  dropped_at: string | null;
  spam_reported_at: string | null;
  unsubscribed_at: string | null;
  submission_id: string | null;
  client_id: string | null;
}

export interface SmsItem {
  id: string;
  phone_number: string;
  recipient_name: string | null;
  sms_type: string;
  message: string;
  sent_at: string;
  delivered_at: string | null;
  failed_at: string | null;
  submission_id: string | null;
  client_id: string | null;
}

export interface EmailStats {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  dropped: number;
  spam: number;
}

export interface SmsStats {
  total: number;
  delivered: number;
  failed: number;
}

export function useCommunications() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [sms, setSms] = useState<SmsItem[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, dropped: 0, spam: 0 });
  const [smsStats, setSmsStats] = useState<SmsStats>({ total: 0, delivered: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/communications");
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setEmails(json.emails || []);
      setSms(json.sms || []);
      setEmailStats(json.emailStats || { total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, dropped: 0, spam: 0 });
      setSmsStats(json.smsStats || { total: 0, delivered: 0, failed: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { emails, sms, emailStats, smsStats, loading, error, refresh: fetch_ };
}
