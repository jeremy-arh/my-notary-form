import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM",
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
