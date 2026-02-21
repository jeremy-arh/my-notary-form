import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communications",
};

export default function CommunicationsLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
