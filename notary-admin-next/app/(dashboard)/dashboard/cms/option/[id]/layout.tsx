import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Option",
};

export default function OptionLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
