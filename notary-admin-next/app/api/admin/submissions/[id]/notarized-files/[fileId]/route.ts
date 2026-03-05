import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "submission-documents";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: submissionId, fileId } = await params;
    if (!submissionId || !fileId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: file, error: fetchError } = await supabase
      .from("notarized_files")
      .select("id, storage_path, submission_id")
      .eq("id", fileId)
      .eq("submission_id", submissionId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    if (file.storage_path) {
      await supabase.storage.from(BUCKET).remove([file.storage_path]);
    }

    const { error: deleteError } = await supabase
      .from("notarized_files")
      .delete()
      .eq("id", fileId)
      .eq("submission_id", submissionId);

    if (deleteError) {
      console.error("[API notarized-files DELETE]", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API notarized-files DELETE]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
