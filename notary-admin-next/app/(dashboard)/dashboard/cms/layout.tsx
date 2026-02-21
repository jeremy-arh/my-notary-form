import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CMS",
};

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
