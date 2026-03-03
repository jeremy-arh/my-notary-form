import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Analytics from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Submit your request",
  description: "Submit your notary service request online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#f9fafb]" suppressHydrationWarning>
        <Analytics />
        {children}
        <Toaster richColors position="top-right" />
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=GTM-PSHQGM2J`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
      </body>
    </html>
  );
}
