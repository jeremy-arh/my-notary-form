"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  pending_payment: "Paiement en attente",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-800 border-green-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  pending_payment: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const formatPrice = (value: number | null | undefined) =>
  value != null ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value) : null;

interface SubmissionOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  created_at?: string;
  status?: string;
  total_price?: number | null;
  label: string;
}

interface SubmissionSearchSelectProps {
  value: string | null;
  onChange: (submissionId: string | null, submission: SubmissionOption | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function SubmissionSearchSelect({
  value,
  onChange,
  placeholder = "Rechercher une commande...",
  label: labelText,
  disabled,
  className,
}: SubmissionSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SubmissionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SubmissionOption | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSubmissions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      params.set("limit", "15");
      const res = await fetch(`/api/admin/submissions?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOptions(
        (data.submissions || []).map((s: SubmissionOption) => ({
          ...s,
          label:
            [s.first_name, s.last_name].filter(Boolean).join(" ") ||
            s.email ||
            `#${s.id.slice(0, 8)}`,
        }))
      );
      setHighlightedIndex(0);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchSubmissions(search), 300);
    return () => clearTimeout(t);
  }, [open, search, fetchSubmissions]);

  useEffect(() => {
    if (value && options.length > 0 && !selected) {
      const found = options.find((o) => o.id === value);
      if (found) setSelected(found);
    }
    if (!value) setSelected(null);
  }, [value, options, selected, selected?.id]);

  useEffect(() => {
    if (value && !selected) {
      fetch(`/api/admin/submissions/${value}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.submission) {
            const s = data.submission;
            const opt: SubmissionOption = {
              id: s.id,
              first_name: s.first_name,
              last_name: s.last_name,
              email: s.email,
              created_at: s.created_at,
              status: s.status,
              total_price: s.total_price,
              label:
                [s.first_name, s.last_name].filter(Boolean).join(" ") ||
                s.email ||
                `#${s.id.slice(0, 8)}`,
            };
            setSelected(opt);
          }
        })
        .catch(() => {});
    }
  }, [value, selected, selected?.id]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: SubmissionOption | null) => {
    setSelected(opt);
    onChange(opt?.id ?? null, opt);
    setSearch(opt?.label ?? "");
    setOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch("");
    onChange(null, null);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, options.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex === 0) handleSelect(null);
      else if (options[highlightedIndex - 1]) handleSelect(options[highlightedIndex - 1]);
    }
  };

  const displayValue = selected?.label ?? (value ? "Chargement..." : search);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {labelText && <Label className="mb-1 block">{labelText}</Label>}
      <div className="relative">
        <Input
          value={displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selected && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleClear(); }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Effacer"
            >
              <Icon icon="lucide:x" className="h-4 w-4" />
            </button>
          )}
          <Icon icon="lucide:chevron-down" className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : options.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune commande trouvée
            </div>
          ) : (
            <ul className="py-1">
              <li>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between",
                    highlightedIndex === 0 && "bg-muted"
                  )}
                  onClick={() => handleSelect(null)}
                >
                  <span className="text-muted-foreground">Aucune</span>
                </button>
              </li>
              {options.map((opt, i) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-muted flex flex-col gap-0.5",
                      i + 1 === highlightedIndex && "bg-muted"
                    )}
                    onClick={() => handleSelect(opt)}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                      {opt.status && (
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium", SUBMISSION_STATUS_COLORS[opt.status] || "bg-gray-100 text-gray-800 border-gray-200")}
                        >
                          {SUBMISSION_STATUS_LABELS[opt.status] || opt.status}
                        </Badge>
                      )}
                      {opt.total_price != null && (
                        <span className="font-medium text-foreground">{formatPrice(opt.total_price)}</span>
                      )}
                      {opt.created_at && (
                        <span>{format(new Date(opt.created_at), "d MMM yyyy", { locale: fr })}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
