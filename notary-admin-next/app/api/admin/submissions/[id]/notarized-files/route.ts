import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "submission-documents";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: files, error } = await supabase
      .from("notarized_files")
      .select("id, file_name, file_url, file_size, storage_path, uploaded_at")
      .eq("submission_id", id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("[API notarized-files GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Générer des URLs signées si storage_path existe
    const filesWithUrls = await Promise.all(
      (files || []).map(async (f) => {
        let url = f.file_url;
        if (f.storage_path) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(f.storage_path, 3600);
          if (signed?.signedUrl) url = signed.signedUrl;
        }
        return { ...f, file_url: url };
      })
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (err) {
    console.error("[API notarized-files GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: submissionId } = await params;
    if (!submissionId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files?.length) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Vérifier que la submission existe
    const { data: sub, error: subError } = await supabase
      .from("submission")
      .select("id")
      .eq("id", submissionId)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    // Récupérer un notary_id (requis par la table) - utiliser le premier notaire actif
    const { data: notaries } = await supabase
      .from("notary")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    const notaryId = notaries?.[0]?.id;
    if (!notaryId) {
      return NextResponse.json(
        { error: "Aucun notaire configuré. Veuillez créer un notaire dans la base de données pour pouvoir uploader des documents." },
        { status: 400 }
      );
    }

    const uploaded: { id: string; file_name: string; file_url: string }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file?.name || file.size === 0) continue;

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: fichier trop volumineux (max 50 Mo)`);
        continue;
      }

      const mimeType = file.type || "application/octet-stream";
      if (!ALLOWED_TYPES.includes(mimeType) && !file.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`${file.name}: type non autorisé (PDF, PNG, JPG, GIF, WEBP uniquement)`);
        continue;
      }

      const ext = file.name.split(".").pop() || "pdf";
      const fileName = `${submissionId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[Upload]", uploadError);
        errors.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

      const { data: fileData, error: insertError } = await supabase
        .from("notarized_files")
        .insert({
          submission_id: submissionId,
          notary_id: notaryId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: mimeType,
          file_size: file.size,
          storage_path: uploadData.path,
        })
        .select("id, file_name, file_url")
        .single();

      if (insertError) {
        console.error("[Insert notarized_files]", insertError);
        await supabase.storage.from(BUCKET).remove([uploadData.path]);
        errors.push(`${file.name}: ${insertError.message}`);
        continue;
      }

      uploaded.push(fileData);
    }

    if (uploaded.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: "Échec des uploads", details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      uploaded,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploaded.length} fichier(s) uploadé(s)${errors.length > 0 ? `. ${errors.length} erreur(s).` : ""}`,
    });
  } catch (err) {
    console.error("[API notarized-files POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
