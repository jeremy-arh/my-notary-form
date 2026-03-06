/**
 * Construit le lien formulaire avec submissionId et UTM pour le tracking.
 * Format: /form?submissionId=xxx&utm_source=...&utm_medium=...&utm_campaign=...&utm_content=...
 */
const BASE_URL = process.env.NEXT_PUBLIC_CLIENT_FORM_URL || "https://app.mynotary.io/form";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export interface FormLinkOptions {
  submissionId: string;
  channel: "email" | "sms";
  templateKey: string;
  sequenceName?: string;
}

export function buildFormLink(options: FormLinkOptions): string {
  const { submissionId, channel, templateKey, sequenceName } = options;

  const url = new URL(BASE_URL);
  url.searchParams.set("submissionId", submissionId);
  url.searchParams.set("utm_source", "mynotary");
  url.searchParams.set("utm_medium", channel);
  url.searchParams.set("utm_campaign", templateKey);
  if (sequenceName) {
    url.searchParams.set("utm_content", slugify(sequenceName));
  }

  return url.toString();
}
