/**
 * POST /api/abandon-submissions
 * Marque toutes les soumissions pending_payment d'un email comme "abandoned".
 * Appelé quand l'utilisateur choisit de recommencer depuis zéro.
 *
 * Body: { email: string } ou { submissionIds: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, submissionIds } = body as {
      email?: string;
      submissionIds?: string[];
    };

    if (!email && (!submissionIds || submissionIds.length === 0)) {
      return NextResponse.json({ error: "email or submissionIds required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (submissionIds && submissionIds.length > 0) {
      await supabase
        .from("submission")
        .update({ status: "abandoned" })
        .in("id", submissionIds)
        .eq("status", "pending_payment");
    } else if (email) {
      await supabase
        .from("submission")
        .update({ status: "abandoned" })
        .eq("email", email)
        .eq("status", "pending_payment");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[abandon-submissions]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
