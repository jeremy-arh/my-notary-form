import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#f9fafb]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col lg:pl-64">
        <div className="flex items-center gap-4 px-4 py-2 lg:hidden border-b bg-white">
          <MobileNav />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
