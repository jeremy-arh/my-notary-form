"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  { key: "{{subject}}", desc: "Objet de l'email" },
  { key: "{{content}}", desc: "Contenu du message (obligatoire)" },
  { key: "{{first_name}}", desc: "Prénom du client" },
  { key: "{{last_name}}", desc: "Nom du client" },
  { key: "{{email}}", desc: "Email du client" },
  { key: "{{form_link}}", desc: "Lien formulaire" },
  { key: "{{company_name}}", desc: "Nom de l'entreprise" },
];

export default function GeneralTemplateEditor() {
  const [template, setTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.settings?.general_email_template) {
            setTemplate(json.settings.general_email_template);
          }
        }
      } catch { /* use default */ }
      setLoaded(true);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "general_email_template", value: template }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Template général sauvegardé");
    } catch {
      toast.error("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTemplate(DEFAULT_EMAIL_TEMPLATE);
  };

  const preview = useMemo(() => {
    return template
      .replaceAll("{{subject}}", "Exemple d'objet")
      .replaceAll("{{content}}", '<p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#444;">Bonjour Jean,</p><p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#444;">Ceci est un aperçu du template général utilisé pour les messages personnalisés.</p>')
      .replaceAll("{{first_name}}", "Jean")
      .replaceAll("{{last_name}}", "Dupont")
      .replaceAll("{{email}}", "jean@example.com")
      .replaceAll("{{form_link}}", "https://app.mynotary.io/form")
      .replaceAll("{{company_name}}", "My Notary");
  }, [template]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template email général</CardTitle>
          <CardDescription>
            Ce template est utilisé pour les messages personnalisés envoyés depuis les fiches clients et soumissions.
            La variable <code className="px-1 py-0.5 rounded bg-muted text-xs">{"{{content}}"}</code> est obligatoire — c&apos;est là que le message rédigé sera injecté.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VARIABLES.map((v) => (
              <Badge key={v.key} variant="outline" className="text-[10px]">
                {v.key} — {v.desc}
              </Badge>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Template HTML</Label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[300px] resize-y"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Réinitialiser par défaut
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <iframe
              srcDoc={preview}
              className="w-full border-0"
              style={{ minHeight: 450 }}
              sandbox="allow-same-origin"
              title="Aperçu template"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
