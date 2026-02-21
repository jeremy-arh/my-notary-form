"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useKpis, type PeriodFilter, type ChartDataPoint } from "@/hooks/useKpis";
import { FUNNEL_LABELS, FUNNEL_STATUS_ORDER } from "@/hooks/usePipeline";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

const FUNNEL_COLORS: Record<string, string> = {
  started: "#64748b",
  services_selected: "#0ea5e9",
  documents_uploaded: "#8b5cf6",
  delivery_method_selected: "#ec4899",
  personal_info_completed: "#f97316",
  summary_viewed: "#eab308",
  payment_pending: "#06b6d4",
  payment_completed: "#10b981",
  submission_completed: "#14b8a6",
};

function monotoneCubicPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  const n = pts.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    dy.push(pts[i + 1].y - pts[i].y);
    m.push(dx[i] === 0 ? 0 : dy[i] / dx[i]);
  }

  const tangents: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents.push(0);
    } else {
      tangents.push((m[i - 1] + m[i]) / 2);
    }
  }
  tangents.push(m[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-6) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / m[i];
      const beta = tangents[i + 1] / m[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * alpha * m[i];
        tangents[i + 1] = t * beta * m[i];
      }
    }
  }

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dx[i] / 3;
    const cp1x = pts[i].x + seg;
    const cp1y = pts[i].y + tangents[i] * seg;
    const cp2x = pts[i + 1].x - seg;
    const cp2y = pts[i + 1].y - tangents[i + 1] * seg;
    d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)},${cp2x.toFixed(1)},${cp2y.toFixed(1)},${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

type ChartMode = "line" | "bar";

function ActivityChart({ chartData }: { chartData: ChartDataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ChartMode>("line");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggleStatus = (status: string) => {
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const { allStatuses, visibleStatuses, points, padding, w, h, labelStep, maxCount } = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 44, left: 20 };
    const h = 300;
    const w = containerWidth;
    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;

    const found = new Set<string>();
    chartData.forEach((p) => Object.keys(p.statusCounts || {}).forEach((s) => found.add(s)));
    const allStatuses = FUNNEL_STATUS_ORDER.filter((s) => found.has(s));
    const visibleStatuses = allStatuses.filter((s) => !hiddenStatuses.has(s));

    const maxCount = Math.max(
      1,
      ...chartData.flatMap((p) =>
        visibleStatuses.map((s) => p.statusCounts?.[s] || 0)
      )
    );

    const points: Record<string, { x: number; y: number }[]> = {};
    allStatuses.forEach((s) => {
      points[s] = chartData.map((p, i) => ({
        x: padding.left + (i / Math.max(1, chartData.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((p.statusCounts?.[s] || 0) / maxCount) * chartHeight,
      }));
    });

    const maxLabels = Math.floor(w / 70);
    const labelStep = Math.max(1, Math.ceil(chartData.length / maxLabels));

    return { allStatuses, visibleStatuses, points, padding, w, h, labelStep, maxCount };
  }, [chartData, containerWidth, hiddenStatuses]);

  if (chartData.length === 0) return null;
  if (allStatuses.length === 0) {
    return (
      <div ref={containerRef} className="flex h-[340px] items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">Aucune donnée sur la période</p>
      </div>
    );
  }

  const chartWidth = w - padding.left - padding.right;
  const chartHeight = h - padding.top - padding.bottom;

  const hoveredX = hoveredIndex !== null
    ? padding.left + (hoveredIndex / Math.max(1, chartData.length - 1)) * chartWidth
    : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
          <button
            onClick={() => setMode("line")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${mode === "line" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon icon="lucide:trending-up" className="inline h-3.5 w-3.5 mr-1" />
            Lignes
          </button>
          <button
            onClick={() => setMode("bar")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${mode === "bar" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon icon="lucide:bar-chart-3" className="inline h-3.5 w-3.5 mr-1" />
            Barres
          </button>
        </div>
      </div>

      <svg width={w} height={h} className="block w-full">
        {mode === "line" && visibleStatuses.map((status) => {
          const pts = points[status];
          if (!pts || pts.length === 0) return null;
          const color = FUNNEL_COLORS[status] || "#9ca3af";
          if (pts.length === 1) {
            return <circle key={status} cx={pts[0].x} cy={pts[0].y} r={4} fill={color} />;
          }
          return (
            <path
              key={status}
              d={monotoneCubicPath(pts)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}

        {mode === "bar" && chartData.map((point, i) => {
          const groupX = padding.left + (i / Math.max(1, chartData.length - 1)) * chartWidth;
          const barGroupWidth = chartWidth / chartData.length * 0.8;
          const barW = visibleStatuses.length > 0 ? barGroupWidth / visibleStatuses.length : 0;
          return visibleStatuses.map((status, si) => {
            const count = point.statusCounts?.[status] || 0;
            if (count === 0) return null;
            const barH = (count / maxCount) * chartHeight;
            const x = groupX - barGroupWidth / 2 + si * barW;
            const y = padding.top + chartHeight - barH;
            const color = FUNNEL_COLORS[status] || "#9ca3af";
            return (
              <rect
                key={`bar-${i}-${status}`}
                x={x}
                y={y}
                width={Math.max(1, barW - 1)}
                height={barH}
                rx={2}
                fill={color}
                opacity={hoveredIndex === i ? 1 : 0.8}
              />
            );
          });
        })}

        {hoveredX !== null && (
          <line x1={hoveredX} y1={padding.top} x2={hoveredX} y2={h - padding.bottom} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
        )}

        {mode === "line" && hoveredIndex !== null && visibleStatuses.map((status) => {
          const pts = points[status];
          if (!pts?.[hoveredIndex]) return null;
          const color = FUNNEL_COLORS[status] || "#9ca3af";
          return (
            <circle
              key={`dot-${status}`}
              cx={pts[hoveredIndex].x}
              cy={pts[hoveredIndex].y}
              r={4}
              fill={color}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}

        {chartData.map((_, i) => {
          const x = padding.left + (i / Math.max(1, chartData.length - 1)) * chartWidth;
          const sliceW = chartWidth / Math.max(1, chartData.length - 1);
          return (
            <rect
              key={`hit-${i}`}
              x={x - sliceW / 2}
              y={padding.top}
              width={sliceW}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}

        {chartData.map((p, i) => {
          if (i % labelStep !== 0 && i !== chartData.length - 1) return null;
          const x = padding.left + (i / Math.max(1, chartData.length - 1)) * chartWidth;
          return (
            <text key={i} x={x} y={h - 6} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {p.date}
            </text>
          );
        })}
      </svg>

      {hoveredIndex !== null && hoveredX !== null && (() => {
        const point = chartData[hoveredIndex];
        const entries = visibleStatuses
          .map((s) => ({ status: s, count: point.statusCounts?.[s] || 0 }))
          .filter((e) => e.count > 0);
        if (entries.length === 0) return null;
        const tooltipLeft = hoveredX > w / 2 ? hoveredX - 180 : hoveredX + 12;
        return (
          <div
            className="absolute pointer-events-none z-10 rounded-lg border bg-popover px-3 py-2 shadow-md"
            style={{ left: tooltipLeft, top: padding.top }}
          >
            <p className="text-xs font-semibold mb-1.5">{point.date}</p>
            {entries.map((e) => (
              <div key={e.status} className="flex items-center gap-2 py-0.5">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: FUNNEL_COLORS[e.status] || "#9ca3af" }} />
                <span className="text-xs text-muted-foreground flex-1">{FUNNEL_LABELS[e.status] || e.status}</span>
                <span className="text-xs font-medium ml-3">{e.count}</span>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 justify-center">
        {allStatuses.map((status) => {
          const hidden = hiddenStatuses.has(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-35" : "opacity-100"}`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: FUNNEL_COLORS[status] || "#9ca3af" }}
              />
              <span className={`text-xs ${hidden ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
                {FUNNEL_LABELS[status] || status}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
];

export default function KpisPage() {
  const [period, setPeriod] = useState<PeriodFilter>("30");
  const { stats, chartData, recentSubmissions, loading, error } = useKpis(period);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">KPIs & Revenus</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPIs & Revenus</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble des performances</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === opt.value
                  ? "bg-black text-white"
                  : "bg-white border text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
              <Icon icon="lucide:trending-up" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Commandes totales</CardTitle>
              <Icon icon="lucide:folder-open" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">Sur la période</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
              <Icon icon="lucide:percent" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)} %</div>
              <p className="text-xs text-muted-foreground">Commandes complétées</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Submissions en cours</CardTitle>
              <Icon icon="lucide:activity" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.submissionsInProgress}</div>
              <p className="text-xs text-muted-foreground">
                Valeur : {formatCurrency(stats.pipelineValue)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activité</CardTitle>
          <CardDescription>
            Submissions par statut sur les {period} derniers jours
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-6 sm:px-6">
          {loading ? (
            <div className="h-[360px] animate-pulse rounded-lg bg-muted/30" />
          ) : chartData.length === 0 ? (
            <div className="h-[360px] flex items-center justify-center rounded-lg border border-dashed bg-muted/30">
              <p className="text-sm text-muted-foreground">Aucune donnée sur la période</p>
            </div>
          ) : (
            <ActivityChart chartData={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dernières commandes</CardTitle>
          <CardDescription>5 commandes payées les plus récentes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted/50" />
              ))}
            </div>
          ) : recentSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune commande récente</p>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map((sub) => (
                <Link
                  key={sub.id as string}
                  href={`/dashboard/orders/${sub.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {((sub.first_name as string) || (sub.data as { contact?: { PRENOM?: string } })?.contact?.PRENOM || "—")}{" "}
                      {(sub.last_name as string) || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sub.created_at as string), "d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      sub.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : sub.status === "pending_payment"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {sub.status as string}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
