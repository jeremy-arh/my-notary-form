"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOGO_BLACK } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      }
    };
    checkUser();
  }, [router]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMagicLinkSent(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9fafb]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex flex-col gap-4">
            <Image src={LOGO_BLACK} alt="My Notary" width={180} height={33} className="h-10 w-auto" />
            <span className="text-lg font-normal text-muted-foreground">Sign in</span>
          </CardTitle>
          <CardDescription>
            Enter your email to receive a sign-in link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {magicLinkSent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-800">Magic link sent!</p>
                <p className="text-sm text-green-700 mt-1">
                  Check your email and click the link to sign in. The link expires in 1 hour.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMagicLinkSent(false);
                  setError("");
                }}
              >
                Send another link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-black hover:bg-black/90 text-white rounded-lg"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/form" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to form
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
