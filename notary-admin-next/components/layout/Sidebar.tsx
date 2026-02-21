"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LOGO_WHITE } from "@/lib/constants";

const navItems = [
  { href: "/dashboard/kpis", label: "KPIs", icon: "lucide:layout-dashboard", countKey: null as string | null },
  { href: "/dashboard/crm", label: "CRM", icon: "lucide:kanban", countKey: null },
  { href: "/dashboard/orders", label: "Commandes", icon: "lucide:folder-open", countKey: null },
  { href: "/dashboard/tasks", label: "Tâches", icon: "lucide:check-square", countKey: "tasks" },
  { href: "/dashboard/support", label: "Support", icon: "lucide:headphones", countKey: "support" },
  { href: "/dashboard/communications", label: "Communications", icon: "lucide:mail", countKey: null },
  { href: "/dashboard/cms", label: "CMS", icon: "lucide:file-text", countKey: null },
  { href: "/dashboard/settings", label: "Paramètres", icon: "lucide:settings", countKey: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<{ tasks_pending: number; support_pending: number }>({
    tasks_pending: 0,
    support_pending: 0,
  });

  useEffect(() => {
    fetch("/api/admin/counts", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setCounts({
            tasks_pending: data.tasks_pending ?? 0,
            support_pending: data.support_pending ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#000000] text-white flex flex-col hidden lg:flex">
      <div className="p-4 pt-6 shrink-0 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image src={LOGO_WHITE} alt="My Notary" width={140} height={28} className="h-8 w-auto" />
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const count =
            item.countKey === "tasks"
              ? counts.tasks_pending
              : item.countKey === "support"
                ? counts.support_pending
                : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-white/10 text-white"
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon icon={item.icon} className="h-5 w-5 shrink-0" />
              <span className="flex-1 min-w-0">{item.label}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-black">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white"
        >
          <Icon icon="lucide:log-out" className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
