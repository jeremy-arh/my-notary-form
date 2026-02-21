import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Gère le callback du magic link Supabase.
 * Supabase utilise le flux PKCE : le lien redirige vers ?code=xxx (pas #access_token).
 * On échange le code pour une session côté serveur afin de définir correctement les cookies.
 *
 * IMPORTANT : Ajoutez http://localhost:3001/auth/callback dans Supabase Dashboard
 * > Authentication > URL Configuration > Redirect URLs
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in Route Handlers
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Pas de code ou erreur : redirection vers login
  return NextResponse.redirect(new URL("/login", request.url));
}
