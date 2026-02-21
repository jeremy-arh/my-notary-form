/**
 * Form document upload utilities - Supabase Storage
 */

import { createClient } from "@/lib/supabase/client";

const getSessionId = (): string => {
  if (typeof window === "undefined") return `session_${Date.now()}`;
  let sessionId = localStorage.getItem("formSessionId");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("formSessionId", sessionId);
  }
  return sessionId;
};

const sanitizeFileName = (name: string): string => {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
};

export type UploadedFile = {
  path: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

export async function uploadDocument(
  file: File,
  serviceId: string,
  sessionId?: string
): Promise<UploadedFile> {
  const sid = sessionId ?? getSessionId();
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const fileName = `${sid}/${serviceId}/${timestamp}_${safeName}`;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("form-documents")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  let fileUrl: string;
  const { data: signed } = await supabase.storage
    .from("form-documents")
    .createSignedUrl(data.path, 604800);

  if (signed?.signedUrl) {
    fileUrl = signed.signedUrl;
  } else {
    const { data: pub } = supabase.storage.from("form-documents").getPublicUrl(data.path);
    fileUrl = pub.publicUrl;
  }

  return {
    path: data.path,
    url: fileUrl,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteDocument(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from("form-documents").remove([path]);
  if (error) throw error;
}
