import ClientLayout from "@/components/dashboard/ClientLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
