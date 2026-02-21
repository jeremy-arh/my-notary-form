"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

export type PeriodFilter = "7" | "30" | "90";

export interface KpiStats {
  totalSubmissions: number;
  monthlyRevenue: number;
  totalRevenue: number;
  conversionRate: number;
  submissionsInProgress: number;
  pipelineValue: number;
}

export interface ChartDataPoint {
  date: string;
  dateKey: string;
  submissions: number;
  revenue: number;
  statusCounts: Record<string, number>;
}

export interface StatusDistribution {
  name: string;
  value: number;
}

export function useKpis(period: PeriodFilter = "30") {
  const [stats, setStats] = useState<KpiStats>({
    totalSubmissions: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    conversionRate: 0,
    submissionsInProgress: 0,
    pipelineValue: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const days = parseInt(period, 10);
        const startDate = subDays(new Date(), days);

        const { data: submissions, error: subError } = await supabase
          .from("submission")
          .select("id, status, funnel_status, created_at, total_price, data, first_name, last_name, email")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false });

        if (subError) throw subError;

        const subs = submissions || [];

        // Revenue calculation
        let totalRev = 0;
        let monthlyRev = 0;
        let pipelineVal = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const inProgressStatuses = ["pending", "pending_payment", "confirmed", "in_progress"];
        let inProgress = 0;

        subs.forEach((sub) => {
          const payment = (sub.data as { payment?: { amount_paid?: number } })?.payment;
          const amount = payment?.amount_paid
            ? payment.amount_paid / 100
            : sub.total_price
              ? parseFloat(String(sub.total_price))
              : 0;

          if (amount > 0) {
            totalRev += amount;
            const subDate = new Date(sub.created_at as string);
            if (subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear) {
              monthlyRev += amount;
            }
          }

          if (inProgressStatuses.includes(sub.status as string)) {
            inProgress++;
            pipelineVal += amount || 0;
          }
        });

        const paidCount = subs.filter((s) => {
          const payment = (s.data as { payment?: { amount_paid?: number; payment_status?: string } })?.payment;
          return (payment?.amount_paid && payment.amount_paid > 0) || payment?.payment_status === "paid";
        }).length;
        const conversionRate = subs.length > 0 ? (paidCount / subs.length) * 100 : 0;

        setStats({
          totalSubmissions: subs.length,
          monthlyRevenue: monthlyRev,
          totalRevenue: totalRev,
          conversionRate,
          submissionsInProgress: inProgress,
          pipelineValue: pipelineVal,
        });

        // Chart data
        const interval = eachDayOfInterval({
          start: startDate,
          end: new Date(),
        });

        const getEffectiveFunnelStatus = (s: (typeof subs)[0]): string => {
          if (s.status === "confirmed" || s.status === "completed") return "submission_completed";
          const parsed = typeof s.data === "string" ? (() => { try { return JSON.parse(s.data); } catch { return null; } })() : s.data;
          const paymentStatus = (parsed as { payment?: { payment_status?: string } } | null)?.payment?.payment_status;
          if (paymentStatus === "paid") return "payment_completed";
          if ((s.funnel_status as string) === "payment_pending") return "summary_viewed";
          return (s.funnel_status as string) || "started";
        };

        const chartMap = interval.map((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const daySubs = subs.filter((s) => {
            const d = new Date(s.created_at as string);
            return format(d, "yyyy-MM-dd") === dateKey;
          });
          const statusCounts: Record<string, number> = {};
          daySubs.forEach((s) => {
            const st = getEffectiveFunnelStatus(s);
            statusCounts[st] = (statusCounts[st] || 0) + 1;
          });
          let dayRev = 0;
          daySubs.forEach((s) => {
            const p = (s.data as { payment?: { amount_paid?: number } })?.payment;
            dayRev += p?.amount_paid ? p.amount_paid / 100 : parseFloat(String(s.total_price || 0)) || 0;
          });
          return {
            date: format(date, "d MMM", { locale: fr }),
            dateKey,
            submissions: daySubs.length,
            revenue: dayRev,
            statusCounts,
          };
        });

        setChartData(chartMap);

        // Status distribution
        const statusCounts: Record<string, number> = {};
        subs.forEach((s) => {
          const st = (s.status as string) || "unknown";
          statusCounts[st] = (statusCounts[st] || 0) + 1;
        });
        setStatusDistribution(
          Object.entries(statusCounts).map(([name, value]) => ({
            name: name === "pending_payment" ? "Paiement en attente" : name,
            value,
          }))
        );

        const paidSubs = subs.filter((s) => {
          const payment = (s.data as { payment?: { amount_paid?: number; payment_status?: string } })?.payment;
          return (payment?.amount_paid && payment.amount_paid > 0) || payment?.payment_status === "paid";
        });
        setRecentSubmissions(paidSubs.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  return { stats, chartData, statusDistribution, recentSubmissions, loading, error };
}
