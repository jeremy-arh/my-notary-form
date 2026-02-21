"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          window.history.replaceState({}, document.title, "/auth/callback");
          router.replace("/dashboard");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to sign in. Please try again.");
        }
      } else {
        router.replace("/login");
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9fafb]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/login" className="text-sm font-medium text-foreground hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9fafb]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
