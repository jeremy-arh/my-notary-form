/**
 * Save submission via API Next.js - uniquement côté server.
 * Le client appelle /api/save-submission qui fait l'INSERT/UPDATE.
 */

import type { FormData } from "./formData";

const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("formSessionId");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("formSessionId", sessionId);
  }
  return sessionId;
};

export type SaveResult = {
  id?: string;
  autoLoginAccessToken?: string;
  autoLoginRefreshToken?: string;
} | null;

export async function saveSubmission(
  formData: FormData,
  currentStep: number,
  completedSteps: number[],
  totalAmount: number | null,
  options?: { createAccount?: boolean }
): Promise<SaveResult> {
  try {
    const sessionId = getSessionId();
    const res = await fetch("/api/save-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formData,
        currentStep,
        completedSteps,
        totalAmount,
        sessionId,
        createAccount: options?.createAccount ?? false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error ?? "Failed to save submission";
      if (typeof window !== "undefined") {
        import("sonner").then(({ toast }) => toast.error(msg));
      }
      throw new Error(msg);
    }

    return {
      id: data.id,
      autoLoginAccessToken: data.autoLoginAccessToken,
      autoLoginRefreshToken: data.autoLoginRefreshToken,
    };
  } catch (err) {
    console.error("[saveSubmission]", err);
    return null;
  }
}

export { getSessionId };
