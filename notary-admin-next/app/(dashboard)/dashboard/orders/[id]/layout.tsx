import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Détail commande",
};

export default function OrderDetailLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
