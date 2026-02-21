"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body, table, td, p, a { font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 12px !important; }
      .content-cell { padding: 30px 20px !important; }
      .footer-cell { padding: 0 20px 25px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F8F7F5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8F7F5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width:600px;width:100%;background-color:#fff;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:50px 50px 0 50px;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" style="width:130px;height:auto;display:block;">
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding:40px 50px 50px 50px;">
              {{content}}
            </td>
          </tr>
          <tr>
            <td class="footer-cell" style="padding:0 50px 40px 50px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;"><tr><td style="border-top:1px solid #E5E5E5;"></td></tr></table>
              <p style="margin:0 0 10px;font-size:14px;color:#666;line-height:1.6;">Best regards,<br>The My Notary Team</p>
              <p style="margin:0;font-size:12px;color:#666;"><a href="https://mynotary.io" style="color:#000;text-decoration:underline;">mynotary.io</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const VARIABLES = [
  { key: "{{first_name}}", desc: "Prénom" },
  { key: "{{last_name}}", desc: "Nom" },
  { key: "{{email}}", desc: "Email" },
  { key: "{{subject}}", desc: "Objet" },
  { key: "{{content}}", desc: "Contenu" },
  { key: "{{form_link}}", desc: "Lien formulaire" },
  { key: "{{company_name}}", desc: "Entreprise" },
];

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  submissionId?: string | null;
  clientId?: string | null;
  onSuccess?: () => void;
}

export function SendMessageDialog({
  open,
  onOpenChange,
  recipient,
  submissionId,
  clientId,
  onSuccess,
}: SendMessageDialogProps) {
  const [channel, setChannel] = useState<"email" | "sms">(
    recipient.email ? "email" : "sms"
  );
  const [subject, setSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [sending, setSending] = useState(false);
  const [generalTemplate, setGeneralTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [previewHtml, setPreviewHtml] = useState("");

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.settings?.general_email_template) {
          setGeneralTemplate(json.settings.general_email_template);
        }
      }
    } catch {
      /* use default */
    }
  }, []);

  useEffect(() => {
    if (open) fetchTemplate();
  }, [open, fetchTemplate]);

  const getContentVars = useCallback(() => ({
    "{{first_name}}": recipient.name.split(" ")[0] || "Client",
    "{{last_name}}": recipient.name.split(" ").slice(1).join(" ") || "",
    "{{email}}": recipient.email || "",
    "{{form_link}}": "https://app.mynotary.io/form",
    "{{company_name}}": "My Notary",
  }), [recipient]);

  useEffect(() => {
    const contentVars = getContentVars();
    let processedContent = emailContent;
    for (const [k, v] of Object.entries(contentVars)) {
      processedContent = processedContent.replaceAll(k, v);
    }
    const contentHtml = processedContent
      ? `<p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#444;">${processedContent.replace(/\n/g, '</p><p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#444;">')}</p>`
      : "";
    const vars: Record<string, string> = {
      ...contentVars,
      "{{subject}}": subject,
      "{{content}}": contentHtml,
    };
    let html = generalTemplate;
    for (const [k, v] of Object.entries(vars)) {
      html = html.replaceAll(k, v);
    }
    setPreviewHtml(html);
  }, [generalTemplate, subject, emailContent, recipient, getContentVars]);

  const handleSend = async () => {
    setSending(true);
    try {
      const contentVars = getContentVars();
      let processedContent = emailContent;
      for (const [k, v] of Object.entries(contentVars)) {
        processedContent = processedContent.replaceAll(k, v);
      }
      const contentHtml = processedContent
        ? `<p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#444;">${processedContent.replace(/\n/g, '</p><p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#444;">')}</p>`
        : "";
      const vars: Record<string, string> = {
        ...contentVars,
        "{{subject}}": subject,
        "{{content}}": contentHtml,
      };
      let finalHtml = generalTemplate;
      for (const [k, v] of Object.entries(vars)) {
        finalHtml = finalHtml.replaceAll(k, v);
      }

      const smsVars: Record<string, string> = {
        "{{first_name}}": recipient.name.split(" ")[0] || "Client",
        "{{last_name}}": recipient.name.split(" ").slice(1).join(" ") || "",
        "{{form_link}}": "app.mynotary.io/form",
        "{{support_email}}": "support@mynotary.io",
        "{{company_name}}": "My Notary",
      };
      let finalSms = smsBody;
      for (const [k, v] of Object.entries(smsVars)) {
        finalSms = finalSms.replaceAll(k, v);
      }

      const res = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          recipient_email: recipient.email,
          recipient_phone: recipient.phone,
          recipient_name: recipient.name,
          subject,
          html_body: finalHtml,
          sms_body: finalSms,
          submission_id: submissionId || null,
          client_id: clientId || null,
        }),
      });

      if (!res.ok) throw new Error("Erreur d'envoi");

      toast.success(
        channel === "email"
          ? `Email envoyé à ${recipient.email}`
          : `SMS envoyé à ${recipient.phone}`
      );
      onOpenChange(false);
      onSuccess?.();
      setSubject("");
      setEmailContent("");
      setSmsBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const smsChars = smsBody.length;
  const smsSegments = smsChars <= 160 ? 1 : Math.ceil(smsChars / 153);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Envoyer un message à {recipient.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          {recipient.email && (
            <Button
              variant={channel === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setChannel("email")}
            >
              Email
            </Button>
          )}
          {recipient.phone && (
            <Button
              variant={channel === "sms" ? "default" : "outline"}
              size="sm"
              onClick={() => setChannel("sms")}
            >
              SMS
            </Button>
          )}
        </div>

        {channel === "email" ? (
          <Tabs defaultValue="compose" className="mt-2">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="compose">Rédiger</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/30 p-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium shrink-0">À :</span>
                <span>{recipient.email}</span>
              </div>

              <div className="space-y-2">
                <Label>Objet</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet de l'email"
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[200px] resize-y"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder={`Bonjour {{first_name}},\n\nVotre message ici...\n\nCordialement,\nL'équipe My Notary`}
                />
                <p className="text-xs text-muted-foreground">
                  Le texte sera injecté dans le template email général. Les retours à la ligne créent des paragraphes.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.filter((v) => v.key !== "{{content}}" && v.key !== "{{subject}}").map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted text-[10px]"
                    onClick={() => {
                      setEmailContent((prev) => prev + v.key);
                    }}
                  >
                    {v.key} — {v.desc}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="pt-2">
              {!emailContent && !subject ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  Rédigez un message pour voir l&apos;aperçu
                </div>
              ) : (
                <div className="space-y-3">
                  {subject && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Objet
                      </p>
                      <p className="text-sm font-medium">{subject}</p>
                    </div>
                  )}
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                      Aperçu email
                    </div>
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ minHeight: 400 }}
                      sandbox="allow-same-origin"
                      title="Aperçu"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border bg-muted/30 p-2.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium shrink-0">À :</span>
              <span>{recipient.phone}</span>
            </div>

            <div className="space-y-2">
              <Label>Message SMS</Label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px] resize-y"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder={`Bonjour {{first_name}}, votre message ici... — My Notary`}
              />
              <p className="text-xs text-muted-foreground">
                {smsChars} car. — {smsSegments} segment{smsSegments > 1 ? "s" : ""}
                {smsChars > 160 && (
                  <span className="text-amber-600 ml-1">(multi-segment)</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.filter(
                (v) => !["{{content}}", "{{subject}}", "{{email}}"].includes(v.key)
              ).map((v) => (
                <Badge
                  key={v.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted text-[10px]"
                  onClick={() => setSmsBody((prev) => prev + v.key)}
                >
                  {v.key} — {v.desc}
                </Badge>
              ))}
            </div>

            {smsBody && (
              <div className="flex justify-center pt-2">
                <div className="w-[300px] rounded-[2rem] border-4 border-gray-800 bg-white p-1 shadow-lg">
                  <div className="rounded-[1.6rem] bg-gray-50 overflow-hidden">
                    <div className="bg-gray-800 text-white text-center py-2 text-xs font-medium">
                      Messages
                    </div>
                    <div className="p-3 min-h-[100px]">
                      <div className="bg-blue-500 text-white rounded-2xl rounded-tl-sm px-3 py-2 text-xs max-w-[90%] leading-relaxed">
                        {smsBody
                          .replaceAll("{{first_name}}", recipient.name.split(" ")[0] || "Client")
                          .replaceAll("{{last_name}}", recipient.name.split(" ").slice(1).join(" ") || "")
                          .replaceAll("{{form_link}}", "app.mynotary.io/form")
                          .replaceAll("{{company_name}}", "My Notary")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sending ||
              (channel === "email" && (!subject || !emailContent)) ||
              (channel === "sms" && !smsBody)
            }
          >
            {sending
              ? "Envoi..."
              : channel === "email"
              ? "Envoyer l'email"
              : "Envoyer le SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
