"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initialFormData } from "@/lib/formData";
import { getResumePath } from "@/lib/formResume";

const STORAGE_KEY = "notaryFormData";

export default function FormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const formData = raw ? (JSON.parse(raw) as typeof initialFormData) : initialFormData;
      const path = getResumePath(formData);
      const search = searchParams.toString();
      const fullPath = search ? `${path}?${search}` : path;
      router.replace(fullPath);
    } catch {
      const search = searchParams.toString();
      router.replace(search ? `/form/personal-info?${search}` : "/form/personal-info");
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] px-4">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#491ae9] border-t-transparent" />
    </div>
  );
}
