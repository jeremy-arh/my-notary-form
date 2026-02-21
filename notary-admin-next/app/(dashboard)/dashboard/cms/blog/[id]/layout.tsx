import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Article",
};

export default function BlogArticleLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
