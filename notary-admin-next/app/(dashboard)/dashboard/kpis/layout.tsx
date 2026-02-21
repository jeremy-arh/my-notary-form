import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KPIs",
};

export default function KpisLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
