"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { initCrisp, openCrisp } from "@/lib/utils/crisp";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LOGO_WHITE, LOGO_BLACK } from "@/lib/constants";
import { toast } from "sonner";

const menuItems = [
  { path: "/dashboard", name: "My Requests", icon: "lucide:file-text" },
  { path: "/dashboard/profile", name: "Settings", icon: "lucide:settings" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    initCrisp();
  }, []);

  // Update document title to tab name (no My Notary)
  useEffect(() => {
    const item = menuItems.find(
      (m) => pathname === m.path || (m.path === "/dashboard" && pathname?.startsWith("/dashboard/submission"))
    );
    if (item) {
      document.title = item.name;
    }
  }, [pathname]);

  useEffect(() => {
    const fetchClient = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("client")
        .select("id, email")
        .eq("user_id", user.id)
        .maybeSingle();

      setClientEmail(client?.email || user.email || null);
    };
    fetchClient();
  }, []);

  const handleLogout = async () => {
    setMobileOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {menuItems.map((item) => {
        const isActive =
          pathname === item.path ||
          (item.path === "/dashboard" && pathname?.startsWith("/dashboard/submission"));
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              isActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon icon={item.icon} className="h-5 w-5 shrink-0" />
            <span className="flex-1 min-w-0">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#f9fafb]">
      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#000000] text-white flex flex-col hidden lg:flex">
        <div className="p-4 pt-6 shrink-0 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center justify-center">
            <Image src={LOGO_WHITE} alt="My Notary" width={140} height={28} className="h-8 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
          <button
            onClick={() => openCrisp()}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white/80 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon icon="lucide:headphones" className="h-5 w-5 shrink-0" />
            <span>Contact</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-white/80 text-sm truncate px-4 py-2 mb-2">{clientEmail || "User"}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white"
          >
            <Icon icon="lucide:log-out" className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-64">
        {/* Mobile header */}
        <div className="flex items-center gap-4 px-4 py-2 lg:hidden border-b bg-white">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Icon icon="lucide:menu" className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-[#000000] border-0 p-0" hideClose>
              <div className="flex flex-col h-full">
                <div className="p-4 pt-6 shrink-0 border-b border-white/10">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center justify-center">
                    <Image src={LOGO_WHITE} alt="My Notary" width={140} height={28} className="h-8 w-auto" />
                  </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      openCrisp();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/5"
                  >
                    <Icon icon="lucide:headphones" className="h-5 w-5 shrink-0" />
                    <span>Contact</span>
                  </button>
                </nav>
                <div className="p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    <Icon icon="lucide:log-out" className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex-1 flex justify-center">
            <Image src={LOGO_BLACK} alt="My Notary" width={120} height={24} className="h-6 w-auto" />
          </Link>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
